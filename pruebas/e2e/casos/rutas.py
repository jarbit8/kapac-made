"""Cada dirección de la página: abre, se ve bien en el tamaño y el idioma, y las viejas redirigen."""
import re

import requests_ligero as http
from base import (ORIGEN, OTRO_PRODUCTO, PRODUCTO, auditar, prueba)

PAGINAS = ['/', '/shop', PRODUCTO, OTRO_PRODUCTO, '/kapac-made', '/b2b', '/info', '/legal', '/libro-reclamaciones', '/login',
           '/carrito', '/perfil', '/zone']

H1 = {
    '/': ('Kapac Made', 'Kapac Made'),
    '/shop': ('CATÁLOGO', 'CATALOG'),
    '/login': ('Iniciar sesión', 'Sign in'),
    '/carrito': ('Tu carrito', 'Your cart'),
    '/libro-reclamaciones': ('Libro de Reclamaciones', 'Complaints Book'),
    '/legal': ('Información Legal', 'Legal Information'),
    '/info': ('Información', 'Information'),
    '/perfil': ('Mi perfil', 'My profile'),
}


@prueba('cada página abre sin errores, sin desbordes y en el idioma pedido')
def paginas(ctx):
    s = ctx.sesion()
    fallas = []
    for ruta in PAGINAS:
        s.ir(ruta, 600)
        if s.url() != ruta:
            fallas.append(f'{ruta}: terminó en {s.url()}')
            continue
        fallas += auditar(s, ruta)
        lang = s.ev('document.documentElement.lang')
        if lang != ctx.idioma:
            fallas.append(f'{ruta}: <html lang="{lang}"> y se pidió {ctx.idioma}')
        h1 = s.ev("[...document.querySelectorAll('h1')].map(h => h.innerText.trim())")
        if not h1:
            fallas.append(f'{ruta}: no tiene h1')
        esperado = H1.get(ruta)
        if esperado and h1 and h1[0].lower() != esperado[0 if ctx.es else 1].lower():
            fallas.append(f'{ruta}: h1 "{h1[0]}" y se esperaba "{esperado[0 if ctx.es else 1]}"')
    assert not fallas, '\n        '.join(fallas)


@prueba('las direcciones viejas y las desconocidas redirigen', idioma=('es',))
def redirecciones(ctx):
    s = ctx.sesion()
    casos = {
        '/catalogo': '/shop', '/catalogo?q=test': '/shop?q=test', '/alma': '/kapac-made', '/contacto': '/info',
        '/Blog': '/', '/no-existe': '/', '/pedidos': '/login', '/checkout': '/carrito', '/metodo-pago': '/carrito',
    }
    fallas = [f'{origen} -> {s.url()} (se esperaba {destino})' for origen, destino in casos.items()
              if (s.ir(origen, 300), s.url() != destino)[1]]
    assert not fallas, '\n        '.join(fallas)


@prueba('un enlace viejo con # (/#/shop) lleva a la página nueva', idioma=('es',))
def enlace_con_numeral(ctx):
    s = ctx.sesion()
    s.pg.goto(ORIGEN + '/#/shop', wait_until='load')
    s.pg.wait_for_url(re.compile(r'/shop$'))
    assert s.url() == '/shop'


@prueba('el panel de admin y el perfil no abren a un visitante', idioma=('es',))
def sin_permiso(ctx):
    s = ctx.sesion()
    s.ir('/admin', 400)
    assert 'Acceso restringido' in s.main(), s.main()[:120]
    assert s.n('.admin-pestanas') == 0
    s.ir('/perfil', 400)
    assert 'Inicia sesión' in s.main(), s.main()[:120]


@prueba('un pedido que no existe no rompe las pantallas de pago', permitir_errores=('Missing or insufficient permissions',))
def pedido_inexistente(ctx):
    s = ctx.sesion()
    no_existe = ctx.tr('conf.no_encontrado')
    for ruta in ('/confirmacion/xyz', '/pago/tarjeta/xyz', '/pago/yape/xyz', '/pago/efectivo/xyz', '/pago/yape-codigo/xyz'):
        s.ir(ruta, 500)
        assert s.url() == ruta, f'{ruta}: terminó en {s.url()}'
        assert no_existe.rstrip('.').lower() in s.main().lower(), f'{ruta}: {s.main()[:160]}'
        assert s.n('main a, main button') >= 1, f'{ruta}: sin salida para el cliente'
    s.ir('/producto/idfalso', 500)
    assert ctx.tr('producto.no_encontrado').lower() in s.main().lower()


@prueba('sin Firestore la tienda avisa en vez de quedarse cargando', idioma=('es',), permitir_errores=('client is offline',))
def firestore_caido(ctx):
    s = ctx.sesion(firestore='caido')
    s.ir('/', 1200)
    assert s.n('.navbar-burger, .navbar-left') >= 1, 'el inicio no se pintó'
    s.ir('/shop', 1500)
    assert 'No se pudieron cargar los productos' in s.main(), s.main()[:140]
    s.ir(PRODUCTO, 1500)
    assert 'No se pudo cargar el producto' in s.main(), s.main()[:140]


@prueba('la página publicada: solo el inicio se indexa y existen robots y sitemap', tam=('pc',), idioma=('es',))
def indexacion(ctx):
    inicio = http.get(ORIGEN + '/')
    assert re.search(r'<meta name="robots" content="index, follow', inicio), 'el inicio no tiene index'
    for ruta in ('/shop', '/info', '/carrito', '/login', '/legal'):
        html = http.get(ORIGEN + ruta)
        assert 'content="noindex, follow"' in html, f'{ruta} no tiene noindex'
    robots = http.get(ORIGEN + '/robots.txt')
    assert 'Sitemap:' in robots and 'sitemap.xml' in robots
    mapa = http.get(ORIGEN + '/sitemap.xml')
    assert 'www.kapac-made.com' in mapa and '<urlset' in mapa
    desconocida = http.get(ORIGEN + '/producto/kapac-test')
    assert re.search(r'<div id="?root"?>', desconocida), 'la ruta de un producto no devuelve la página'
