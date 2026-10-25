"""Boletín del pie, menú y barra de navegación, idioma, WhatsApp, enlaces externos y la pantalla de entrada."""
import re

from base import ORIGEN, PRODUCTO, prueba, sin_fallas

STUB_OPEN = "window.__abiertas = []; window.open = (...a) => { window.__abiertas.push(a); return null; };"
RESUMEN_PIE = "document.querySelector('.footer-news-wrap').innerText.replace(/\\s+/g, ' ')"


def pie(s):
    return s.ev(RESUMEN_PIE)


def al_pie(s, ruta='/shop'):
    s.ir(ruta, 500)
    s.pg.locator('.footer').scroll_into_view_if_needed()
    s.pg.wait_for_selector('.footer-news-row')


def pedir_codigo(s, correo='ana@ejemplo.com'):
    s.pg.locator('.footer-news-row input').fill(correo)
    s.tocar(s.pg.locator('.footer-news-row button[type=submit]'))


@prueba('boletín: pide un código, lo confirma y queda suscrito')
def boletin_completo(ctx):
    s = ctx.sesion(mocks={'enviarCodigoNewsletter': (200, {'ok': True})})
    al_pie(s)
    sin_fallas(s)
    pedir_codigo(s)
    s.pg.wait_for_selector('.footer-news-hint-mini')
    assert 'ana@ejemplo.com' in s.txt('.footer-news-hint-mini')
    assert s.pg.locator('.footer-news-row input').get_attribute('aria-label') == ctx.tr('news.aria_codigo')
    textos = [b.strip() for b in s.pg.locator('.footer-news-acciones button').all_inner_texts()]
    assert textos[0] == ctx.tr('news.cambiar_correo') and textos[1].startswith(ctx.tr('news.reenviar_en')), textos
    assert s.pg.locator('.footer-news-acciones button').nth(1).is_disabled(), 'se puede reenviar antes de los 60 s'
    s.mocks['verificarCodigoNewsletter'] = (400, {'ok': False, 'mensaje': 'Código incorrecto.'})
    s.pg.locator('.footer-news-row input').fill('123456')
    s.tocar(s.pg.locator('.footer-news-row button[type=submit]'))
    s.pg.wait_for_selector('.footer-news-error-mini')
    assert s.txt('.footer-news-error-mini') == ctx.tr('news.err_codigo'), s.txt('.footer-news-error-mini')
    s.mocks['verificarCodigoNewsletter'] = (200, {'ok': True})
    s.pg.locator('.footer-news-row input').fill('123456')
    s.tocar(s.pg.locator('.footer-news-row button[type=submit]'))
    s.pg.wait_for_selector('.footer-news-ok-mini')
    assert s.n('.footer-news-row') == 0
    sin_fallas(s)


@prueba('boletín: el correo mal escrito no se manda y el código vacío tampoco')
def boletin_validaciones(ctx):
    s = ctx.sesion(mocks={'enviarCodigoNewsletter': (200, {'ok': True})})
    al_pie(s)
    s.pg.locator('.footer-news-row input').fill('abc')
    s.tocar(s.pg.locator('.footer-news-row button[type=submit]'))
    s.pg.wait_for_timeout(300)
    assert s.ev("document.querySelector('.footer-news-row input').validity.valid") is False
    assert not s.llamadas, 'mandó un correo inválido al servidor'


@prueba('boletín: quien ya estaba suscrito pasa directo al mensaje final')
def boletin_ya_suscrito(ctx):
    s = ctx.sesion(mocks={'enviarCodigoNewsletter': (200, {'ok': True, 'yaExistia': True})})
    al_pie(s)
    pedir_codigo(s)
    s.pg.wait_for_selector('.footer-news-ok-mini')


@prueba('boletín: los rechazos del servidor y la falta de conexión se muestran', permitir_errores=())
def boletin_errores(ctx):
    s = ctx.sesion(mocks={'enviarCodigoNewsletter': (429, {'ok': False, 'mensaje': 'Ya te enviamos un código. Espera un momento.'})})
    al_pie(s)
    pedir_codigo(s)
    s.pg.wait_for_selector('.footer-news-error-mini')
    esperado = 'Ya te enviamos un código. Espera un momento.' if ctx.es else 'We already sent you a code. Please wait a moment.'
    assert s.txt('.footer-news-error-mini') == esperado, s.txt('.footer-news-error-mini')
    assert s.n('.footer-news-row') == 1, 'el formulario debía quedar para reintentar'
    sin_red = ctx.sesion()
    al_pie(sin_red)
    pedir_codigo(sin_red)
    sin_red.pg.wait_for_selector('.footer-news-error-mini')
    assert sin_red.txt('.footer-news-error-mini') == ctx.tr('news.err_conexion'), sin_red.txt('.footer-news-error-mini')


@prueba('boletín: cambiar correo vuelve al primer paso')
def boletin_cambiar_correo(ctx):
    s = ctx.sesion(mocks={'enviarCodigoNewsletter': (200, {'ok': True})})
    al_pie(s)
    pedir_codigo(s)
    s.pg.wait_for_selector('.footer-news-acciones')
    s.tocar(s.pg.locator('.footer-news-acciones button').first)
    s.pg.wait_for_function("document.querySelector('.footer-news-row input').type === 'email'")


@prueba('boletín: el formulario cabe en la pantalla en los dos pasos', tam=('c390', 'c360'))
def boletin_cabe(ctx):
    s = ctx.sesion(mocks={'enviarCodigoNewsletter': (200, {'ok': True})})
    al_pie(s)
    fila = lambda: s.ev("""() => { const r = document.querySelector('.footer-news-row').getBoundingClientRect(); const b = document.querySelector('.footer-news-row button').getBoundingClientRect();
        return [Math.round(r.left), Math.round(r.right), Math.round(b.right), innerWidth]; }""")
    l, r, b, vw = fila()
    assert l >= 0 and r <= vw and b <= r + 1, f'paso 1: {fila()}'
    pedir_codigo(s)
    s.pg.wait_for_selector('.footer-news-hint-mini')
    l, r, b, vw = fila()
    assert l >= 0 and r <= vw and b <= r + 1, f'paso 2: {fila()}'


@prueba('menú del celular: abre, cambia de idioma sin cerrarse, navega y se cierra de tres maneras', tam=('c390', 'c360'))
def menu_celular(ctx):
    s = ctx.sesion()
    s.ir('/shop', 500)
    assert s.pg.locator('.navbar-burger').is_visible() and not s.pg.locator('.navbar-left .navbar-link').first.is_visible()
    s.tocar(s.pg.locator('.navbar-burger'))
    s.pg.wait_for_selector('.navbar-left.abierto')
    assert s.desborde()[0] <= s.desborde()[1]
    links = [l.strip().lower() for l in s.pg.locator('.navbar-left .navbar-link').all_inner_texts()]
    assert links[:4] == ['shop', 'kapac made', 'b2b', 'info'], links
    otro = 'en' if ctx.es else 'es'
    s.tocar(s.pg.locator('.navbar-lang').nth(1 if ctx.es else 0))
    s.pg.wait_for_function(f"document.documentElement.lang === '{otro}'")
    assert s.n('.navbar-left.abierto') == 1, 'el menú se cerró al cambiar de idioma'
    s.tocar(s.pg.locator('.navbar-lang').nth(0 if ctx.es else 1))
    s.pg.wait_for_function(f"document.documentElement.lang === '{ctx.idioma}'")
    for ruta, texto in (('/kapac-made', 'kapac made'), ('/b2b', 'b2b'), ('/info', 'info'), ('/shop', 'shop')):
        if not s.n('.navbar-left.abierto'):
            s.tocar(s.pg.locator('.navbar-burger'))
        s.tocar(s.pg.locator('.navbar-left .navbar-link').filter(has_text=re.compile(f'^{texto}$', re.I)))
        s.esperar_url(rf'{ruta}$')
        s.pg.wait_for_selector('.navbar-left.abierto', state='detached')
    s.tocar(s.pg.locator('.navbar-burger'))
    s.tocar(s.pg.locator('.navbar-cerrar'))
    s.pg.wait_for_selector('.navbar-left.abierto', state='detached')
    s.tocar(s.pg.locator('.navbar-burger'))
    s.pg.touchscreen.tap(s.w - 8, s.h - 40)
    s.pg.wait_for_selector('.navbar-left.abierto', state='detached')
    s.tocar(s.pg.locator('.logo').first)
    s.esperar_url(r'/$')


@prueba('en la computadora el menú se ve completo y el idioma se mantiene al navegar y al recargar', tam=('pc',))
def menu_pc(ctx):
    s = ctx.sesion()
    s.ir('/', 600)
    assert not s.pg.locator('.navbar-burger').is_visible()
    otro = 'en' if ctx.es else 'es'
    s.tocar(s.pg.locator('.navbar-lang').nth(1 if ctx.es else 0))
    s.pg.wait_for_function(f"document.documentElement.lang === '{otro}'")
    s.tocar(s.pg.locator('.navbar-link').filter(has_text=re.compile('^shop$', re.I)))
    s.esperar_url('/shop')
    assert s.ev('document.documentElement.lang') == otro
    s.pg.reload()
    s.pg.wait_for_selector('.catalogo-page-title, h1')
    assert s.ev('document.documentElement.lang') == otro, 'al recargar volvió al otro idioma'


@prueba('el botón de WhatsApp aparece tras la portada y abre el chat con el mensaje', idioma=('es', 'en'))
def whatsapp(ctx):
    s = ctx.sesion(init_extra=STUB_OPEN)
    s.ir('/', 800)
    assert s.ev("document.querySelector('.wa-float').classList.contains('wa-oculto')"), 'visible sobre la portada'
    s.ev('window.scrollTo({ top: window.innerHeight * 1.2, behavior: "instant" })')
    s.pg.wait_for_function("!document.querySelector('.wa-float').classList.contains('wa-oculto')")
    s.tocar(s.pg.locator('.wa-float'))
    s.pg.wait_for_function('window.__abiertas.length === 1')
    url = s.ev('window.__abiertas[0][0]')
    assert url.startswith('https://wa.me/51997050752?text='), url
    assert s.ev('window.__abiertas[0][2]') == 'noopener,noreferrer'
    s.ir('/shop', 400)
    assert not s.ev("document.querySelector('.wa-float').classList.contains('wa-oculto')"), 'en las demás páginas siempre se ve'


ESPERADOS_EXTERNOS = {
    'https://www.instagram.com/kapac.made/', 'https://wa.me/51997050752',
}


@prueba('los enlaces externos de la tienda son los esperados y abren en otra pestaña', idioma=('es',))
def enlaces_externos(ctx):
    s = ctx.sesion()
    vistos = {}
    for ruta in ('/', '/shop', PRODUCTO, '/kapac-made', '/b2b', '/info', '/legal', '/libro-reclamaciones', '/login', '/carrito'):
        s.ir(ruta, 300)
        for href, destino in s.ev("[...document.querySelectorAll('a[href]')].map(a => [a.getAttribute('href'), a.target])"):
            if re.match(r'^(https?:|mailto:|tel:|//)', href):
                vistos.setdefault(href, set()).add(destino)
    inesperados = sorted(h for h in vistos if not any(h.startswith(e) for e in ESPERADOS_EXTERNOS)
                         and not h.startswith(('mailto:', 'tel:', 'https://www.facebook.com/', 'https://www.tiktok.com/', 'https://wa.me/', 'https://www.instagram.com/')))
    assert not inesperados, f'enlaces externos nuevos que hay que revisar: {inesperados}'
    sin_otra_pestana = [h for h, d in vistos.items() if h.startswith('http') and d != {'_blank'}]
    assert not sin_otra_pestana, f'enlaces externos que no abren en otra pestaña: {sin_otra_pestana}'
    assert 'https://www.instagram.com/kapac.made/' in vistos


@prueba('los enlaces internos no llevan a páginas que no existen', idioma=('es',))
def enlaces_internos(ctx):
    s = ctx.sesion()
    internos = set()
    for ruta in ('/', '/shop', '/kapac-made', '/b2b', '/info', '/legal', '/libro-reclamaciones', '/login', '/carrito'):
        s.ir(ruta, 300)
        internos |= {h for h in s.ev("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))") if h.startswith('/') and not h.startswith('//')}
    conocidos = {'/', '/shop', '/kapac-made', '/b2b', '/info', '/legal', '/libro-reclamaciones', '/login', '/carrito', '/zone', '/admin', '/pedidos', '/perfil'}
    raros = sorted(h for h in internos if h.split('?')[0] not in conocidos and not h.startswith('/producto/'))
    assert not raros, f'enlaces internos a revisar: {raros}'
    for h in sorted(internos):
        s.ir(h, 200)
        assert s.url().split('?')[0] != '/' or h.split('?')[0] == '/', f'{h} terminó en el inicio'


@prueba('la pantalla de entrada sale una vez, se va sola y no vuelve en la segunda visita', tam=('pc', 'c390'), idioma=('es',))
def pantalla_de_entrada(ctx):
    s = ctx.sesion(intro=True)
    s.pg.goto(ORIGEN + '/', wait_until='commit')
    s.pg.wait_for_selector('.splash', timeout=4000)
    s.pg.wait_for_selector('.splash', state='detached', timeout=8000)
    s.pg.wait_for_selector('.navbar-sticky')
    s.ir('/shop', 300)
    s.pg.goto(ORIGEN + '/', wait_until='load')
    s.pg.wait_for_timeout(400)
    assert s.n('.splash') == 0, 'la pantalla de entrada volvió a salir en la segunda visita'


@prueba('el pie tiene el Libro de Reclamaciones, la razón social y el RUC', idioma=('es', 'en'))
def pie_legal(ctx):
    s = ctx.sesion()
    s.ir('/shop', 500)
    texto = s.txt('.footer')
    assert 'QHAPAQ BRANDS S.A.C.S.' in texto and '20613661604' in texto, texto[:300]
    s.tocar(s.pg.locator('.footer-libro'))
    s.esperar_url('/libro-reclamaciones')
