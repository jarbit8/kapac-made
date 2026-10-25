"""De los datos de entrega a la elección del método de pago y el pedido que se crea."""
import json

from base import ANONIMO, CLIENTE, PRECIO, PRODUCTO, prueba, sin_fallas

DATOS_VALIDOS = ['Juan Perez', '987654321', 'Av Siempre Viva 123', 'Cayma']


def llenar(s, valores):
    campos = s.pg.locator('.checkout-form input')
    for i, v in enumerate(valores):
        campos.nth(i).fill(v)


def error(s):
    return s.txt('.checkout-error')


@prueba('el checkout pide que elijas entrega y valida cada campo')
def checkout_validaciones(ctx):
    s = ctx.sesion()
    s.agregar_al_carrito(PRODUCTO, 1)
    s.ir('/checkout', 500)
    assert s.n('.checkout-opcion') == 2
    sin_fallas(s)
    s.tocar(s.pg.locator('.checkout-btn-continuar'))
    s.pg.wait_for_selector('.checkout-error')
    assert error(s) == ctx.t('Por favor selecciona una opción de entrega.', 'Please select a delivery option.'), error(s)
    s.tocar(s.pg.locator('.checkout-opcion').nth(0))
    s.tocar(s.pg.locator('.checkout-btn-continuar'))
    s.pg.wait_for_selector('.checkout-error')
    assert error(s) == ctx.t('Por favor completa todos los campos obligatorios (*).', 'Please fill in all required fields (*).'), error(s)
    casos = [
        ('nombre en blanco', [' ', *DATOS_VALIDOS[1:]], ctx.t('Por favor completa todos los campos obligatorios (*).', 'Please fill in all required fields (*).')),
        ('nombre de una letra', ['1', *DATOS_VALIDOS[1:]], ctx.tr('checkout.err_nombre')),
        ('celular con letras', [DATOS_VALIDOS[0], 'abcdef', *DATOS_VALIDOS[2:]], ctx.tr('checkout.err_telefono')),
        ('celular de 8 dígitos', [DATOS_VALIDOS[0], '98765432', *DATOS_VALIDOS[2:]], ctx.tr('checkout.err_telefono')),
        ('dirección de un punto', [*DATOS_VALIDOS[:2], '.', DATOS_VALIDOS[3]], ctx.tr('checkout.err_direccion')),
        ('distrito de un punto', [*DATOS_VALIDOS[:3], '.'], ctx.tr('checkout.err_distrito')),
    ]
    fallas = []
    for desc, valores, esperado in casos:
        s.ir('/checkout', 300)
        s.tocar(s.pg.locator('.checkout-opcion').nth(0))
        llenar(s, valores)
        s.tocar(s.pg.locator('.checkout-btn-continuar'))
        s.pg.wait_for_timeout(250)
        if '/metodo-pago' in s.url():
            fallas.append(f'{desc}: lo aceptó')
        elif error(s) != esperado:
            fallas.append(f'{desc}: error "{error(s)}" y se esperaba "{esperado}"')
    assert not fallas, '\n        '.join(fallas)


@prueba('el checkout acepta un celular con espacios y lo guarda sin ellos', idioma=('es',))
def checkout_telefono(ctx):
    s = ctx.sesion()
    s.agregar_al_carrito(PRODUCTO, 1)
    s.ir('/checkout', 400)
    s.tocar(s.pg.locator('.checkout-opcion').nth(0))
    llenar(s, [DATOS_VALIDOS[0], '987 654 321', *DATOS_VALIDOS[2:]])
    s.tocar(s.pg.locator('.checkout-btn-continuar'))
    s.esperar_url('/metodo-pago')
    envio = json.loads(s.session('checkout_envio'))
    assert envio['telefono'] == '987654321', envio
    assert envio['tipo'] == 'envio' and envio['distrito'] == 'Cayma'


@prueba('el recojo pide nombre y celular y el pedido queda como Recojo en Arequipa')
def recojo(ctx):
    s = ctx.sesion()
    s.agregar_al_carrito(PRODUCTO, 1)
    s.ir('/checkout', 400)
    s.tocar(s.pg.locator('.checkout-opcion').nth(1))
    assert s.n('.checkout-form input') == 2, 'el recojo no necesita dirección'
    s.tocar(s.pg.locator('.checkout-btn-continuar'))
    s.pg.wait_for_selector('.checkout-error')
    assert error(s) == ctx.t('Por favor completa tu nombre y teléfono.', 'Please enter your name and phone number.'), error(s)
    llenar(s, ['Ana Perez', '+51 987 654 321'])
    s.tocar(s.pg.locator('.checkout-btn-continuar'))
    s.esperar_url('/metodo-pago')
    envio = json.loads(s.session('checkout_envio'))
    assert envio['tipo'] == 'recojo' and envio['telefono'] == '987654321', envio
    assert envio['direccion'] == 'Recojo en Arequipa'


@prueba('al volver desde el método de pago el checkout recuerda lo escrito')
def checkout_recuerda(ctx):
    s = ctx.sesion()
    s.a_metodo_pago(1, recojo=False)
    s.tocar(s.pg.locator('.metodo-btn-volver'))
    s.esperar_url('/checkout')
    s.pg.wait_for_selector('.checkout-form input')
    assert s.ev("[...document.querySelectorAll('.checkout-form input')].map(i => i.value).slice(0, 4)") == ['Ana Perez', '987654321', 'Av Siempre Viva 123', 'Cayma']
    assert s.n('.checkout-opcion.seleccionada') == 1


@prueba('el método de pago muestra el total y exige elegir uno')
def metodo_pago(ctx):
    s = ctx.sesion()
    s.a_metodo_pago(2)
    assert s.txt('.metodo-sub').endswith(f'S/{PRECIO * 2}.00'), s.txt('.metodo-sub')
    assert s.n('.metodo-opcion') == 4
    textos = s.ev("[...document.querySelectorAll('.metodo-opcion')].map(o => o.innerText)")
    for clave, texto in zip(['metodo.yape', 'metodo.yape_codigo', 'metodo.tarjeta', 'metodo.efectivo'], textos):
        assert ctx.tr(clave) in texto, f'{clave}: {texto}'
    sin_fallas(s)
    s.tocar(s.pg.locator('.metodo-btn-confirmar'))
    s.pg.wait_for_selector('.checkout-error')
    assert error(s) == ctx.tr('metodo.seleccionar'), error(s)
    assert '/metodo-pago' in s.url() and not s.pedidos_creados()


@prueba('cada método crea su pedido con los datos del checkout y lleva a su pantalla de pago')
def pedido_por_metodo(ctx):
    rutas = ['/pago/yape/', '/pago/yape-codigo/', '/pago/tarjeta/', '/pago/efectivo/']
    metodos = ['yape', 'yape-codigo', 'tarjeta', 'efectivo']
    for i, (ruta, metodo) in enumerate(zip(rutas, metodos)):
        s = ctx.sesion_pagos()
        s.a_metodo_pago(2, recojo=(i % 2 == 0))
        s.elegir_metodo(i)
        s.esperar_url(ruta)
        assert len(s.pedidos_creados()) == 1, f'{metodo}: {len(s.pedidos_creados())} pedidos'
        p = s.pedidos_creados()[0]['datos']
        assert p['metodoPago'] == metodo and p['estado'] == 'procesando_pago', p
        assert p['total'] == PRECIO * 2
        assert [(it['id'], it['cantidad']) for it in p['items']] == [('kapac-test', 2)]
        assert p['nombre'] == 'Ana Perez' and p['esInvitado'] is True
        assert p['envio']['tipo'] == ('recojo' if i % 2 == 0 else 'envio')
        assert p['email'] == '', 'el invitado no dio correo en el checkout: no puede quedar "null"'
        assert set(p) == {'usuarioId', 'email', 'nombre', 'items', 'total', 'estado', 'metodoPago', 'envio', 'esInvitado', 'fecha'}, sorted(p)
        sin_fallas(s)
        s.cerrar()


@prueba('con doble clic en continuar al pago solo se crea un pedido', idioma=('es',))
def doble_clic(ctx):
    s = ctx.sesion()
    s.a_metodo_pago(1)
    s.tocar(s.pg.locator('.metodo-opcion').nth(0))
    s.pg.locator('.metodo-btn-confirmar').dblclick(delay=30)
    s.esperar_url('/pago/yape/')
    s.pg.wait_for_timeout(500)
    assert len(s.pedidos_creados()) == 1, len(s.pedidos_creados())


@prueba('un cliente con cuenta compra con su correo y su perfil rellena el checkout', idioma=('es',))
def cliente_con_cuenta(ctx):
    perfil = {'usuarios/u-1': {'nombre': 'Ana Quispe', 'telefono': '987654321', 'direccion': 'Calle Mercaderes 123', 'distrito': 'Cercado', 'referencia': 'frente al banco'}}
    s = ctx.sesion(usuario=CLIENTE, datos=perfil)
    s.agregar_al_carrito(PRODUCTO, 1)
    s.ir('/checkout', 1000)
    s.tocar(s.pg.locator('.checkout-opcion').nth(0))
    s.pg.wait_for_timeout(300)
    assert s.ev("[...document.querySelectorAll('.checkout-form input')].map(i => i.value).slice(0, 4)") == ['Ana Quispe', '987654321', 'Calle Mercaderes 123', 'Cercado']
    s.tocar(s.pg.locator('.checkout-btn-continuar'))
    s.esperar_url('/metodo-pago')
    s.elegir_metodo(3)
    s.esperar_url('/pago/efectivo/')
    p = s.pedidos_creados()[0]['datos']
    assert p['email'] == 'ana@ejemplo.com' and p['usuarioId'] == 'u-1' and p['esInvitado'] is False, p


@prueba('un invitado que ya tiene sesión anónima nunca manda el correo "null"', idioma=('es',))
def sesion_anonima(ctx):
    s = ctx.sesion(usuario=ANONIMO)
    s.a_metodo_pago(1)
    s.elegir_metodo(0)
    s.esperar_url('/pago/yape/')
    p = s.pedidos_creados()[0]['datos']
    assert p['email'] == '' and p['usuarioId'] == ANONIMO['uid'], p
    assert 'null' not in json.dumps(p).lower().replace('"fecha"', ''), 'quedó un "null" en el pedido'


@prueba('sin Firestore no se crea el pedido y la página avisa', idioma=('es',), permitir_errores=('client is offline', 'Escritura rechazada'))
def sin_firestore(ctx):
    s = ctx.sesion()
    s.a_metodo_pago(1)
    s.ev("window.__firestore = 'caido'")
    s.elegir_metodo(0)
    s.pg.wait_for_selector('.checkout-error')
    assert error(s) == ctx.tr('metodo.error'), error(s)
    assert '/metodo-pago' in s.url() and not s.pedidos_creados()
    assert not s.pg.locator('.metodo-btn-confirmar').is_disabled(), 'el botón quedó trabado'


@prueba('si la lectura del catálogo se cuelga el pago no espera más de unos segundos', tam=('pc', 'c390'), idioma=('es',))
def lectura_colgada(ctx):
    s = ctx.sesion()
    s.a_metodo_pago(1)
    s.ev("window.__firestore = 'lee_colgado'")
    s.tocar(s.pg.locator('.metodo-opcion').nth(0))
    s.tocar(s.pg.locator('.metodo-btn-confirmar'))
    s.pg.wait_for_url('**/pago/yape/**', timeout=9000)
    assert len(s.pedidos_creados()) == 1


@prueba('si el precio cambia entre el método de pago y confirmar, no se crea el pedido y se avisa', idioma=('es', 'en'))
def precio_cambia_al_confirmar(ctx):
    import datos
    s = ctx.sesion()
    s.a_metodo_pago(1)
    s.pg.wait_for_timeout(3000)  # pasa la lectura automática del carrito; esta prueba es de la que hace el botón
    s.cambiar_catalogo('productos/kapac-test', datos.producto(precio='120'))
    s.elegir_metodo(0)
    s.esperar_url('/carrito')
    assert not s.pedidos_creados(), 'creó el pedido con el precio viejo'
    s.pg.wait_for_selector('.carrito-avisos')
    assert s.n('.carrito-avisos li') == 1
    assert 'S/120.00' in s.txt('.carrito-precio')
    s.tocar(s.pg.locator('.carrito-finalizar'))
    s.esperar_url('/checkout')
