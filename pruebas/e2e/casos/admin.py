"""Panel de administración: tienda abierta/cerrada, pedidos, visitas y reclamos (el panel es solo en español)."""
import re

import datos
from base import ADMIN, CRISTHIAN, CLIENTE, RAIZ, prueba, sin_fallas

import json

TEXTOS = json.loads((RAIZ / 'descripcion' / 'textos-pedidos.json').read_text(encoding='utf-8'))['estados']
ES = ('es',)
TOLERADO = ('button.header-tienda', '"/legal"')  # controles del propio admin: miden 29 y 16 px de alto en celular


def tarjetas(s):
    return s.ev("""[...document.querySelectorAll('.admin-pedido-card')].map(c => ({
        id: c.querySelector('.admin-pedido-id').innerText.trim(), estado: c.querySelector('.admin-pedido-estado').innerText.trim(),
        metodo: c.querySelector('.admin-pedido-metodo').innerText.trim(), envio: (c.querySelector('.admin-pedido-envio') || {innerText: ''}).innerText.trim(),
        opciones: [...c.querySelectorAll('select option')].map(o => o.innerText.trim()), bloqueado: [...c.querySelectorAll('select')].map(x => x.disabled)}))""")


def a_admin(ctx, usuario=ADMIN, **kw):
    s = ctx.sesion(usuario=usuario, idioma='es', **kw)
    s.ir('/admin', 900)
    s.pg.wait_for_selector('.admin-pestanas')
    return s


def pestana(s, nombre):
    s.tocar(s.pg.locator('.admin-pestanas button').filter(has_text=nombre))
    s.pg.wait_for_timeout(500)


@prueba('el admin abre y cierra la tienda con confirmación y queda guardado', idioma=ES)
def tienda_abierta_cerrada(ctx):
    s = ctx.sesion(usuario=ADMIN, idioma='es')
    s.ir('/shop', 800)
    assert s.txt('.header-tienda') == 'Tienda abierta'
    s.tocar(s.pg.locator('.header-tienda'))
    s.pg.wait_for_function("document.querySelector('.header-tienda').innerText.trim() === 'Tienda cerrada'")
    assert 'CERRAR la tienda' in s.dialogos[-1][1] and s.dialogos[-1][0] == 'confirm', s.dialogos
    assert s.escrituras('contenido')[-1]['datos'] == {'cerrado': True}
    assert s.local('kapac_cerrado_v1') == '1'
    s.tocar(s.pg.locator('.header-tienda'))
    s.pg.wait_for_function("document.querySelector('.header-tienda').innerText.trim() === 'Tienda abierta'")
    assert 'ABRIR la tienda' in s.dialogos[-1][1]
    assert s.escrituras('contenido')[-1]['datos'] == {'cerrado': False} and s.local('kapac_cerrado_v1') == '0'


@prueba('si el admin rechaza el aviso la tienda no cambia', idioma=ES)
def tienda_sin_confirmar(ctx):
    s = ctx.sesion(usuario=ADMIN, idioma='es', dialogos='rechazar')
    s.ir('/shop', 800)
    s.tocar(s.pg.locator('.header-tienda'))
    s.pg.wait_for_timeout(500)
    assert s.txt('.header-tienda') == 'Tienda abierta' and not s.escrituras('contenido')


@prueba('el visitante no ve el botón de la tienda ni el menú de admin', idioma=ES)
def visitante_sin_botones(ctx):
    s = ctx.sesion(usuario=CLIENTE, idioma='es')
    s.ir('/shop', 800)
    assert s.n('.header-tienda') == 0 and s.n('.navbar-admin') == 0 and s.n('.navbar-modo') == 0


@prueba('el panel muestra los pedidos pendientes con su estado, método y entrega', idioma=ES)
def pedidos(ctx):
    s = a_admin(ctx)
    texto = s.main()
    assert re.search(r'6\s*PEDIDOS PENDIENTES', texto) and '1 pago por verificar' in texto, texto[:300]
    assert [b.strip() for b in s.pg.locator('.admin-filtro-btn').all_inner_texts()] == ['Pendientes (6)', 'Completados (1)', 'Cancelados (1)']
    c = tarjetas(s)
    assert [x['id'] for x in c] == [f'#{k.split("/")[1][:8]}' for k in list(datos.PEDIDOS)[:6]], [x['id'] for x in c]
    assert [x['estado'] for x in c] == ['Verificando pago', 'Esperando pago', 'Pagado', 'Pagado', 'Enviando', 'Listo para recoger']
    assert [x['metodo'] for x in c] == ['Yape (QR)', 'PagoEfectivo', 'Tarjeta', 'Yape (código de aprobación)', 'Tarjeta', 'PagoEfectivo']
    assert c[0]['envio'].startswith('Envío a domicilio: Calle Mercaderes 123') and c[1]['envio'].startswith('Recojo en Arequipa')
    assert 'Ana Quispe' in s.main() and 'Luis Mamani' in s.main(), 'faltan los nombres de los clientes'
    sin_fallas(s, tolerar=TOLERADO)


@prueba('las opciones del estado dependen del método de pago y de la entrega, y solo avanzan', idioma=ES)
def opciones_de_estado(ctx):
    s = a_admin(ctx)
    c = tarjetas(s)
    assert c[0]['opciones'] == ['Verificando pago', 'Pagado', 'Enviando', 'Entregado', 'Cancelado']
    assert c[1]['opciones'] == ['Esperando pago', 'Pagado', 'Listo para recoger', 'Entregado', 'Cancelado']
    assert c[2]['opciones'] == ['Pagado', 'Enviando', 'Entregado', 'Cancelado']
    assert c[3]['opciones'] == ['Pagado', 'Listo para recoger', 'Entregado', 'Cancelado']
    assert c[5]['opciones'] == ['Listo para recoger', 'Entregado', 'Cancelado']


@prueba('cambiar el estado pide confirmación, avisa al cliente y lo guarda', idioma=ES)
def cambiar_estado(ctx):
    s = a_admin(ctx)
    s.pg.locator('.admin-pedido-card').first.locator('select').select_option(index=1)
    s.pg.wait_for_selector('.admin-msg')
    tipo, mensaje = s.dialogos[-1]
    assert tipo == 'confirm' and '#A1QRYAPE' in mensaje and '«Pagado»' in mensaje and 'correo' in mensaje, s.dialogos
    assert s.txt('.admin-msg') == 'Pedido #A1QRYAPE actualizado: Pagado'
    assert s.escrituras('pedidos')[-1] == {'tipo': 'update', 'ruta': 'pedidos/A1QRYAPE0AAA', 'datos': {'estado': 'pendiente_envio'}}
    assert tarjetas(s)[0]['estado'] == 'Pagado'


@prueba('si el admin rechaza el aviso el pedido no cambia', idioma=ES)
def cambiar_estado_rechazado(ctx):
    s = a_admin(ctx, dialogos='rechazar')
    s.pg.locator('.admin-pedido-card').first.locator('select').select_option(index=2)
    s.pg.wait_for_timeout(500)
    assert not s.escrituras('pedidos')
    assert tarjetas(s)[0]['estado'] == 'Verificando pago'


@prueba('los filtros separan completados y cancelados, y lo cancelado ya no se puede cambiar', idioma=ES)
def filtros(ctx):
    s = a_admin(ctx)
    s.tocar(s.pg.locator('.admin-filtro-btn').filter(has_text='Completados'))
    c = tarjetas(s)
    assert [x['estado'] for x in c] == ['Entregado'] and c[0]['bloqueado'] == [False]
    s.tocar(s.pg.locator('.admin-filtro-btn').filter(has_text='Cancelados'))
    c = tarjetas(s)
    assert [x['estado'] for x in c] == ['Cancelado'] and c[0]['bloqueado'] == [True], c
    sin_fallas(s, tolerar=TOLERADO)


@prueba('un nombre y una referencia larguísimos no tapan la etiqueta de estado', idioma=ES, tam=('pc', 'c360'))
def nombre_largo(ctx):
    largo = {**datos.PEDIDOS['pedidos/A1QRYAPE0AAA'], 'email': 'rosa.maria.quispe.mamani.condori@correo-muy-largo.example.com',
             'envio': {**datos.ENVIO_DOMICILIO, 'nombre': 'Rosa María Quispe Mamani Condori de los Ríos Valdivia',
                       'referencia': 'frente al banco, portón verde, tocar el timbre dos veces'}}
    s = a_admin(ctx, datos={'pedidos/A1QRYAPE0AAA': largo})
    d = s.ev("""() => { const c = document.querySelector('.admin-pedido-card'); const top = c.querySelector('.admin-pedido-top');
        const t = top.children[0].getBoundingClientRect(); const b = top.children[1].getBoundingClientRect();
        return { solapa: t.right > b.left + 1, sw: document.documentElement.scrollWidth, vw: innerWidth }; }""")
    assert not d['solapa'] and d['sw'] <= d['vw'], d
    sin_fallas(s, tolerar=TOLERADO)


@prueba('Visitas: cuenta sesiones, no cuenta al dueño y nombra a Cristhian', idioma=ES)
def visitas(ctx):
    s = a_admin(ctx)
    pestana(s, 'Visitas')
    s.pg.wait_for_selector('text=Actividad reciente')
    t = s.main()
    for esperado in ('5 HOY', '7 ÚLTIMOS 30 DÍAS', '6 VISITANTES ÚNICOS', '2 IDENTIFICADOS', '3 PAÍSES DISTINTOS'):
        assert esperado in t, f'falta "{esperado}" en: {t[:500]}'
    assert 'Cristhian · cristhiandccapa@gmail.com' in t
    assert 'jarb2299' not in t, 'las visitas del dueño no deben contarse ni listarse'
    assert 'Vio: Inicio → Tienda → Detalle de producto → Carrito' in t, t[:900]
    assert 'ana@ejemplo.com' in t
    sin_fallas(s, tolerar=TOLERADO)


@prueba('Reclamos: muestra los plazos en días hábiles y separa pendientes y respondidos', idioma=ES)
def reclamos(ctx):
    s = a_admin(ctx)
    pestana(s, 'Reclamos')
    plazos = [p.strip() for p in s.pg.locator('.admin-reclamo-plazo').all_inner_texts()]
    assert plazos[0].startswith('Quedan') and 'días hábiles' in plazos[0], plazos
    assert plazos[1].startswith('Vencido hace') and 'días hábiles' in plazos[1], plazos
    assert [b.strip() for b in s.pg.locator('.admin-filtro-btn').all_inner_texts()] [:2] == ['Pendientes (2)', 'Respondidos (1)']
    s.tocar(s.pg.locator('.admin-filtro-btn').filter(has_text='Respondidos'))
    assert 'Hola Luis, tienes razón' in s.main() or s.n('.admin-pedido-card') == 1
    sin_fallas(s, tolerar=TOLERADO)


@prueba('Reclamos: responder pide texto, confirma y guarda solo respuesta, fecha y estado', idioma=ES)
def responder_reclamo(ctx):
    s = a_admin(ctx)
    pestana(s, 'Reclamos')
    s.tocar(s.pg.locator('.admin-pedido-card').first.locator('button.admin-filtro-btn'))
    s.pg.wait_for_selector('.admin-reclamo-responder textarea')
    sin_fallas(s, tolerar=TOLERADO)
    s.tocar(s.pg.locator('.admin-reclamo-enviar'))
    s.pg.wait_for_selector('.admin-msg')
    assert not s.escrituras('reclamos'), 'respondió con la caja vacía'
    s.pg.locator('.admin-reclamo-responder textarea').fill('Hola Ana, lamentamos lo ocurrido. Te cambiamos la mochila sin costo.')
    s.tocar(s.pg.locator('.admin-reclamo-enviar'))
    s.pg.wait_for_function("[...document.querySelectorAll('.admin-filtro-btn')].some(b => b.innerText.includes('Pendientes (1)'))")
    ultimo = s.escrituras('reclamos')[-1]
    assert ultimo['ruta'] == 'reclamos/000002-2026' and ultimo['tipo'] == 'update', ultimo
    assert set(ultimo['datos']) == {'respuesta', 'fechaRespuesta', 'estado'} and ultimo['datos']['estado'] == 'respondido', ultimo
    assert s.dialogos and s.dialogos[-1][0] == 'confirm'
    s.tocar(s.pg.locator('.admin-filtro-btn').filter(has_text='Respondidos'))
    assert s.n('.admin-pedido-card') == 2


@prueba('Cristhian también entra al panel', idioma=ES, tam=('pc',))
def cristhian(ctx):
    s = a_admin(ctx, usuario=CRISTHIAN)
    assert s.n('.admin-pestanas') == 1 and 'Panel admin' in s.main()
