"""Las pantallas de pago: Yape con QR, PagoEfectivo, tarjeta y Yape con código (Culqi, simulado)."""
import json
import re
import time

from base import CIP, CLIENTE, PRECIO, PRODUCTO, prueba, sin_fallas

TOTAL = PRECIO * 2


def a_pago(s, metodo, veces=2):
    """Deja la sesión en la pantalla de pago de ese método (0 Yape QR, 1 Yape código, 2 tarjeta, 3 PagoEfectivo)."""
    s.a_metodo_pago(veces)
    s.elegir_metodo(metodo)
    s.esperar_url('/pago/')
    s.pg.wait_for_selector('.pago-volver')
    return s.url().split('/')[-1]


def pagar_con_culqi(s, token='tkn_test_1', correo=None):
    s.tocar(s.pg.locator('.tarjeta-btn-pagar'))
    s.pg.wait_for_function('window.__culqiAbierto >= 1')
    s.ev("([t, c]) => { window.Culqi.token = c ? { id: t, email: c } : { id: t }; window.Culqi.error = null; window.culqi(); }", [token, correo])


def cierres_de_culqi(s):
    return s.ev('window.__culqiCerrado || 0')


@prueba('Yape con QR: muestra el monto y los pasos, y "Ya realicé el pago" pasa el pedido a verificar')
def yape_qr(ctx):
    s = ctx.sesion()
    pedido = a_pago(s, 0)
    assert s.txt('.pago-monto strong') == f'S/{TOTAL}.00', s.txt('.pago-monto strong')
    assert s.n('.pago-qr') == 1 and s.n('.pago-paso') == 4
    assert s.txt('.pago-qr-nombre') == 'QHAPAQ BRANDS'
    assert s.ev("""() => { const qr = document.querySelector('.pago-qr').getBoundingClientRect(), n = document.querySelector('.pago-qr-nombre').getBoundingClientRect();
        return n.top >= qr.bottom - 1 && n.top - qr.bottom < 60 && Math.abs((n.left + n.right) / 2 - (qr.left + qr.right) / 2) < 6; }"""), 'el nombre no está centrado bajo el QR'
    sin_fallas(s)
    boton = s.pg.locator('.pago-btn-pague')
    s.tocar(boton)
    s.esperar_url('/confirmacion/')
    assert s.url().endswith(pedido)
    cambios = [e['datos'] for e in s.escrituras('pedidos', 'update')]
    assert cambios == [{'estado': 'verificando_pago'}], cambios
    assert s.carrito() == [], 'el carrito debía vaciarse al crear el pedido'
    assert ctx.tr('conf.recibido') in s.txt('.confirmacion-header h1') or s.txt('.confirmacion-header h1')


@prueba('PagoEfectivo: genera el código, lo copia y "Ya tengo mi código" lleva a la confirmación con el CIP')
def pago_efectivo(ctx):
    s = ctx.sesion_pagos()
    s.ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
    pedido = a_pago(s, 3)
    s.pg.wait_for_selector('.codigo-cip-numero')
    assert s.txt('.codigo-cip-numero') == CIP
    llamada = [json.loads(c[2]) for c in s.llamadas if 'crearOrdenCulqi' in c[1]]
    assert llamada == [{'amount': TOTAL * 100, 'pedidoId': pedido, 'email': '', 'nombre': 'Ana Perez'}], llamada
    assert re.search(r'26|27', s.txt('.codigo-cip-vence')), s.txt('.codigo-cip-vence')
    assert s.pg.locator('a.pago-btn-secundario').get_attribute('href') == 'https://pagoefectivo.pe/como-pagar'
    s.tocar(s.pg.locator('.codigo-cip-copiar'))
    s.pg.wait_for_function("document.querySelector('.codigo-cip-copiar').innerText.trim() === " + json.dumps(ctx.tr('pago.ef.copiado')))
    assert s.ev('navigator.clipboard.readText()') == CIP
    sin_fallas(s)
    s.tocar(s.pg.locator('.pago-btn-pague'))
    s.esperar_url('/confirmacion/')
    s.pg.wait_for_selector('.conf-cip')
    assert CIP in s.txt('.conf-cip'), s.txt('.conf-cip')
    assert [e['datos'] for e in s.escrituras('pedidos', 'update')] == [{'estado': 'verificando_pago'}]
    s.ir(f'/confirmacion/{pedido}', 500)
    assert CIP in s.main(), 'al recargar la confirmación el CIP debe seguir visible'


@prueba('PagoEfectivo: si el servidor no genera el código se dice por qué y no queda botón de confirmar', idioma=('es', 'en'))
def pago_efectivo_rechazado(ctx):
    s = ctx.sesion_pagos(orden=(400, {'ok': False, 'mensaje': 'PagoEfectivo requiere una compra mínima de S/ 6.00. Elige otro método de pago.'}))
    a_pago(s, 3)
    s.pg.wait_for_selector('.codigo-cip-error')
    esperado = 'PagoEfectivo requiere una compra mínima de S/ 6.00. Elige otro método de pago.' if ctx.es else 'PagoEfectivo requires a minimum purchase of S/ 6.00. Choose another payment method.'
    assert esperado in s.txt('.codigo-cip-error'), s.txt('.codigo-cip-error')
    assert ctx.tr('pago.ef.error_falla') in s.txt('.codigo-cip-error')
    assert s.n('.codigo-cip-numero') == 0 and s.n('.pago-btn-pague') == 0


@prueba('PagoEfectivo: un mensaje desconocido del servidor sale genérico en inglés', idioma=('en',))
def pago_efectivo_mensaje_raro(ctx):
    s = ctx.sesion_pagos(orden=(400, {'ok': False, 'mensaje': 'Mensaje que nadie tradujo'}))
    a_pago(s, 3)
    s.pg.wait_for_selector('.codigo-cip-error')
    assert ctx.tr('pago.err_codigo') in s.txt('.codigo-cip-error'), s.txt('.codigo-cip-error')


@prueba('PagoEfectivo sin conexión al servidor avisa del error de conexión', permitir_errores=('Failed to fetch',))
def pago_efectivo_sin_red(ctx):
    s = ctx.sesion()
    a_pago(s, 3)
    s.pg.wait_for_selector('.codigo-cip-error')
    assert ctx.tr('pago.err_conexion') in s.txt('.codigo-cip-error'), s.txt('.codigo-cip-error')


@prueba('tarjeta: Culqi se abre solo con tarjeta y por el monto del pedido; con el token se cobra y se confirma')
def tarjeta(ctx):
    s = ctx.sesion_pagos(usuario=CLIENTE)
    pedido = a_pago(s, 2)
    assert s.txt('.tarjeta-monto strong') == f'S/{TOTAL}.00', s.txt('.tarjeta-monto strong')
    sin_fallas(s)
    pagar_con_culqi(s)
    config, opciones = s.ev('[window.__culqiConfig, window.__culqiOpciones]')
    assert config == {'title': 'Kapac Made', 'currency': 'PEN', 'description': f'Pedido #{pedido[:8]}', 'amount': TOTAL * 100}, config
    assert opciones['paymentMethods'] == {'tarjeta': True, 'yape': False, 'bancaMovil': False, 'agente': False, 'billetera': False, 'cuotealo': False}, opciones
    assert opciones['lang'] == ctx.idioma
    s.esperar_url('/confirmacion/')
    llamada = [json.loads(c[2]) for c in s.llamadas if 'cobrarculqi' in c[1]]
    assert llamada == [{'token': 'tkn_test_1', 'amount': TOTAL * 100, 'pedidoId': pedido, 'email': 'ana@ejemplo.com'}], llamada
    s.pg.wait_for_selector('.confirmacion-header h1')
    assert ctx.tr('conf.canal_email') in s.main()
    assert s.txt('.recibo-estado') != ''


@prueba('tarjeta: el cobro usa el correo que el cliente escribió en Culqi, no el de la sesión', idioma=('es',))
def tarjeta_correo_del_token(ctx):
    for usuario, esperado in ((None, 'otro@correo.com'), (CLIENTE, 'otro@correo.com')):
        s = ctx.sesion_pagos(usuario=usuario) if usuario else ctx.sesion_pagos()
        a_pago(s, 2)
        pagar_con_culqi(s, correo='otro@correo.com')
        s.esperar_url('/confirmacion/')
        llamada = json.loads([c[2] for c in s.llamadas if 'cobrarculqi' in c[1]][0])
        assert llamada['email'] == esperado, llamada
        assert cierres_de_culqi(s) == 0, 'cerró Culqi aunque el cobro salió bien'
        s.cerrar()


@prueba('Yape con código: el cobro también usa el correo del token de Culqi', idioma=('es',))
def yape_correo_del_token(ctx):
    s = ctx.sesion_pagos(usuario=CLIENTE)
    a_pago(s, 1)
    pagar_con_culqi(s, 'tkn_yape_2', correo='comprador@correo.com')
    s.esperar_url('/confirmacion/')
    llamada = json.loads([c[2] for c in s.llamadas if 'cobrarculqi' in c[1]][0])
    assert llamada['email'] == 'comprador@correo.com' and llamada['token'] == 'tkn_yape_2', llamada


@prueba('tarjeta: el invitado sin correo en el token cobra con el correo vacío y no con "null"', idioma=('es',))
def tarjeta_invitado(ctx):
    s = ctx.sesion_pagos()
    a_pago(s, 2)
    pagar_con_culqi(s)
    s.esperar_url('/confirmacion/')
    llamada = json.loads([c[2] for c in s.llamadas if 'cobrarculqi' in c[1]][0])
    assert llamada['email'] == '' and 'null' not in json.dumps(llamada), llamada


@prueba('si el cobro falla se cierra la ventana de Culqi (tarjeta y Yape con código)', idioma=('es', 'en'))
def culqi_se_cierra_si_falla(ctx):
    for metodo in (2, 1):
        s = ctx.sesion_pagos(cobro=(400, {'ok': False, 'mensaje': 'Tarjeta rechazada.'}))
        a_pago(s, metodo)
        pagar_con_culqi(s, correo='otro@correo.com')
        s.pg.wait_for_selector('.tarjeta-error')
        assert cierres_de_culqi(s) == 1, f'método {metodo}: Culqi se cerró {cierres_de_culqi(s)} veces'
        s.cerrar()


@prueba('si el servidor no responde también se cierra la ventana de Culqi', idioma=('es',), permitir_errores=('Failed to fetch',))
def culqi_se_cierra_sin_red(ctx):
    for metodo in (2, 1):
        s = ctx.sesion()
        a_pago(s, metodo)
        pagar_con_culqi(s)
        s.pg.wait_for_selector('.tarjeta-error')
        assert cierres_de_culqi(s) == 1, f'método {metodo}: Culqi se cerró {cierres_de_culqi(s)} veces'
        s.cerrar()


@prueba('tarjeta rechazada: se muestra el motivo, en inglés el mensaje conocido, y el cliente puede reintentar', idioma=('es', 'en'))
def tarjeta_rechazada(ctx):
    s = ctx.sesion_pagos(cobro=(400, {'ok': False, 'mensaje': 'Tarjeta rechazada.'}))
    a_pago(s, 2)
    pagar_con_culqi(s)
    s.pg.wait_for_selector('.tarjeta-error')
    assert ('Tarjeta rechazada.' if ctx.es else 'Card declined.') in s.txt('.tarjeta-error'), s.txt('.tarjeta-error')
    assert '/pago/tarjeta/' in s.url()
    assert not s.pg.locator('.tarjeta-btn-pagar').is_disabled(), 'el botón quedó trabado después del rechazo'


@prueba('tarjeta: si el servidor no responde avisa que se confirme el pago antes de reintentar', idioma=('es', 'en'), permitir_errores=('Failed to fetch',))
def tarjeta_sin_red(ctx):
    s = ctx.sesion()
    a_pago(s, 2)
    pagar_con_culqi(s)
    s.pg.wait_for_selector('.tarjeta-error')
    assert ctx.tr('pago.err_confirmar') in s.txt('.tarjeta-error'), s.txt('.tarjeta-error')


@prueba('tarjeta: un error de Culqi (tarjeta inválida) se muestra y no se cobra', idioma=('es',), permitir_errores=('Culqi error',))
def tarjeta_error_culqi(ctx):
    s = ctx.sesion_pagos()
    a_pago(s, 2)
    s.tocar(s.pg.locator('.tarjeta-btn-pagar'))
    s.pg.wait_for_function('window.__culqiAbierto >= 1')
    s.ev("() => { window.Culqi.token = null; window.Culqi.error = { user_message: 'El número de tarjeta no es válido.' }; window.culqi(); }")
    s.pg.wait_for_selector('.tarjeta-error')
    assert 'El número de tarjeta no es válido.' in s.txt('.tarjeta-error')
    assert not [c for c in s.llamadas if 'cobrarculqi' in c[1]], 'cobró con un error de Culqi'


@prueba('tarjeta: si el formulario de Culqi no carga se avisa y hay un botón para reintentar', idioma=('es', 'en'))
def culqi_no_carga(ctx):
    s = ctx.sesion(culqi='cae')
    a_pago(s, 2)
    s.pg.wait_for_selector('.tarjeta-error')
    assert ctx.tr('pago.culqi_falla') in s.txt('.tarjeta-error'), s.txt('.tarjeta-error')
    assert s.pg.locator('.tarjeta-btn-pagar').filter(has_text=ctx.tr('pago.reintentar')).count() == 1, [b.strip() for b in s.pg.locator('main button').all_inner_texts()]


@prueba('Yape con código: Culqi se abre solo con Yape y se cobra igual que con tarjeta', idioma=('es', 'en'))
def yape_codigo(ctx):
    s = ctx.sesion_pagos()
    pedido = a_pago(s, 1)
    assert s.url().startswith('/pago/yape-codigo/')
    sin_fallas(s)
    pagar_con_culqi(s, 'tkn_yape_1')
    opciones = s.ev('window.__culqiOpciones')
    assert opciones['paymentMethods']['yape'] is True and opciones['paymentMethods']['tarjeta'] is False, opciones
    s.esperar_url('/confirmacion/')
    llamada = json.loads([c[2] for c in s.llamadas if 'cobrarculqi' in c[1]][0])
    assert llamada['token'] == 'tkn_yape_1' and llamada['pedidoId'] == pedido and llamada['amount'] == TOTAL * 100, llamada


@prueba('un pedido ya pagado no se puede volver a pagar y lleva a ver su estado', idioma=('es', 'en'))
def pedido_pagado(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    for ruta in ('/pago/tarjeta/C3TARJET0CCC', '/pago/yape/C3TARJET0CCC', '/pago/efectivo/C3TARJET0CCC'):
        s.ir(ruta, 700)
        assert ctx.tr('pago.pedido_cerrado') in s.main(), f'{ruta}: {s.main()[:140]}'
        assert s.n('.tarjeta-btn-pagar, .pago-btn-pague') == 1
    s.tocar(s.pg.locator('.pago-btn-pague'))
    s.esperar_url('/confirmacion/C3TARJET0CCC')


@prueba('el pedido de otra persona no se puede abrir para pagar', idioma=('es',), permitir_errores=('Missing or insufficient permissions',))
def pedido_ajeno(ctx):
    s = ctx.sesion(usuario={'uid': 'otra-persona', 'email': 'otra@ejemplo.com', 'displayName': 'Otra', 'isAnonymous': False})
    s.ir('/pago/tarjeta/G7SINPAG0GGG', 700)
    assert ctx.tr('pago.pedido_no_encontrado') in s.main(), s.main()[:140]
    assert not s.pg.locator('.tarjeta-btn-pagar').filter(has_text=re.compile(r'Pagar S/')).count()


@prueba('PagoEfectivo con el CIP ya generado: al volver a la pantalla se ve el mismo código', idioma=('es',))
def cip_reabierto(ctx):
    s = ctx.sesion(usuario=CLIENTE, mocks={'crearOrdenCulqi': lambda req: (200, {'ok': True, 'orderId': 'ord_1', 'codigoPago': '123456789', 'expiration': int(time.time()) + 172800, 'qr': '', 'urlPe': ''})})
    s.ir('/pago/efectivo/B2CIPEFE0BBB', 900)
    assert s.txt('.codigo-cip-numero') == '123456789', s.main()[:200]


@prueba('Cambiar método de pago devuelve al método con el carrito, y el pedido viejo ya no se puede pagar', idioma=('es', 'en'))
def cambiar_metodo(ctx):
    for i in range(4):
        s = ctx.sesion_pagos()
        primero = a_pago(s, i)
        s.tocar(s.pg.locator('.pago-volver'))
        s.esperar_url('/metodo-pago')
        s.pg.wait_for_selector('.metodo-opcion')
        assert s.txt('.metodo-sub').endswith(f'S/{TOTAL}.00'), f'método {i}: {s.txt(".metodo-sub")}'
        assert [x['cantidad'] for x in s.carrito()] == [2], f'método {i}: el carrito no volvió'
        otro = 3 if i != 3 else 0
        s.elegir_metodo(otro)
        s.esperar_url('/pago/')
        segundo = s.url().split('/')[-1]
        assert segundo != primero and len(s.pedidos_creados()) == 2, f'método {i}: pedidos {len(s.pedidos_creados())}'
        assert s.pedidos_creados()[1]['datos']['email'] == '' and s.pedidos_creados()[1]['datos']['nombre'] == 'Ana Perez'
        s.pg.go_back()
        s.esperar_url('/metodo-pago')
        s.pg.go_back()
        s.pg.wait_for_selector('.pago-volver')
        assert primero in s.url()
        assert ctx.tr('pago.pedido_cerrado') in s.main(), f'método {i}: el pedido viejo se puede volver a pagar: {s.main()[:160]}'
        s.cerrar()


@prueba('después de confirmar ya no hay nada que restaurar: /metodo-pago y /checkout llevan al carrito', idioma=('es',))
def cerrada_la_compra(ctx):
    s = ctx.sesion()
    a_pago(s, 0, veces=1)
    s.tocar(s.pg.locator('.pago-btn-pague'))
    s.esperar_url('/confirmacion/')
    s.pg.wait_for_timeout(500)
    assert s.session('checkout_respaldo') is None, 'quedó el respaldo del checkout'
    for ruta in ('/metodo-pago', '/checkout'):
        s.ir(ruta, 400)
        assert s.url() == '/carrito', f'{ruta} -> {s.url()}'


@prueba('PagoEfectivo: el "vence" sale en hora de Lima aunque el cliente esté en otra zona horaria', idioma=('es',))
def vence_en_hora_de_lima(ctx):
    s = ctx.sesion_pagos(zona='Europe/Madrid')
    a_pago(s, 3)
    s.pg.wait_for_selector('.codigo-cip-vence')
    en_pago = s.txt('.codigo-cip-vence')
    s.tocar(s.pg.locator('.pago-btn-pague'))
    s.esperar_url('/confirmacion/')
    s.pg.wait_for_selector('.codigo-cip-vence')
    en_confirmacion = s.txt('.codigo-cip-vence')
    hora = lambda t: re.search(r'(\d{1,2}):(\d{2})\s*([ap])', t.replace('.', '').replace(' ', ' ').lower())
    assert hora(en_pago) and hora(en_confirmacion) and hora(en_pago).groups() == hora(en_confirmacion).groups(), f'pago: "{en_pago}" / confirmación: "{en_confirmacion}"'


@prueba('si el precio cambia mientras el cliente está en el método de pago, vuelve al carrito con el aviso', idioma=('es', 'en'))
def aviso_en_metodo_pago(ctx):
    import datos
    s = ctx.sesion()
    s.a_metodo_pago(1)
    s.cambiar_catalogo('productos/kapac-test', datos.producto(precio='120'))
    s.esperar_url('/carrito', timeout=9000)
    s.pg.wait_for_selector('.carrito-avisos')
    assert s.n('.carrito-avisos li') == 1 and 'S/120.00' in s.txt('.carrito-precio')
    assert not s.pedidos_creados()


@prueba('si el stock baja mientras el cliente está en el método de pago, vuelve al carrito con el aviso', idioma=('es',))
def aviso_stock_en_metodo_pago(ctx):
    import datos
    s = ctx.sesion()
    s.a_metodo_pago(2)
    s.cambiar_catalogo('productos/kapac-test', datos.producto(stock='1'))
    s.esperar_url('/carrito', timeout=9000)
    s.pg.wait_for_selector('.carrito-avisos')
    assert not s.pedidos_creados()
