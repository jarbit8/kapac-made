"""Herramientas comunes de las pruebas de punta a punta: la sesión del navegador (con todo lo
externo simulado), la auditoría de cada pantalla y el registro de pruebas."""
import json
import os
import re
import struct
import time
import zlib
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PREFIJO_EN = '[EN] '  # lo que la traducción simulada le pone a los textos de producto
PUERTO = int(os.environ.get('E2E_PUERTO') or 6035)
ORIGEN = f'http://127.0.0.1:{PUERTO}'
RAIZ = Path(os.environ.get('E2E_REPO') or Path(__file__).resolve().parents[2])

PRODUCTO_ID = 'kapac-test'
OTRO_PRODUCTO_ID = 'daypack-ligero'
PRODUCTO = f'/producto/{PRODUCTO_ID}'
OTRO_PRODUCTO = f'/producto/{OTRO_PRODUCTO_ID}'
PRECIO = 90      # S/ del producto de prueba (stock 2)
STOCK = 2

ADMIN = {'uid': 'admin-prueba', 'email': 'jarb2299@gmail.com', 'displayName': 'Jarbit', 'isAnonymous': False}
CRISTHIAN = {'uid': 'cris-prueba', 'email': 'cristhiandccapa@gmail.com', 'displayName': 'Cristhian', 'isAnonymous': False}
CLIENTE = {'uid': 'u-1', 'email': 'ana@ejemplo.com', 'displayName': 'Ana Quispe', 'isAnonymous': False}
ANONIMO = {'uid': 'anon-demo', 'email': None, 'displayName': None, 'isAnonymous': True}

TAMANOS = {
    'pc': dict(w=1440, h=900, cel=False),
    'c390': dict(w=390, h=844, cel=True),
    'c360': dict(w=360, h=740, cel=True),
}

# Mensajes de consola que no son fallas de la página: lo externo está bloqueado a propósito
RUIDO = ('Listen', 'ERR_ABORTED', 'net::ERR_FAILED', 'ERR_BLOCKED', 'ipwho', 'Failed to load resource: the server responded with a status of 4')


def _png(ancho, alto, rgb):
    """PNG liso de un color: sustituye a toda foto externa."""
    fila = b'\x00' + bytes(rgb) * ancho
    crudo = zlib.compress(fila * alto)

    def trozo(tipo, datos):
        c = struct.pack('>I', len(datos)) + tipo + datos
        return c + struct.pack('>I', zlib.crc32(tipo + datos) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + trozo(b'IHDR', struct.pack('>IIBBBBB', ancho, alto, 8, 2, 0, 0, 0)) + trozo(b'IDAT', crudo) + trozo(b'IEND', b'')


FOTO_PNG = _png(240, 320, (196, 188, 176))

# Checkout de Culqi: solo lo que usa la página
CULQI_JS = """
window.Culqi = {
  publicKey: '', token: null, error: null,
  settings: function (c) { window.__culqiConfig = c; },
  options: function (o) { window.__culqiOpciones = o; },
  open: function () { window.__culqiAbierto = (window.__culqiAbierto || 0) + 1; },
  close: function () { window.__culqiCerrado = (window.__culqiCerrado || 0) + 1; },
};
"""

def _leer_traducciones():
    texto = (RAIZ / 'frontend' / 'src' / 'i18n' / 'translations.js').read_text(encoding='utf-8')
    corte = texto.index('  en: {')
    patron = re.compile(r"""^\s*'([\w.]+)'\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,?\s*$""", re.M)
    escapes = {"\\'": "'", '\\"': '"', '\\n': '\n', '\\\\': '\\'}
    salida = {}
    for idioma, trozo in (('es', texto[:corte]), ('en', texto[corte:])):
        salida[idioma] = {}
        for m in patron.finditer(trozo):
            v = m.group(2) if m.group(2) is not None else m.group(3)
            v = re.sub(r'\\u([0-9a-fA-F]{4})', lambda x: chr(int(x.group(1), 16)), v)
            salida[idioma][m.group(1)] = re.sub(r"""\\['"n\\]""", lambda x: escapes[x.group(0)], v)
    return salida


TRADUCCIONES = _leer_traducciones()


def T(clave, idioma='es', **datos):
    """El texto de la página para esa clave (de src/i18n/translations.js), con {marcadores} reemplazados."""
    texto = TRADUCCIONES[idioma][clave]
    for k, v in datos.items():
        texto = texto.replace('{' + k + '}', str(v))
    return texto


IMAGENES = re.compile(r'\.(png|jpe?g|webp|avif|gif|svg|ico)(\?|$)', re.I)


class Sesion:
    """Un navegador de prueba: viewport, idioma, usuario y datos propios. Todo lo que no es la
    página (Firebase, Culqi, Resend, mapas, fotos...) está bloqueado o simulado."""

    def __init__(self, nav, tam='pc', idioma='es', usuario=None, edicion=False, cerrado=False, datos=None,
                 mocks=None, firestore=None, intro=False, dialogos='aceptar', color=None, init_extra='', traduccion='identidad', culqi='ok', zona='America/Lima'):
        d = TAMANOS[tam] if isinstance(tam, str) else tam
        self.tam = tam if isinstance(tam, str) else f'{d["w"]}x{d["h"]}'
        self.cel = d['cel']
        self.w, self.h = d['w'], d['h']
        self.idioma = idioma
        self.usuario = usuario
        self.traduccion = traduccion
        self.culqi = culqi
        self.mocks = dict(mocks or {})
        self.bloqueadas, self.errores, self.fallidas, self.dialogos, self.llamadas = [], [], [], [], []
        self.modo_dialogo = dialogos
        self.ctx = nav.new_context(
            viewport={'width': self.w, 'height': self.h}, device_scale_factor=1,
            is_mobile=self.cel, has_touch=self.cel, locale='es-PE' if idioma == 'es' else 'en-US',
            color_scheme=color or 'light', timezone_id=zona)
        self.ctx.set_default_timeout(15000)
        init = [
            'try {',
            "localStorage.setItem('kapac_no_contar', '1');",
            f"localStorage.setItem('kapac_cerrado_v1', '{1 if cerrado else 0}');",
            f"if (!sessionStorage.getItem('__idioma_fijo')) {{ localStorage.setItem('kapac_idioma', '{idioma}'); sessionStorage.setItem('__idioma_fijo', '1'); }}",
        ]
        if not intro:
            init.append("localStorage.setItem('kapac_intro_v1', String(Date.now()));")
        if usuario:
            init.append(f"if (!localStorage.getItem('__user_fijo')) {{ localStorage.setItem('__user', {json.dumps(json.dumps(usuario))}); localStorage.setItem('__user_fijo', '1'); }}")
            if usuario['email'] in (ADMIN['email'], CRISTHIAN['email']):
                init.append("localStorage.setItem('kapac_sesion_admin', '1');")
        if datos:
            init.append(f'window.__datos = {json.dumps(datos, ensure_ascii=False)};')
        if firestore:
            init.append(f"window.__firestore = '{firestore}';")
        init.append('} catch (e) {}')
        self.ctx.add_init_script('\n'.join(init) + '\n' + init_extra)
        self.ctx.route(lambda url: not url.startswith(ORIGEN), self._ruta)
        self.pg = self.nuevo()

    # ---- red simulada
    def _ruta(self, route):
        req = route.request
        u = req.url
        for clave, respuesta in self.mocks.items():
            if clave in u:
                estado, cuerpo = respuesta(req) if callable(respuesta) else respuesta
                self.llamadas.append((req.method, u[:120], (req.post_data or '')[:400]))
                route.fulfill(status=estado, body=json.dumps(cuerpo), headers={
                    'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'})
                return
        host = urlparse(u).netloc
        if host == 'translate.googleapis.com':
            # traducción automática de los textos de producto: igual (identidad), con "[EN] " delante o caída
            original = parse_qs(urlparse(u).query).get('q', [''])[0]
            if self.traduccion == 'cae':
                route.abort('blockedbyclient')
            else:
                traducido = PREFIJO_EN + original if self.traduccion == 'prefijo' else original
                route.fulfill(status=200, body=json.dumps([[[traducido, original]]]), headers={
                    'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'})
        elif 'checkout.culqi.com/js/v4' in u and self.culqi == 'cae':
            route.abort('blockedbyclient')
        elif 'checkout.culqi.com/js/v4' in u:
            route.fulfill(status=200, body=CULQI_JS, headers={'Content-Type': 'application/javascript'})
        elif req.resource_type == 'image' or IMAGENES.search(urlparse(u).path):
            route.fulfill(status=200, body=FOTO_PNG, headers={'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*'})
        elif host == 'fonts.googleapis.com':
            route.fulfill(status=200, body='', headers={'Content-Type': 'text/css'})
        else:
            self.bloqueadas.append(f'{req.method} {u[:110]}')
            route.abort('blockedbyclient')

    def nuevo(self):
        pg = self.ctx.new_page()
        pg.on('pageerror', lambda e: self.errores.append(('pageerror', pg.url, str(e)[:300])))

        def consola(m):
            if m.type != 'error' or any(r in m.text for r in RUIDO):
                return
            self.errores.append(('console', pg.url, m.text[:300]))
        pg.on('console', consola)

        def fallo(r):
            if r.url.startswith(ORIGEN) and 'ERR_ABORTED' not in (r.failure or ''):
                self.fallidas.append((pg.url, r.url[:140], r.failure or ''))
        pg.on('requestfailed', fallo)

        def resp(r):
            if r.status >= 400 and r.url.startswith(ORIGEN) and r.request.resource_type != 'document':
                self.fallidas.append((pg.url, r.url[:140], f'HTTP {r.status}'))
        pg.on('response', resp)

        def dialogo(d):
            self.dialogos.append((d.type, d.message))
            if self.modo_dialogo == 'rechazar' and d.type == 'confirm':
                d.dismiss()
            else:
                d.accept()
        pg.on('dialog', dialogo)
        return pg

    # ---- navegación y toques
    def ir(self, ruta, espera=700):
        self.pg.goto(ORIGEN + ruta, wait_until='load')
        self.pg.wait_for_function("document.querySelector('#root') && document.querySelector('#root').children.length > 0")
        if espera:
            self.pg.wait_for_timeout(espera)

    def tocar(self, loc, forzar=False):
        loc.scroll_into_view_if_needed()
        (loc.tap(force=forzar) if self.cel else loc.click(force=forzar))

    def url(self):
        return self.pg.url.replace(ORIGEN, '')

    def esperar_url(self, patron, timeout=8000):
        self.pg.wait_for_url(re.compile(patron), timeout=timeout)

    def txt(self, sel, defecto=''):
        try:
            return self.pg.locator(sel).first.inner_text(timeout=1500).strip().replace('\n', ' | ')
        except Exception:
            return defecto

    def n(self, sel):
        return self.pg.locator(sel).count()

    def main(self):
        return self.pg.evaluate("(document.querySelector('main') || document.body).innerText.replace(/\\s+/g, ' ')")

    def cuerpo(self):
        return self.pg.evaluate("document.body.innerText.replace(/\\s+/g, ' ')")

    def ev(self, js, arg=None):
        return self.pg.evaluate(js, arg) if arg is not None else self.pg.evaluate(js)

    def local(self, clave):
        return self.pg.evaluate('(k) => localStorage.getItem(k)', clave)

    def session(self, clave):
        return self.pg.evaluate('(k) => sessionStorage.getItem(k)', clave)

    def carrito(self):
        return json.loads(self.local('kapac_carrito') or '[]')

    def desborde(self):
        return self.pg.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')

    # ---- lo que la página escribió en la base falsa
    def registro(self):
        return json.loads(self.local('__fs') or '{}').get('registro', [])

    def escrituras(self, coleccion=None, tipo=None):
        r = self.registro()
        if coleccion:
            r = [x for x in r if x['ruta'].startswith(coleccion + '/')]
        if tipo:
            r = [x for x in r if x['tipo'] == tipo]
        return r

    def pedidos_creados(self):
        return [x for x in self.escrituras('pedidos') if x['tipo'] == 'add']

    def doc(self, ruta):
        """El documento tal como quedó en la base falsa después de las escrituras (solo lo escrito)."""
        d = json.loads(self.local('__fs') or '{}').get('docs', {})
        return d.get(ruta)

    def cambiar_catalogo(self, ruta, doc):
        """Cambia (o borra, con None) un documento de la base falsa a mitad de la sesión: se ve al abrir la siguiente página."""
        self.pg.evaluate("""([ruta, doc]) => {
          const f = JSON.parse(localStorage.getItem('__fs') || '{}');
          f.docs = f.docs || {};
          f.docs[ruta] = doc;
          localStorage.setItem('__fs', JSON.stringify(f));
        }""", [ruta, doc])

    def servidor_actualiza(self, ruta, **cambios):
        """Hace lo que haría una Cloud Function con el documento (por ejemplo marcar el pedido como pagado)."""
        self.pg.evaluate("""([ruta, cambios]) => {
          const f = JSON.parse(localStorage.getItem('__fs') || '{}');
          f.docs = f.docs || {};
          if (!f.docs[ruta]) throw new Error('no hay ' + ruta + ' en lo escrito por la página');
          f.docs[ruta] = Object.assign({}, f.docs[ruta], cambios);
          localStorage.setItem('__fs', JSON.stringify(f));
        }""", [ruta, cambios])

    def storage(self):
        return json.loads(self.local('__storage') or '[]')

    # ---- flujos repetidos
    def agregar_al_carrito(self, producto=PRODUCTO, veces=1):
        self.ir(producto, 500)
        for _ in range(veces):
            self.tocar(self.pg.locator('.producto-add'))
            self.pg.wait_for_timeout(180)

    def llenar_checkout(self, nombre='Ana Perez', telefono='987654321', direccion='Av Siempre Viva 123', distrito='Cayma'):
        pg = self.pg
        self.ir('/checkout', 400)
        campos = pg.locator('.checkout-form input')
        campos.nth(0).fill(nombre)
        campos.nth(1).fill(telefono)
        campos.nth(2).fill(direccion)
        campos.nth(3).fill(distrito)
        self.tocar(pg.locator('.checkout-btn-continuar'))
        pg.wait_for_url(re.compile('/metodo-pago'))

    def a_metodo_pago(self, veces=1, producto=PRODUCTO):
        self.agregar_al_carrito(producto, veces)
        self.llenar_checkout()

    def elegir_metodo(self, indice):
        """0 Yape QR, 1 Yape código, 2 tarjeta, 3 PagoEfectivo."""
        self.tocar(self.pg.locator('.metodo-opcion').nth(indice))
        self.tocar(self.pg.locator('.metodo-btn-confirmar'))

    def activar_edicion(self):
        pg = self.pg
        if self.cel and not pg.locator('.navbar-left.abierto').count():
            self.tocar(pg.locator('.navbar-burger'))
            pg.wait_for_timeout(250)
        self.tocar(pg.locator('.navbar-modo'))
        pg.wait_for_selector('.barra-edicion')

    def cerrar(self):
        self.ctx.close()


# ─── Auditoría de una pantalla ──────────────────────────────────────────────────────────────

JS_AUDIT = r"""() => {
  const vw = window.innerWidth;
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const desc = e => e.tagName.toLowerCase() + ((typeof e.className === 'string' && e.className.trim()) ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const recortado = e => { for (let p = e.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const ox = getComputedStyle(p).overflowX; if (ox !== 'visible') return true; } return false; };
  const o = {};
  o.sw = document.documentElement.scrollWidth; o.vw = vw;
  o.fuera = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return vis(e) && r.right > vw + 1 && s.position !== 'fixed' && !recortado(e); })
    .slice(0, 6).map(e => desc(e) + ' right=' + Math.round(e.getBoundingClientRect().right) + ' "' + (e.innerText || '').trim().slice(0, 30) + '"');
  o.imgRotas = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src)).map(i => (i.currentSrc || i.src).slice(0, 100));
  o.crudas = (document.body.innerText.match(/\b[a-z_]+\.[a-z_0-9]+(\.[a-z_0-9]+)?\b/g) || [])
    .filter(t => /^(menu|catalogo|producto|carrito|checkout|login|perfil|pedidos|pago|estado|modal|home|footer|b2b|info|alma|zone|contacto|legal|confirmacion|metodo|libro|conf|nav|header|hero|values|life|newsletter|cat|prod|cart|admin|wa)\./.test(t)).slice(0, 6);
  o.cortados = [...document.querySelectorAll('body *')].filter(e => vis(e) && e.scrollWidth > e.clientWidth + 2 &&
    ['hidden', 'clip'].includes(getComputedStyle(e).overflowX) && (e.innerText || '').trim().length > 0 && e.children.length < 4 && !e.closest('.solo-lector') &&
    getComputedStyle(e).textOverflow !== 'ellipsis')
    .slice(0, 6).map(e => desc(e) + ' sw=' + e.scrollWidth + ' cw=' + e.clientWidth + ' "' + (e.innerText || '').trim().slice(0, 40) + '"');
  o.coarse = matchMedia('(pointer: coarse)').matches;
  o.h1 = [...document.querySelectorAll('h1')].map(h => h.innerText.trim().slice(0, 50));
  o.lang = document.documentElement.lang;
  return o;
}"""


MIN_TOQUE = 32  # px: el mínimo que se tolera hoy (algunas áreas miden 34-38 px, ver skill)

JS_TOQUE = r"""(minimo) => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const desc = e => e.tagName.toLowerCase() + ((typeof e.className === 'string' && e.className.trim()) ? '.' + e.className.trim().split(/\s+/)[0] : '');
  const res = [];
  const cand = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=radio], summary')]
    .filter(e => vis(e) && !e.closest('.wa-oculto') && !e.closest('.solo-lector') && !e.disabled);
  for (const e of cand) {
    let r = e.getBoundingClientRect();
    if (r.width >= 44 && r.height >= 44) continue;
    e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
    const ok = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t) || (t.contains(e) && t.tagName === 'LABEL')); };
    let l = 0, rr = 0, u = 0, d = 0;
    while (l < 40 && ok(cx - l - 1, cy)) l++;
    while (rr < 40 && ok(cx + rr + 1, cy)) rr++;
    while (u < 40 && ok(cx, cy - u - 1)) u++;
    while (d < 40 && ok(cx, cy + d + 1)) d++;
    const w = l + rr + 1, h = u + d + 1;
    if (w < minimo || h < minimo) res.push(w + 'x' + h + ' px en ' + desc(e.type === 'radio' || e.type === 'checkbox' ? (e.closest('label') || e.parentElement || e) : e) + ' "' + ((e.innerText || e.getAttribute('aria-label') || e.value || e.placeholder || '').trim().slice(0, 24)) + '"');
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  return [...new Set(res)];
}"""


def auditar(s, nombre=''):
    """Fallas visibles de la pantalla actual. Lista vacía = bien."""
    d = s.pg.evaluate(JS_AUDIT)
    f = []
    if d['sw'] > d['vw'] + 1:
        f.append(f'desborde horizontal: {d["sw"]} > {d["vw"]}')
    f += [f'fuera de pantalla: {x}' for x in d['fuera']]
    f += [f'imagen rota: {x}' for x in d['imgRotas']]
    f += [f'clave de traducción sin traducir: {x}' for x in d['crudas']]
    f += [f'texto cortado: {x}' for x in d['cortados']]
    if d['coarse']:
        f += [f'área de toque de {x}' for x in s.pg.evaluate(JS_TOQUE, MIN_TOQUE)]
    return [f'{nombre}: {x}' if nombre else x for x in f]


def sin_fallas(s, nombre='', tolerar=()):
    """La pantalla actual se ve bien (se mide una vez que dejó de moverse). tolerar: textos de fallas conocidas."""
    s.pg.wait_for_timeout(450)
    f = [x for x in auditar(s, nombre) if not any(t in x for t in tolerar)]
    assert not f, '\n        '.join(f)


CIP = '123456789012'


def servidor_de_pagos(s, cobro=None, orden=None):
    """Las Cloud Functions de pago respondiendo como el servidor cuando todo sale bien: además de
    contestar, dejan el pedido como lo dejarían ellas (código de pago, o pagado con el cargo).
    cobro / orden: (estado, cuerpo) para simular que el servidor rechaza."""
    def pedido_de(req):
        return json.loads(req.post_data or '{}').get('pedidoId', '')

    def crear_orden(req):
        if orden:
            return orden
        vence = int(time.time()) + 2 * 86400
        s.servidor_actualiza(f'pedidos/{pedido_de(req)}', metodoPago='efectivo', culqiOrderId='ord_1', codigoPago=CIP,
                             codigoPagoVence=vence, codigoPagoQR='', codigoPagoUrl='https://pagoefectivo.pe/como-pagar')
        return 200, {'ok': True, 'orderId': 'ord_1', 'codigoPago': CIP, 'expiration': vence, 'qr': '', 'urlPe': 'https://pagoefectivo.pe/como-pagar'}

    def cobrar(req):
        if cobro:
            return cobro
        s.servidor_actualiza(f'pedidos/{pedido_de(req)}', estado='pendiente_envio', culqiChargeId='chr_1')
        return 200, {'ok': True, 'chargeId': 'chr_1'}
    return {'crearOrdenCulqi': crear_orden, 'cobrarculqi': cobrar}


# ─── Registro de pruebas ────────────────────────────────────────────────────────────────────

PRUEBAS = []
TODOS_TAM = ('pc', 'c390', 'c360')
TODOS_IDIOMA = ('es', 'en')


class Prueba:
    def __init__(self, funcion, nombre, tam, idioma, grupo, bug, permitir_errores):
        self.funcion, self.nombre, self.tam, self.idioma, self.grupo = funcion, nombre, tam, idioma, grupo
        self.bug, self.permitir_errores = bug, permitir_errores


def prueba(nombre, tam=TODOS_TAM, idioma=TODOS_IDIOMA, bug=None, permitir_errores=()):
    """Registra una prueba. Corre en cada combinación de tamaño × idioma indicada.
    bug: motivo si la app falla hoy a propósito (la prueba queda marcada como bug conocido y no corta la corrida).
    permitir_errores: textos de errores de consola que esta prueba provoca a propósito."""
    def deco(f):
        PRUEBAS.append(Prueba(f, nombre, tuple(tam), tuple(idioma), f.__module__.split('.')[-1], bug, tuple(permitir_errores)))
        return f
    return deco


class Contexto:
    """Lo que recibe cada prueba: el navegador y la combinación de tamaño e idioma."""

    def __init__(self, nav, tam, idioma):
        self.nav, self.tam, self.idioma = nav, tam, idioma
        self.sesiones = []

    @property
    def es(self):
        return self.idioma == 'es'

    @property
    def cel(self):
        return TAMANOS[self.tam]['cel']

    def sesion_pagos(self, cobro=None, orden=None, **kw):
        """Una sesión cuyas Cloud Functions de pago responden bien (o con el rechazo indicado)."""
        s = self.sesion(**kw)
        s.mocks.update(servidor_de_pagos(s, cobro, orden))
        return s

    def sesion(self, **kw):
        kw.setdefault('idioma', self.idioma)
        s = Sesion(self.nav, self.tam, **kw)
        self.sesiones.append(s)
        return s

    def t(self, es, en):
        return es if self.es else en

    def tr(self, clave, **datos):
        return T(clave, self.idioma, **datos)

    def cerrar(self):
        for s in self.sesiones:
            try:
                s.cerrar()
            except Exception:
                pass


def sin_errores(s, permitidos=()):
    """La página no dejó errores de JavaScript ni de consola."""
    malos = [e for e in s.errores if not any(p in e[2] for p in permitidos)]
    assert not malos, 'errores en la página: ' + '; '.join(f'{e[0]} {e[1].replace(ORIGEN, "")}: {e[2][:160]}' for e in malos[:3])
    assert not s.fallidas, 'recursos de la página que no cargaron: ' + '; '.join(f'{f[1].replace(ORIGEN, "")} ({f[2]})' for f in s.fallidas[:3])


def esperar(cond, timeout=6.0, intervalo=0.1, mensaje='no se cumplió a tiempo'):
    """Espera hasta que cond() sea verdadero (sirve para valores de Python)."""
    fin = time.time() + timeout
    while time.time() < fin:
        try:
            if cond():
                return
        except Exception:
            pass
        time.sleep(intervalo)
    raise AssertionError(mensaje)
