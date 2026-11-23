"""El admin edita el catálogo desde la propia página: precio, borrador, eliminar y crear productos."""
import datos
from base import ADMIN, CLIENTE, PRODUCTO, PRODUCTO_ID, prueba, sin_fallas

ES = ('es',)
TOLERADO = ('"/legal"', 'button.navbar-modo', 'button.barra-edicion-salir', 'button.editable-boton', 'button.pe-',
            'button.catalogo-agregar', '.pe-', '.editable-', '.catalogo-agregar')
P = datos.producto
BORRADORES = {
    'productos/sinfoto': P(nombre='Mochila sin foto', precio='99', stock='4', fotos=[], imagenMochila='', galeria=[], activo=False),
    'productos/completo': P(nombre='Borrador completo', precio='150', stock='4', activo=False),
}


def escrituras_producto(s, tipo=None):
    return s.escrituras('productos', tipo)


def en_ficha(ctx, ruta=PRODUCTO, **kw):
    s = ctx.sesion(usuario=ADMIN, idioma='es', **kw)
    s.ir(ruta, 900)
    s.activar_edicion()
    s.pg.wait_for_selector('h1')
    return s


def abrir_campo(s, selector):
    campo = s.pg.locator(selector).first
    if s.ev("matchMedia('(hover: none)').matches"):
        s.tocar(campo)
    else:
        campo.hover()
    s.tocar(campo.locator('.editable-boton'))
    caja = s.pg.locator('.editable-input, .editable-area').first
    caja.wait_for()
    return caja


@prueba('un visitante y un cliente no ven los controles de edición de la ficha ni de la tienda', idioma=ES)
def sin_controles(ctx):
    for usuario in (None, CLIENTE):
        s = ctx.sesion(usuario=usuario, idioma='es', datos=BORRADORES)
        s.ir(PRODUCTO, 800)
        assert s.n('.pe-eliminar') == 0 and s.n('.pe-estado') == 0 and s.n('.editable-boton') == 0
        s.ir('/shop', 800)
        assert s.n('.catalogo-agregar') == 0 and s.n('.catalogo-borrador') == 0
        sin_fallas(s)


@prueba('el admin cambia el precio: solo escribe el precio, entero, y se ve al instante', idioma=ES)
def cambiar_precio(ctx):
    s = en_ficha(ctx)
    abrir_campo(s, '.producto-precio').fill('120')
    s.tocar(s.pg.locator('.editable-ok'))
    s.pg.wait_for_selector('.editable-edit', state='detached')
    assert 'S/120.00' in s.txt('.producto-precio')
    esc = escrituras_producto(s, 'update')
    assert len(esc) == 1 and esc[0]['ruta'] == f'productos/{PRODUCTO_ID}' and esc[0]['datos'] == {'precio': 120}, esc
    sin_fallas(s, tolerar=TOLERADO)


@prueba('el precio no acepta decimales, negativos, texto ni vacío: avisa y no escribe', idioma=ES)
def precio_invalido(ctx):
    s = en_ficha(ctx)
    caja = abrir_campo(s, '.producto-precio')
    esperado = {'12.5': 'Sin decimales', '-5': 'número válido', '': 'Escribe un número'}
    for valor, aviso in esperado.items():
        caja.fill(valor)
        s.tocar(s.pg.locator('.editable-ok'))
        s.pg.wait_for_selector('.pe-aviso')
        assert aviso in s.txt('.pe-aviso'), (valor, s.txt('.pe-aviso'))
    assert not escrituras_producto(s), 'se escribió un precio inválido'
    assert s.pg.locator('.editable-edit').count() == 1, 'el editor se cerró con un valor inválido'


@prueba('si el guardado del precio falla, el precio vuelve al anterior y se avisa', idioma=ES,
        permitir_errores=('No se pudo guardar el producto', 'Escritura rechazada'))
def precio_con_fallo(ctx):
    s = en_ficha(ctx)
    abrir_campo(s, '.producto-precio').fill('150')
    s.ev('window.__fallarEscrituras = true')
    s.tocar(s.pg.locator('.editable-ok'))
    s.pg.wait_for_function("document.querySelector('.producto-precio').innerText.includes('S/90.00')")
    assert any(d[0] == 'alert' and 'No se pudo guardar' in d[1] for d in s.dialogos), s.dialogos
    assert not escrituras_producto(s, 'update')


@prueba('un precio anterior vacío se guarda como null y quita el tachado', idioma=ES)
def precio_anterior_vacio(ctx):
    s = en_ficha(ctx, '/producto/' + datos.OTRO_PRODUCTO_ID)
    assert s.n('.producto-precio-original') == 1
    abrir_campo(s, '.producto-precio-original').fill('')
    s.tocar(s.pg.locator('.editable-ok'))
    s.pg.wait_for_selector('.editable-edit', state='detached')
    esc = escrituras_producto(s, 'update')
    assert esc and esc[-1]['datos'] == {'precioOriginal': None}, esc


@prueba('mostrar en la tienda un producto sin foto pide nombre, precio y una foto antes', idioma=ES)
def activar_incompleto(ctx):
    s = en_ficha(ctx, '/producto/sinfoto', datos=BORRADORES)
    s.tocar(s.pg.locator('.pe-estado-btn'))
    s.pg.wait_for_timeout(400)
    assert any(d[0] == 'alert' and 'Antes de mostrarlo' in d[1] for d in s.dialogos), s.dialogos
    assert not escrituras_producto(s, 'update'), 'se activó un producto sin foto'


@prueba('el admin ve los borradores en la tienda marcados; el visitante no', idioma=ES)
def borradores_en_tienda(ctx):
    s = ctx.sesion(usuario=ADMIN, idioma='es', datos=BORRADORES)
    s.ir('/shop', 800)
    s.activar_edicion()
    s.pg.wait_for_timeout(500)
    assert s.n('.catalogo-borrador') == 2, s.n('.catalogo-borrador')
    v = ctx.sesion(idioma='es', datos=BORRADORES)
    v.ir('/shop', 800)
    assert v.n('.catalogo-borrador') == 0
    nombres = v.ev("[...document.querySelectorAll('.catalogo-page-name')].map(a => a.innerText.trim())")
    assert 'BORRADOR COMPLETO' not in nombres and 'MOCHILA SIN FOTO' not in nombres, nombres


@prueba('eliminar un producto pide confirmación, lo borra y vuelve a la tienda', idioma=ES)
def eliminar_producto(ctx):
    s = en_ficha(ctx)
    s.tocar(s.pg.locator('.pe-eliminar'))
    s.esperar_url('/shop')
    assert s.dialogos[-1][0] == 'confirm' and 'Eliminar' in s.dialogos[-1][1], s.dialogos
    esc = escrituras_producto(s, 'delete')
    assert [e['ruta'] for e in esc] == [f'productos/{PRODUCTO_ID}'], escrituras_producto(s)
    s.pg.wait_for_timeout(500)
    nombres = s.ev("[...document.querySelectorAll('.catalogo-page-name')].map(a => a.innerText.trim())")
    assert 'KAPAC TEST' not in nombres, nombres


@prueba('si el admin no confirma, el producto no se elimina', idioma=ES)
def eliminar_sin_confirmar(ctx):
    s = en_ficha(ctx, dialogos='rechazar')
    s.tocar(s.pg.locator('.pe-eliminar'))
    s.pg.wait_for_timeout(500)
    assert PRODUCTO_ID in s.url() and not escrituras_producto(s)


@prueba('si Firestore rechaza el borrado el producto sigue y se avisa', idioma=ES,
        permitir_errores=('No se pudo eliminar', 'Escritura rechazada'))
def eliminar_con_fallo(ctx):
    s = en_ficha(ctx)
    s.ev('window.__fallarEscrituras = true')
    s.tocar(s.pg.locator('.pe-eliminar'))
    s.pg.wait_for_timeout(700)
    assert any(d[0] == 'alert' and 'No se pudo eliminar' in d[1] for d in s.dialogos), s.dialogos
    assert PRODUCTO_ID in s.url()


@prueba('agregar producto crea un borrador con stock 0 y abre su ficha', idioma=ES)
def crear_producto(ctx):
    s = ctx.sesion(usuario=ADMIN, idioma='es')
    s.ir('/shop', 800)
    s.activar_edicion()
    s.tocar(s.pg.locator('.catalogo-agregar'))
    s.esperar_url('/producto/')
    nuevos = escrituras_producto(s, 'add')
    assert len(nuevos) == 1, escrituras_producto(s)
    d = nuevos[0]['datos']
    assert d['activo'] is False and d['stock'] == 0 and d['precio'] == 0 and d['nombre'] == '', d
    assert d['fotos'] == [] and d['moneda'] == 'S/'


@prueba('si no se puede crear el producto se avisa y se puede reintentar', idioma=ES,
        permitir_errores=('No se pudo crear', 'Escritura rechazada'))
def crear_con_fallo(ctx):
    s = ctx.sesion(usuario=ADMIN, idioma='es')
    s.ir('/shop', 800)
    s.activar_edicion()
    s.ev('window.__fallarEscrituras = true')
    s.tocar(s.pg.locator('.catalogo-agregar'))
    s.pg.wait_for_timeout(700)
    assert any(d[0] == 'alert' and 'No se pudo guardar' in d[1] for d in s.dialogos), s.dialogos
    assert '/shop' in s.url() and s.pg.locator('.catalogo-agregar').is_enabled()
    s.ev('window.__fallarEscrituras = false')
    s.tocar(s.pg.locator('.catalogo-agregar'))
    s.esperar_url('/producto/')


@prueba('un borrador no se puede comprar aunque se conozca su dirección', idioma=ES)
def borrador_directo(ctx):
    s = ctx.sesion(idioma='es', datos=BORRADORES)
    s.ir('/producto/completo', 900)
    assert s.n('.producto-add') == 0, 'el borrador se puede agregar al carrito'
