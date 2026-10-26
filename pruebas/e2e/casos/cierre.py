"""Tienda cerrada al público: todos ven "Próximamente" menos el admin."""
from base import ADMIN, CLIENTE, CRISTHIAN, PRODUCTO, auditar, prueba, sin_fallas

CERRADA = {'contenido/sitio': {'cerrado': True}}
PAGINAS_TAPADAS = ['/', '/shop', '/carrito', '/libro-reclamaciones', PRODUCTO, '/pedidos', '/admin', '/kapac-made', '/info']


def sesion_cerrada(ctx, **kw):
    return ctx.sesion(cerrado=True, datos=CERRADA, **kw)


@prueba('con la tienda cerrada el visitante solo ve Próximamente en todas las páginas')
def visitante(ctx):
    s = sesion_cerrada(ctx)
    for ruta in PAGINAS_TAPADAS:
        s.ir(ruta, 500)
        assert s.url() == ruta, f'{ruta}: terminó en {s.url()}'
        assert s.n('.cerrado-page') == 1, f'{ruta}: no muestra Próximamente'
        assert s.n('.navbar-sticky') == 0 and s.n('.catalogo-page-card') == 0, f'{ruta}: se asoma la tienda'
        assert 'AREQUIPA' in s.main().upper() and 'INSTAGRAM' in s.main().upper()
    fallas = [x for x in auditar(s) if 'INSTAGRAM' not in x]
    assert not fallas, fallas


@prueba('Próximamente: el enlace de Instagram se toca bien en celular', tam=('c390', 'c360'), idioma=('es',),
        bug='el enlace "INSTAGRAM ↗" de la pantalla Próximamente mide 81x18 px (components/SitioCerrado)')
def instagram_tocable(ctx):
    s = sesion_cerrada(ctx)
    s.ir('/', 600)
    sin_fallas(s)


@prueba('con la tienda cerrada /login sigue abierto para el admin')
def login_abierto(ctx):
    s = sesion_cerrada(ctx)
    s.ir('/login', 500)
    assert s.n('.login-form') == 1 and s.n('.cerrado-page') == 0
    sin_fallas(s)


@prueba('con la tienda cerrada una cuenta de cliente no puede entrar y se le cierra la sesión', permitir_errores=('Error obteniendo carrito remoto',))
def cliente_no_entra(ctx):
    s = sesion_cerrada(ctx)
    s.ir('/login', 500)
    s.pg.locator('input[name=email]').fill('ana@ejemplo.com')
    s.pg.locator('input[name=password]').fill('abc123')
    s.tocar(s.pg.locator('.login-form button[type=submit]'))
    s.pg.wait_for_selector('.login-error')
    assert s.txt('.login-error') == ctx.t('Por ahora solo el administrador puede entrar.', 'For now only the administrator can sign in.')
    s.pg.wait_for_function("localStorage.getItem('__user') === null")
    assert s.url() == '/login'


@prueba('con la tienda cerrada el admin entra y ve la tienda completa', idioma=('es',))
def admin_entra(ctx):
    for usuario in (ADMIN, CRISTHIAN):
        s = sesion_cerrada(ctx, usuario=usuario)
        for ruta in ('/', '/shop', '/carrito', '/admin'):
            s.ir(ruta, 600)
            assert s.n('.cerrado-page') == 0, f'{usuario["email"]} ve Próximamente en {ruta}'
        s.ir('/shop', 500)
        assert s.txt('.header-tienda') == 'Tienda cerrada', s.txt('.header-tienda')
        s.cerrar()


@prueba('con la tienda cerrada un cliente con sesión abierta también ve Próximamente', idioma=('es',))
def cliente_con_sesion(ctx):
    s = sesion_cerrada(ctx, usuario=CLIENTE)
    s.ir('/shop', 600)
    assert s.n('.cerrado-page') == 1


@prueba('con la tienda abierta el visitante ve la tienda y no Próximamente', idioma=('es',))
def abierta(ctx):
    s = ctx.sesion()
    for ruta in ('/', '/shop', '/libro-reclamaciones'):
        s.ir(ruta, 500)
        assert s.n('.cerrado-page') == 0 and s.n('.navbar-sticky') == 1, ruta
