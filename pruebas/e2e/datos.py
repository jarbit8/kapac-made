"""Datos de ejemplo de las pruebas: lo que "hay" en la base falsa al abrir la página.

Las fechas van relativas a la hora en que se abre la página: {'__hace': horas},
{'__seg': segundos desde ahora} y {'__dia': días atrás} (texto AAAA-MM-DD).
"""
import json

FOTO = 'https://firebasestorage.googleapis.com/v0/b/kapac-made.firebasestorage.app/o/productos%2F{}.webp?alt=media&token=t'


def foto(nombre):
    return FOTO.format(nombre)


def hace(horas):
    return {'__hace': horas}


def producto(**cambios):
    base = {
        'nombre': 'Kapac Test', 'nombreEn': '', 'precio': '90', 'precioOriginal': None, 'moneda': 'S/', 'stock': '2',
        'categoria': 'Climbing', 'activo': True,
        'descripcion': 'Mochila de prueba hecha a mano en Arequipa.', 'descripcionEn': '',
        'features': [{'titulo': 'Titulo test 1', 'desc': 'Descripcion test 1'}, {'titulo': 'Titulo test 2', 'desc': 'Descripcion test 2'},
                     {'titulo': 'Titulo test 3', 'desc': 'Descripcion test 3'}],
        'specs': [{'label': 'Capacidad', 'valor': '45 L'}, {'label': 'Peso', 'valor': '1.2 kg'}, {'label': 'Material', 'valor': 'Cordura'}],
        'fotos': [foto('a')], 'imagenMochila': foto('a'), 'galeria': [foto('b'), foto('c')],
        'imagenContexto': '', 'estilos': {},
    }
    base.update(cambios)
    return base


PRODUCTO_ID = 'kapac-test'
OTRO_PRODUCTO_ID = 'daypack-ligero'

ENVIO_DOMICILIO = {'tipo': 'envio', 'nombre': 'Ana Quispe', 'direccion': 'Calle Mercaderes 123', 'distrito': 'Cercado, Arequipa', 'telefono': '987654321'}
ENVIO_RECOJO = {'tipo': 'recojo', 'nombre': 'Luis Mamani', 'telefono': '987654321'}
ITEMS_PEDIDO = [{'id': 'x', 'nombre': 'Mochila Kapac Test', 'precio': 180, 'cantidad': 1}, {'id': 'y', 'nombre': 'Otra mochila', 'precio': 95, 'cantidad': 2}]


def pedido(id_, estado, metodo, envio, email, horas, **extra):
    d = {'items': ITEMS_PEDIDO, 'total': 370, 'usuarioId': 'u-1', 'estado': estado, 'metodoPago': metodo, 'envio': envio,
         'email': email, 'nombre': envio['nombre'], 'fecha': hace(horas)}
    d.update(extra)
    return f'pedidos/{id_}', d


PEDIDOS = dict([
    pedido('A1QRYAPE0AAA', 'verificando_pago', 'yape', ENVIO_DOMICILIO, 'ana@ejemplo.com', 1, canalNotificacion='email'),
    pedido('B2CIPEFE0BBB', 'verificando_pago', 'efectivo', ENVIO_RECOJO, 'luis@ejemplo.com', 2, codigoPago='123456789', codigoPagoVence={'__seg': 172800}),
    pedido('C3TARJET0CCC', 'pendiente_envio', 'tarjeta', ENVIO_DOMICILIO, 'rosa@ejemplo.com', 3, canalNotificacion='email', stockDescontado=True),
    pedido('D4RECOJO0DDD', 'pendiente_envio', 'yape-codigo', ENVIO_RECOJO, 'juan@ejemplo.com', 4, stockDescontado=True),
    pedido('E5ENVIAN0EEE', 'enviado', 'tarjeta', ENVIO_DOMICILIO, 'eva@ejemplo.com', 5, canalNotificacion='email', stockDescontado=True),
    pedido('F6LISTORE0FF', 'enviado', 'efectivo', ENVIO_RECOJO, 'leo@ejemplo.com', 6, stockDescontado=True),
    pedido('G7SINPAG0GGG', 'procesando_pago', 'tarjeta', ENVIO_DOMICILIO, 'noel@ejemplo.com', 7),
    pedido('H8ENTREG0HHH', 'entregado', 'tarjeta', ENVIO_DOMICILIO, 'ivan@ejemplo.com', 70, stockDescontado=True),
    pedido('I9CANCEL0III', 'cancelado', 'yape', ENVIO_RECOJO, 'mia@ejemplo.com', 90),
])


def reclamo(codigo, tipo, estado, nombre, email, dias_recibido, dias_limite, **extra):
    d = {'codigo': codigo, 'tipo': tipo, 'estado': estado, 'nombre': nombre, 'documentoTipo': 'DNI', 'documento': '45678912',
         'domicilio': 'Calle Mercaderes 123, Cercado, Arequipa', 'telefono': '987654321', 'email': email, 'menorDeEdad': False,
         'apoderado': '', 'bienTipo': 'producto', 'bienDescripcion': 'Mochila Kapac Test', 'monto': 180, 'pedidoId': 'K7Q2M9XA',
         'idioma': 'es', 'detalle': 'La costura del tirante se soltó a la semana de uso.', 'pedido': 'Que me cambien la mochila.',
         'fecha': hace(dias_recibido * 24), 'fechaLimite': hace(-dias_limite * 24), 'respuesta': None, 'fechaRespuesta': None}
    d.update(extra)
    return f'reclamos/{codigo}', d


RECLAMOS = dict([
    reclamo('000002-2026', 'reclamo', 'pendiente', 'Ana Quispe Mamani', 'ana@ejemplo.com', 2, 19),
    reclamo('000003-2026', 'queja', 'pendiente', 'Pedro Ramos', 'pedro@ejemplo.com', 18, -2, monto=None, bienTipo='servicio',
            bienDescripcion='Atención', pedidoId='', detalle='Tardaron en responder.', pedido='Nada.'),
    reclamo('000001-2026', 'queja', 'respondido', 'Luis Mamani Ccori', 'luis@ejemplo.com', 9, 12, monto=None, bienTipo='servicio',
            bienDescripcion='Atención por WhatsApp', pedidoId='', detalle='Escribí por WhatsApp y tardaron dos días en responderme.',
            pedido='Que respondan más rápido.', respuesta='Hola Luis, tienes razón. Ya tenemos a una persona dedicada a responder el mismo día.',
            fechaRespuesta=hace(7 * 24)),
])

# (id, horas atrás, correo, ciudad, país, dispositivo, navegador, páginas que vio en orden)
SESIONES = [
    ('s1', 1, None, 'Arequipa', 'Peru', 'Android', 'Chrome', ['home', 'shop', 'producto', 'carrito']),
    ('s2', 15, 'ana@ejemplo.com', 'Lima', 'Peru', 'iPhone', 'Safari', ['shop', 'producto', 'checkout', 'metodo-pago', 'pago', 'confirmacion']),
    ('s3', 2, 'cristhiandccapa@gmail.com', 'Arequipa', 'Peru', 'PC Windows', 'Chrome', ['home', 'kapac-made', 'shop']),
    ('s4', 5, None, 'Cusco', 'Peru', 'Android', 'Chrome', ['producto', 'shop', 'info']),
    ('s5', 9, None, 'Santiago', 'Chile', 'PC Windows', 'Edge', ['home', 'b2b']),
    ('s6', 26, None, 'Madrid', 'Spain', 'iPad', 'Safari', ['proximamente']),
    ('s7', 30, None, 'Arequipa', 'Peru', 'Android', 'Chrome', ['libro-reclamaciones']),
    ('dueno', 3, 'jarb2299@gmail.com', 'Arequipa', 'Peru', 'PC Windows', 'Chrome', ['home', 'admin']),
]


def visitas():
    docs = {}
    for id_, horas, correo, ciudad, pais, dispositivo, navegador, paginas in SESIONES:
        for i, ruta in enumerate(paginas):
            docs[f'visitas/{id_}-{i}'] = {
                'fecha': hace(horas - i * 0.01), 'dia': {'__dia': int(horas // 24)}, 'ruta': ruta, 'sesionId': id_, 'entrada': i == 0,
                'email': correo, 'uid': None, 'pais': pais, 'ciudad': ciudad, 'dispositivo': dispositivo, 'navegador': navegador,
            }
    return docs


def semilla():
    datos = {
        f'productos/{PRODUCTO_ID}': producto(),
        f'productos/{OTRO_PRODUCTO_ID}': producto(nombre='Daypack Ligero', nombreEn='Light Daypack', precio='150', precioOriginal='190',
                                                   stock='10', categoria='Daypack', fotos=[foto('d')], imagenMochila=foto('d')),
        'contenido/sitio': {'cerrado': False},
        'contenido/textos': {},
    }
    datos.update(PEDIDOS)
    datos.update(RECLAMOS)
    datos.update(visitas())
    return datos


def escribir_semilla(destino):
    with open(destino, 'w', encoding='utf-8') as f:
        json.dump(semilla(), f, ensure_ascii=False, indent=1)
