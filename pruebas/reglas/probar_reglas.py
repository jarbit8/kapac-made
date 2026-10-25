"""Prueba firestore.rules y storage.rules del repo con la API de pruebas de Firebase Rules.

No despliega nada ni toca datos: manda el texto de las reglas y los casos a
firebaserules.googleapis.com (projects/kapac-made:test) y compara con lo esperado.
Necesita gcloud con sesión. Sale con 0 si todo salió como se esperaba, 1 si algún caso
falla y 2 si no se pudo consultar la API.
"""
import json
import os
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CA = RAIZ / 'archivo' / 'fotos-originales-productos' / 'ca_todo.pem'
API = 'https://firebaserules.googleapis.com/v1/projects/kapac-made:test'
DOCS = '/databases/(default)/documents'
BUCKET = '/b/kapac-made.firebasestorage.app/o/'

ANON = {'uid': 'u1', 'token': {'firebase': {'sign_in_provider': 'anonymous'}}}
OTRO = {'uid': 'u2', 'token': {'firebase': {'sign_in_provider': 'anonymous'}}}
ADMIN = {'uid': 'adm', 'token': {'email': 'jarb2299@gmail.com', 'email_verified': True}}
ADMIN_SIN_VERIF = {'uid': 'adm2', 'token': {'email': 'jarb2299@gmail.com', 'email_verified': False}}
CRIS = {'uid': 'cris', 'token': {'email': 'cristhiandccapa@gmail.com', 'email_verified': True}}
CRIS_PUNTO = {'uid': 'cris2', 'token': {'email': 'cristhiand.ccapa@gmail.com', 'email_verified': True}}
ADMIN_MAYUS = {'uid': 'adm3', 'token': {'email': 'Jarb2299@Gmail.com', 'email_verified': True}}
CLIENTE = {'uid': 'cli', 'token': {'email': 'ana@ejemplo.com', 'email_verified': True}}

ITEMS = [{'id': 'tBjEBWA3YSrOkgOHaka4', 'nombre': 'Kapac Test', 'precio': 6, 'cantidad': 1}]
NUEVO = {'usuarioId': 'u1', 'email': 'a@b.com', 'nombre': 'Ana', 'items': ITEMS, 'total': 6,
         'estado': 'procesando_pago', 'metodoPago': 'yape', 'envio': None, 'esInvitado': True, 'fecha': 'ahora'}
GUARDADO = dict(NUEVO)
RECLAMO = {'codigo': '000001-2026', 'tipo': 'reclamo', 'nombre': 'Ana', 'email': 'a@b.com', 'detalle': 'la costura',
           'estado': 'pendiente', 'respuesta': None, 'fechaRespuesta': None, 'fecha': 'ahora'}
VISITA = {'fecha': 'ahora', 'dia': '2026-10-22', 'ruta': 'shop', 'sesionId': 'abc123', 'entrada': True,
          'email': None, 'uid': None, 'pais': 'Peru', 'ciudad': 'Arequipa', 'dispositivo': 'PC', 'navegador': 'Chrome'}
MB = 1024 * 1024


def con(base, **cambios):
    d = dict(base)
    for k, v in cambios.items():
        if v is ...:
            d.pop(k, None)
        else:
            d[k] = v
    return d


def caso(nombre, esperado, metodo, ruta, auth=None, nuevo=None, actual=None, bug=None, base=DOCS):
    """bug: motivo si hoy las reglas NO hacen lo esperado (se anota y no cuenta como falla)."""
    req = {'path': base + ruta, 'method': metodo}
    if auth:
        req['auth'] = auth
    if nuevo is not None:
        req['resource'] = {'data': nuevo} if base == DOCS else nuevo
    c = {'expectation': esperado, 'request': req}
    if actual is not None:
        c['resource'] = {'data': actual}
    return {'nombre': nombre, 'caso': c, 'bug': bug}


def foto(tipo='image/webp', size=1000):
    return {'size': size, 'contentType': tipo}


P = '/pedidos/p1'
FIRESTORE = [
    caso('crear pedido normal (invitado)', 'ALLOW', 'create', P, ANON, NUEVO),
    caso('crear pedido con stockDescontado', 'DENY', 'create', P, ANON, con(NUEVO, stockDescontado=True)),
    caso('crear pedido con culqiOrderId', 'DENY', 'create', P, ANON, con(NUEVO, culqiOrderId='ord_x')),
    caso('crear pedido ya pagado', 'DENY', 'create', P, ANON, con(NUEVO, estado='pendiente_envio')),
    caso('crear pedido a nombre de otro', 'DENY', 'create', P, ANON, con(NUEVO, usuarioId='u2')),
    caso('crear pedido sin sesión', 'DENY', 'create', P, None, NUEVO),
    caso('crear pedido con total negativo', 'DENY', 'create', P, ANON, con(NUEVO, total=-1)),
    caso('crear pedido con 51 items', 'DENY', 'create', P, ANON, con(NUEVO, items=ITEMS * 51)),
    caso('leer pedido propio', 'ALLOW', 'get', P, ANON, None, GUARDADO),
    caso('leer pedido ajeno', 'DENY', 'get', P, OTRO, None, GUARDADO),
    caso('admin lee pedido', 'ALLOW', 'get', P, ADMIN, None, GUARDADO),
    caso('dueño: ya pagué (verificando_pago)', 'ALLOW', 'update', P, ANON, con(GUARDADO, estado='verificando_pago'), GUARDADO),
    caso('dueño: cancelar', 'DENY', 'update', P, ANON, con(GUARDADO, estado='cancelado'), GUARDADO),
    caso('dueño: marcar pagado', 'DENY', 'update', P, ANON, con(GUARDADO, estado='pendiente_envio'), GUARDADO),
    caso('dueño: volver de verificando a procesando', 'DENY', 'update', P, ANON,
         con(GUARDADO, estado='procesando_pago'), con(GUARDADO, estado='verificando_pago')),
    caso('dueño: activar aviso por correo', 'ALLOW', 'update', P, ANON, con(GUARDADO, canalNotificacion='email'), GUARDADO),
    caso('dueño: quitar aviso por correo', 'ALLOW', 'update', P, ANON,
         con(GUARDADO, canalNotificacion=None), con(GUARDADO, canalNotificacion='email')),
    caso('dueño: canal raro', 'DENY', 'update', P, ANON, con(GUARDADO, canalNotificacion='sms'), GUARDADO),
    caso('dueño: stockDescontado', 'DENY', 'update', P, ANON, con(GUARDADO, stockDescontado=True), GUARDADO),
    caso('dueño: culqiOrderId', 'DENY', 'update', P, ANON, con(GUARDADO, culqiOrderId='ord_x'), GUARDADO),
    caso('dueño: codigoPago', 'DENY', 'update', P, ANON, con(GUARDADO, codigoPago='123'), GUARDADO),
    caso('dueño: cambiar total', 'DENY', 'update', P, ANON, con(GUARDADO, total=1), GUARDADO),
    caso('dueño: cambiar items', 'DENY', 'update', P, ANON, con(GUARDADO, items=[]), GUARDADO),
    caso('dueño: cambiar correo ya puesto', 'DENY', 'update', P, ANON, con(GUARDADO, email='victima@x.com'), GUARDADO),
    caso('dueño: poner correo si no tenía (null)', 'ALLOW', 'update', P, ANON,
         con(GUARDADO, email='c@d.com', canalNotificacion='email'), con(GUARDADO, email=None)),
    caso('dueño: poner correo si no tenía (vacío)', 'ALLOW', 'update', P, ANON,
         con(GUARDADO, email='c@d.com', canalNotificacion='email'), con(GUARDADO, email='')),
    caso('otro usuario actualiza', 'DENY', 'update', P, OTRO, con(GUARDADO, estado='verificando_pago'), GUARDADO),
    caso('admin cambia estado', 'ALLOW', 'update', P, ADMIN, con(GUARDADO, estado='enviado'), GUARDADO),
    caso('admin sin correo verificado', 'DENY', 'update', P, ADMIN_SIN_VERIF, con(GUARDADO, estado='enviado'), GUARDADO),
    caso('dueño borra', 'DENY', 'delete', P, ANON, None, GUARDADO),
    caso('admin borra', 'ALLOW', 'delete', P, ADMIN, None, GUARDADO),
    caso('visita sin sesión', 'ALLOW', 'create', '/visitas/v1', None, VISITA),
    caso('visita invitado con su uid', 'ALLOW', 'create', '/visitas/v1', ANON, con(VISITA, uid='u1')),
    caso('visita de Cristhian con su sesión', 'ALLOW', 'create', '/visitas/v1', CRIS,
         con(VISITA, email='cristhiandccapa@gmail.com', uid='cris')),
    caso('visita falsa a nombre de Cristhian', 'DENY', 'create', '/visitas/v1', None,
         con(VISITA, email='cristhiandccapa@gmail.com')),
    caso('visita con uid ajeno', 'DENY', 'create', '/visitas/v1', ANON, con(VISITA, uid='u2')),
    caso('visita con campo extra', 'DENY', 'create', '/visitas/v1', None, con(VISITA, basura='x' * 50)),
    caso('visita con ruta enorme', 'DENY', 'create', '/visitas/v1', None, con(VISITA, ruta='x' * 500)),
    caso('leer visitas sin ser admin', 'DENY', 'get', '/visitas/v1', ANON, None, VISITA),
    caso('admin lee visitas', 'ALLOW', 'get', '/visitas/v1', ADMIN, None, VISITA),
    caso('producto: cualquiera lee', 'ALLOW', 'get', '/productos/x', None, None, {'nombre': 'a'}),
    caso('producto: invitado escribe', 'DENY', 'update', '/productos/x', ANON, {'precio': 1}, {'precio': 6}),
    caso('producto: admin escribe', 'ALLOW', 'update', '/productos/x', ADMIN, {'precio': 1}, {'precio': 6}),
    caso('producto: Cristhian escribe', 'ALLOW', 'update', '/productos/x', CRIS, {'precio': 1}, {'precio': 6}),
    caso('producto: correo con mayúsculas escribe', 'ALLOW', 'update', '/productos/x', ADMIN_MAYUS, {'precio': 1}, {'precio': 6}),
    caso('producto: cliente con cuenta escribe', 'DENY', 'update', '/productos/x', CLIENTE, {'precio': 1}, {'precio': 6}),
    caso('producto: variante con punto de Cristhian escribe', 'DENY', 'update', '/productos/x', CRIS_PUNTO, {'precio': 1}, {'precio': 6}),
    caso('contenido: invitado escribe', 'DENY', 'update', '/contenido/sitio', ANON, {'cerrado': False}, {'cerrado': True}),
    caso('contenido: cualquiera lee', 'ALLOW', 'get', '/contenido/sitio', None, None, {'cerrado': True}),
    caso('newsletter: invitado lee', 'DENY', 'get', '/newsletter/x', ANON, None, {'email': 'a'}),
    caso('limites_ip: invitado escribe', 'DENY', 'create', '/limites_ip/1.2.3.4', ANON, {'ultimo': 0}),
    caso('reclamo: cualquiera crea', 'DENY', 'create', '/reclamos/000001-2026', ANON, RECLAMO),
    caso('reclamo: sin sesión crea', 'DENY', 'create', '/reclamos/000001-2026', None, RECLAMO),
    caso('reclamo: invitado lee', 'DENY', 'get', '/reclamos/000001-2026', ANON, None, RECLAMO),
    caso('reclamo: admin lee', 'ALLOW', 'get', '/reclamos/000001-2026', ADMIN, None, RECLAMO),
    caso('reclamo: Cristhian lee', 'ALLOW', 'get', '/reclamos/000001-2026', CRIS, None, RECLAMO),
    caso('reclamo: admin responde', 'ALLOW', 'update', '/reclamos/000001-2026', ADMIN,
         con(RECLAMO, respuesta='Te cambiamos la mochila.', fechaRespuesta='ahora', estado='respondido'), RECLAMO),
    caso('reclamo: admin responde vacío', 'DENY', 'update', '/reclamos/000001-2026', ADMIN,
         con(RECLAMO, respuesta='', fechaRespuesta='ahora', estado='respondido'), RECLAMO),
    caso('reclamo: admin cambia el detalle', 'DENY', 'update', '/reclamos/000001-2026', ADMIN,
         con(RECLAMO, detalle='otro', respuesta='ok', fechaRespuesta='ahora', estado='respondido'), RECLAMO),
    caso('reclamo: admin responde dos veces', 'DENY', 'update', '/reclamos/000001-2026', ADMIN,
         con(RECLAMO, respuesta='otra', estado='respondido'), con(RECLAMO, respuesta='primera', estado='respondido')),
    caso('reclamo: invitado responde', 'DENY', 'update', '/reclamos/000001-2026', ANON,
         con(RECLAMO, respuesta='x', fechaRespuesta='ahora', estado='respondido'), RECLAMO),
    caso('reclamo: admin borra', 'DENY', 'delete', '/reclamos/000001-2026', ADMIN, None, RECLAMO),
    caso('contador: invitado escribe', 'DENY', 'update', '/contadores/reclamos', ANON, {'n': 0}, {'n': 5}),
    caso('colección inventada: invitado lee', 'DENY', 'get', '/secretos/x', ANON, None, {'a': 1}),
    caso('colección inventada: admin escribe', 'DENY', 'update', '/secretos/x', ADMIN, {'a': 2}, {'a': 1}),
]

STORAGE = [
    caso('foto: cualquiera la ve', 'ALLOW', 'get', 'productos/a.webp', base=BUCKET),
    caso('subir imagen: sin sesión', 'DENY', 'create', 'productos/a.webp', None, foto(), base=BUCKET),
    caso('subir imagen: invitado anónimo', 'DENY', 'create', 'productos/a.webp', ANON, foto(), base=BUCKET),
    caso('subir imagen: cliente con cuenta', 'DENY', 'create', 'productos/a.webp', CLIENTE, foto(), base=BUCKET),
    caso('subir imagen: admin', 'ALLOW', 'create', 'productos/a.webp', ADMIN, foto(), base=BUCKET),
    caso('subir imagen: Cristhian', 'ALLOW', 'create', 'productos/a.webp', CRIS, foto(), base=BUCKET),
    caso('subir imagen: correo con mayúsculas', 'ALLOW', 'create', 'productos/a.webp', ADMIN_MAYUS, foto(), base=BUCKET),
    caso('subir imagen: admin sin correo verificado', 'DENY', 'create', 'productos/a.webp', ADMIN_SIN_VERIF, foto(), base=BUCKET),
    caso('subir imagen: variante con punto de Cristhian', 'DENY', 'create', 'productos/a.webp', CRIS_PUNTO, foto(), base=BUCKET),
    caso('subir video: admin', 'ALLOW', 'create', 'home/v.mp4', ADMIN, foto('video/mp4', 20 * MB), base=BUCKET),
    caso('subir PDF: admin', 'DENY', 'create', 'productos/a.pdf', ADMIN, foto('application/pdf'), base=BUCKET),
    caso('subir HTML: admin', 'DENY', 'create', 'productos/a.html', ADMIN, foto('text/html'), base=BUCKET),
    caso('subir ejecutable: admin', 'DENY', 'create', 'productos/a.exe', ADMIN, foto('application/x-msdownload'), base=BUCKET),
    caso('subir imagen de 50 MB: admin', 'DENY', 'create', 'productos/a.png', ADMIN, foto('image/png', 50 * MB), base=BUCKET),
    caso('subir imagen justo bajo 50 MB: admin', 'ALLOW', 'create', 'productos/a.png', ADMIN, foto('image/png', 50 * MB - 1), base=BUCKET),
    caso('reemplazar imagen: admin', 'ALLOW', 'update', 'productos/a.webp', ADMIN, foto(), base=BUCKET),
    caso('reemplazar imagen: invitado', 'DENY', 'update', 'productos/a.webp', ANON, foto(), base=BUCKET),
    caso('borrar: sin sesión', 'DENY', 'delete', 'productos/a.webp', None, base=BUCKET),
    caso('borrar: invitado anónimo', 'DENY', 'delete', 'productos/a.webp', ANON, base=BUCKET),
    caso('borrar: cliente con cuenta', 'DENY', 'delete', 'productos/a.webp', CLIENTE, base=BUCKET),
    caso('borrar: admin', 'ALLOW', 'delete', 'productos/a.webp', ADMIN, base=BUCKET,
         bug='la regla usa request.resource.size y en un borrado no hay request.resource: el admin no puede borrar fotos (borrarMedia lo ignora y quedan huérfanas)'),
]


def token():
    gcloud = shutil.which('gcloud')
    if not gcloud:
        raise SystemExit('No se encontró gcloud en el PATH.')
    entorno = {**os.environ}
    if CA.exists():
        entorno['CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE'] = str(CA)
    r = subprocess.run([gcloud, 'auth', 'print-access-token'], capture_output=True, text=True, env=entorno, shell=(os.name == 'nt'))
    if r.returncode or not r.stdout.strip():
        raise SystemExit('gcloud no dio token (¿sesión cerrada? corre: gcloud auth login)\n' + r.stderr.strip()[:300])
    return r.stdout.strip()


def consultar(archivo, nombre_archivo, casos, tok):
    cuerpo = {'source': {'files': [{'name': nombre_archivo, 'content': (RAIZ / archivo).read_text(encoding='utf8')}]},
              'testSuite': {'testCases': [c['caso'] for c in casos]}}
    req = urllib.request.Request(API, data=json.dumps(cuerpo).encode(), method='POST',
                                 headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json',
                                          'x-goog-user-project': 'kapac-made'})
    contexto = ssl.create_default_context(cafile=str(CA)) if CA.exists() else ssl.create_default_context()
    with urllib.request.urlopen(req, context=contexto, timeout=60) as r:
        return json.loads(r.read().decode('utf8'))


def correr(titulo, archivo, nombre_archivo, casos, tok):
    print(f'\n== {titulo} ({archivo})')
    try:
        r = consultar(archivo, nombre_archivo, casos, tok)
    except urllib.error.HTTPError as e:
        print('La API rechazó la consulta:', e.read().decode('utf8')[:1500])
        return None
    except (urllib.error.URLError, OSError) as e:
        print('No se pudo consultar la API:', e)
        return None
    if r.get('issues'):
        print('PROBLEMAS DE SINTAXIS EN LAS REGLAS:', json.dumps(r['issues'], indent=1, ensure_ascii=False)[:2500])
        return {'mal': len(casos), 'bien': 0, 'conocidos': 0, 'total': len(casos)}
    bien = mal = conocidos = 0
    resultados = r.get('testResults', [])
    if len(resultados) != len(casos):
        print(f'La API devolvió {len(resultados)} resultados para {len(casos)} casos.')
        return None
    for c, res in zip(casos, resultados):
        ok = res.get('state') == 'SUCCESS'
        etiqueta = f"{c['caso']['expectation']:5} {c['nombre']}"
        if ok and c['bug']:
            print(f'OK   {etiqueta}  <- ya está arreglado, quita la marca "bug" de este caso')
            bien += 1
        elif ok:
            print(f'OK   {etiqueta}')
            bien += 1
        elif c['bug']:
            print(f'BUG  {etiqueta}  -> {c["bug"]}')
            conocidos += 1
        else:
            print(f'MAL  {etiqueta}  -> {res.get("debugMessages") or res}')
            mal += 1
    print(f'{bien}/{len(casos)} casos como se esperaba' + (f', {conocidos} bug conocido' if conocidos else '') + (f', {mal} MAL' if mal else ''))
    return {'mal': mal, 'bien': bien, 'conocidos': conocidos, 'total': len(casos)}


def main():
    tok = token()
    resultados = [
        correr('Firestore', 'firestore.rules', 'firestore.rules', FIRESTORE, tok),
        correr('Storage', 'storage.rules', 'storage.rules', STORAGE, tok),
    ]
    if any(r is None for r in resultados):
        print('\nNo se pudo probar todo.')
        return 2
    total = sum(r['total'] for r in resultados)
    bien = sum(r['bien'] for r in resultados)
    mal = sum(r['mal'] for r in resultados)
    conocidos = sum(r['conocidos'] for r in resultados)
    print(f'\nTOTAL: {bien}/{total} como se esperaba, {conocidos} bug conocido, {mal} MAL')
    return 1 if mal else 0


if __name__ == '__main__':
    sys.exit(main())
