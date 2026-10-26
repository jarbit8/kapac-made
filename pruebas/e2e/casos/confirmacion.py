"""Confirmación del pedido y Mis pedidos: los textos de cada estado salen de descripcion/textos-pedidos.json."""
import json
import re

import datos
from base import ANONIMO, CLIENTE, RAIZ, esperar, prueba, sin_fallas

TEXTOS = json.loads((RAIZ / 'descripcion' / 'textos-pedidos.json').read_text(encoding='utf-8'))['estados']


def caso(estado, metodo, envio):
    """Lo que el JSON dice para ese estado, método y entrega."""
    casos = TEXTOS[estado]
    recojo = (envio or {}).get('tipo') != 'envio'
    return casos.get('pagoefectivo' if metodo == 'efectivo' else 'yape_qr') or casos.get('recojo' if recojo else 'domicilio') or casos['todos']


def cip(s):
    return s.n('.conf-cip') == 1


@prueba('cada estado del pedido muestra su título, su texto y su nombre del archivo de textos')
def estados(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    fallas = []
    for ruta, d in datos.PEDIDOS.items():
        id_ = ruta.split('/')[1]
        s.ir(f'/confirmacion/{id_}', 450)
        c = caso(d['estado'], d['metodoPago'], d['envio'])
        sufijo = '' if ctx.es else '_en'
        for etiqueta, sel, esperado in (('título', '.confirmacion-header h1', c['pagina_titulo' + sufijo]),
                                        ('texto', '.confirmacion-sub', c['pagina_texto' + sufijo]),
                                        ('estado', '.recibo-estado', c['nombre' + sufijo])):
            visto = s.txt(sel)
            if visto != esperado:
                fallas.append(f'{id_} ({d["estado"]}/{d["metodoPago"]}) {etiqueta}: "{visto}" y el archivo dice "{esperado}"')
    assert not fallas, '\n        '.join(fallas)


@prueba('la confirmación muestra el resumen del pedido y se ve bien', idioma=('es', 'en'))
def resumen(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    s.ir('/confirmacion/A1QRYAPE0AAA', 600)
    texto = s.main()
    assert '#A1QRYAPE' in texto and 'S/370.00' in texto, texto[:300]
    assert 'Mochila Kapac Test' in texto and 'x2' in texto
    assert s.n('.recibo-item') == 2
    sin_fallas(s)


@prueba('PagoEfectivo pendiente: la confirmación muestra el CIP, hasta cuándo en hora de Lima y cómo pagar')
def cip_pendiente(ctx):
    vence = '{"__seg": 172800}'
    s = ctx.sesion(usuario=CLIENTE, datos={'pedidos/B2CIPEFE0BBB': {**datos.PEDIDOS['pedidos/B2CIPEFE0BBB'], 'codigoPagoUrl': 'https://pagoefectivo.pe/como-pagar'}})
    s.ir('/confirmacion/B2CIPEFE0BBB', 700)
    assert cip(s)
    assert s.txt('.codigo-cip-numero') == '123456789'
    assert ctx.tr('conf.cip_vence') in s.txt('.codigo-cip-vence'), s.txt('.codigo-cip-vence')
    assert s.pg.locator('.conf-cip a').get_attribute('href') == 'https://pagoefectivo.pe/como-pagar'
    s.tocar(s.pg.locator('.codigo-cip-copiar'))
    sin_fallas(s)


@prueba('PagoEfectivo con el código vencido avisa que venció', idioma=('es', 'en'))
def cip_vencido(ctx):
    viejo = {**datos.PEDIDOS['pedidos/B2CIPEFE0BBB'], 'codigoPagoVence': {'__seg': -3600}}
    s = ctx.sesion(usuario=CLIENTE, datos={'pedidos/B2CIPEFE0BBB': viejo})
    s.ir('/confirmacion/B2CIPEFE0BBB', 700)
    assert cip(s)
    assert ctx.tr('conf.cip_vencio') in s.txt('.codigo-cip-vence'), s.txt('.codigo-cip-vence')
    assert ctx.tr('conf.cip_vence') not in s.txt('.codigo-cip-vence')


@prueba('el CIP no sale en pedidos que ya se pagaron ni en otros métodos', idioma=('es',))
def sin_cip(ctx):
    s = ctx.sesion(usuario=CLIENTE, datos={
        'pedidos/C3TARJET0CCC': {**datos.PEDIDOS['pedidos/C3TARJET0CCC'], 'codigoPago': '999', 'metodoPago': 'efectivo'},
        'pedidos/A1QRYAPE0AAA': {**datos.PEDIDOS['pedidos/A1QRYAPE0AAA'], 'codigoPago': '999'},
    })
    for id_ in ('C3TARJET0CCC', 'A1QRYAPE0AAA', 'H8ENTREG0HHH'):
        s.ir(f'/confirmacion/{id_}', 500)
        assert not cip(s), f'{id_} muestra un CIP'


@prueba('avisos por correo: el pedido con correo los activa y desactiva', idioma=('es', 'en'))
def aviso_con_correo(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    s.ir('/confirmacion/B2CIPEFE0BBB', 600)
    boton = s.pg.locator('.canal-opcion')
    assert 'luis@ejemplo.com' in boton.inner_text()
    s.tocar(boton)
    s.tocar(s.pg.locator('.canal-btn-confirmar'))
    s.pg.wait_for_selector('.canal-guardado')
    assert 'luis@ejemplo.com' in s.txt('.canal-guardado') and ctx.tr('conf.aviso_ok') in s.txt('.canal-guardado')
    assert [e['datos'] for e in s.escrituras('pedidos', 'update')] == [{'canalNotificacion': 'email'}]
    s.tocar(boton)
    s.pg.wait_for_selector('.canal-guardado', state='detached')
    esperar(lambda: [e['datos'] for e in s.escrituras('pedidos', 'update')][-1] == {'canalNotificacion': None}, mensaje='no guardó que se quitó el aviso')


@prueba('Mis pedidos lista los pedidos del cliente del más nuevo al más viejo con el nombre de cada estado')
def mis_pedidos(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    s.ir('/pedidos', 900)
    tarjetas = s.ev("[...document.querySelectorAll('.pedido-card')].map(c => [c.querySelector('.pedido-id').innerText.trim(), c.querySelector('.pedido-estado').innerText.trim()])")
    esperado = []
    for ruta, d in datos.PEDIDOS.items():
        id_ = ruta.split('/')[1]
        if d['estado'] == 'procesando_pago':
            continue  # el pago que no se completó no se muestra
        sufijo = '' if ctx.es else '_en'
        esperado.append([f'{ctx.tr("pedidos.pedido")} #{id_[:8]}', caso(d['estado'], d['metodoPago'], d['envio'])['nombre' + sufijo]])
    assert tarjetas == esperado, f'{tarjetas}\n        {esperado}'
    sin_fallas(s)


@prueba('Mis pedidos muestra el CIP pendiente y hasta cuándo, en hora de Lima', idioma=('es',))
def mis_pedidos_cip(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    s.ir('/pedidos', 900)
    textos = s.ev("[...document.querySelectorAll('.pedido-cip')].map(c => c.innerText.trim())")
    assert len(textos) == 1 and '123456789' in textos[0] and re.search(r'\d{1,2}:\d{2}\s*[ap]\. m\.', textos[0]), textos


@prueba('PagoEfectivo con el código generado se ve en Mis pedidos aunque el pedido siga sin pagar', idioma=('es',))
def mis_pedidos_cip_sin_confirmar(ctx):
    sin_confirmar = {**datos.PEDIDOS['pedidos/B2CIPEFE0BBB'], 'estado': 'procesando_pago'}
    s = ctx.sesion(usuario=CLIENTE, datos={'pedidos/B2CIPEFE0BBB': sin_confirmar})
    s.ir('/pedidos', 900)
    assert any('#B2CIPEFE' in t for t in s.ev("[...document.querySelectorAll('.pedido-id')].map(c => c.innerText)"))
    assert not any('#G7SINPAG' in t for t in s.ev("[...document.querySelectorAll('.pedido-id')].map(c => c.innerText)")), 'un pago a medias sin CIP no debe salir'


@prueba('Mis pedidos sin pedidos invita a ver la tienda', idioma=('es', 'en'))
def mis_pedidos_vacio(ctx):
    s = ctx.sesion(usuario={'uid': 'sin-pedidos', 'email': 'nuevo@ejemplo.com', 'displayName': 'Nuevo', 'isAnonymous': False})
    s.ir('/pedidos', 800)
    assert ctx.tr('pedidos.vacio') in s.main(), s.main()[:120]
    s.tocar(s.pg.locator('main button').filter(has_text=ctx.tr('pedidos.ver_tienda')))
    s.esperar_url('/shop')


@prueba('una sesión de invitado sin compras ve la lista vacía y no se rompe', idioma=('es',))
def pedidos_de_invitado(ctx):
    s = ctx.sesion(usuario=ANONIMO)
    s.ir('/pedidos', 800)
    assert ctx.tr('pedidos.vacio') in s.main(), s.main()[:120]
