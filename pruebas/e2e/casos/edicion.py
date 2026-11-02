"""Modo edición del admin: se edita en español, se guarda en los dos idiomas y un fallo no pierde lo escrito."""
from base import ADMIN, prueba, sin_fallas

ES = ('es',)
TOLERADO = ('"/legal"', 'button.navbar-modo', 'button.barra-edicion-salir')  # controles del propio admin


def en_info(ctx):
    s = ctx.sesion(usuario=ADMIN, idioma='es')
    s.ir('/info', 900)
    s.activar_edicion()
    return s


def abrir_titulo(s):
    titulo = s.pg.locator('h1.info-titulo')
    if s.ev("matchMedia('(hover: none)').matches"):
        s.tocar(titulo)
    else:
        titulo.hover()
    s.tocar(titulo.locator('.editable-boton'))
    caja = s.pg.locator('.editable-input, .editable-area').first
    caja.wait_for()
    return caja


@prueba('un texto editado se guarda en español e inglés y se ve al instante', idioma=ES)
def editar_texto(ctx):
    s = en_info(ctx)
    assert s.n('.barra-edicion') == 1
    abrir_titulo(s).fill('Título nuevo')
    s.tocar(s.pg.locator('.editable-ok'))
    s.pg.wait_for_selector('.editable-edit', state='detached')
    assert 'Título nuevo' in s.pg.locator('h1.info-titulo').inner_text()
    guardado = str(s.escrituras('contenido'))
    assert 'info_titulo__es' in guardado and 'info_titulo__en' in guardado, guardado[:400]
    sin_fallas(s, tolerar=TOLERADO)


@prueba('si el guardado falla el editor sigue abierto con lo escrito y se puede reintentar', idioma=ES,
        permitir_errores=('Escritura rechazada',))
def guardado_fallido(ctx):
    s = en_info(ctx)
    abrir_titulo(s).fill('Título nuevo')
    s.ev('window.__fallarEscrituras = true')
    s.tocar(s.pg.locator('.editable-ok'))
    s.pg.wait_for_timeout(500)
    assert s.pg.locator('.editable-input, .editable-area').first.input_value() == 'Título nuevo'
    s.ev('window.__fallarEscrituras = false')
    s.tocar(s.pg.locator('.editable-ok'))
    s.pg.wait_for_selector('.editable-edit', state='detached')
    assert 'Título nuevo' in s.pg.locator('h1.info-titulo').inner_text()


@prueba('cancelar deja el texto como estaba y no escribe nada', idioma=ES)
def cancelar(ctx):
    s = en_info(ctx)
    antes = s.pg.locator('h1.info-titulo').inner_text()
    abrir_titulo(s).fill('Esto no se guarda')
    s.tocar(s.pg.locator('.editable-cancel'))
    s.pg.wait_for_selector('.editable-edit', state='detached')
    assert s.pg.locator('h1.info-titulo').inner_text() == antes
    assert 'info_titulo' not in str(s.escrituras('contenido'))


@prueba('Info: quitar un campo fijo lo guarda en infoOcultos y se puede volver a mostrar', idioma=ES)
def quitar_campo(ctx):
    s = en_info(ctx)
    s.tocar(s.pg.locator('.info-bloque-quitar').first)
    s.pg.wait_for_timeout(400)
    assert s.doc('contenido/sitio')['infoOcultos'], 'no se guardó el campo quitado'
    s.tocar(s.pg.locator('button.info-agregar-campo', has_text='ostrar').first)
    s.pg.wait_for_timeout(400)
    assert s.doc('contenido/sitio')['infoOcultos'] == []
