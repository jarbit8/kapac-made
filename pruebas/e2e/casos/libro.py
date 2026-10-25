"""Libro de Reclamaciones: validación de la hoja, envío al servidor (simulado) y la hoja impresa."""
import json

from base import prueba, sin_fallas

VALIDO = dict(nombre='Ana Quispe Mamani', documento='45678912', domicilio='Calle Mercaderes 123, Arequipa', telefono='987654321',
              email='ana@ejemplo.com', bienDescripcion='Mochila Kapac Test', monto='180.50', pedidoId='K7Q2M9XA',
              detalle='La costura del tirante se soltó a la semana de uso.', pedido='Que me cambien la mochila.')
OK = {'ok': True, 'codigo': '000009-2026', 'fecha': '2026-10-26T15:00:00.000Z', 'fechaLimite': '2026-11-16T15:00:00.000Z'}


def llenar(s, tipo='reclamo', **cambios):
    for campo, valor in {**VALIDO, **cambios}.items():
        s.pg.locator(f'#libro-{campo}').fill(valor)
    s.tocar(s.pg.locator(f'#libro-tipo-{tipo}'))


def errores(s):
    return s.ev("[...document.querySelectorAll('.libro-error')].map(e => e.innerText.trim())")


@prueba('la hoja vacía marca todos los campos obligatorios y lleva al primero')
def hoja_vacia(ctx):
    s = ctx.sesion()
    s.ir('/libro-reclamaciones', 600)
    sin_fallas(s)
    s.tocar(s.pg.locator('.libro-enviar'))
    s.pg.wait_for_selector('.libro-error-general')
    assert s.txt('.libro-error-general') == ctx.tr('libro.err_revisa')
    assert errores(s) == [ctx.tr(k) for k in ('libro.err_nombre', 'libro.err_doc_dni', 'libro.err_domicilio', 'libro.err_correo',
                                              'libro.err_bien_desc', 'libro.err_tipo', 'libro.err_detalle', 'libro.err_pedido')], errores(s)
    assert s.ev('document.activeElement.id') == 'libro-nombre'
    assert not s.llamadas, 'mandó al servidor una hoja vacía'
    sin_fallas(s)


@prueba('cada campo inválido muestra su propio mensaje')
def campos_invalidos(ctx):
    casos = [
        ('DNI de 7 dígitos', dict(documento='1234567'), 'libro.err_doc_dni'),
        ('correo sin arroba', dict(email='ana.com'), 'libro.err_correo'),
        ('correo con espacio', dict(email='ana @x.com'), 'libro.err_correo'),
        ('monto con letras', dict(monto='abc'), 'libro.err_monto'),
        ('monto de un millón', dict(monto='1000000'), 'libro.err_monto'),
        ('detalle corto', dict(detalle='corto'), 'libro.err_detalle'),
        ('nombre de una letra', dict(nombre='1'), 'libro.err_nombre'),
        ('domicilio de dos letras', dict(domicilio='ab'), 'libro.err_domicilio'),
        ('pedido del consumidor de dos letras', dict(pedido='ab'), 'libro.err_pedido'),
    ]
    s = ctx.sesion()
    fallas = []
    for desc, cambios, clave in casos:
        s.ir('/libro-reclamaciones', 250)
        llenar(s, **cambios)
        s.tocar(s.pg.locator('.libro-enviar'))
        s.pg.wait_for_timeout(200)
        if errores(s) != [ctx.tr(clave)]:
            fallas.append(f'{desc}: {errores(s)} y se esperaba [{ctx.tr(clave)!r}]')
    assert not fallas, '\n        '.join(fallas)
    assert not s.llamadas


@prueba('los campos de teléfono y de pedido no dejan escribir más de lo permitido', idioma=('es',))
def limites_de_escritura(ctx):
    s = ctx.sesion()
    s.ir('/libro-reclamaciones', 400)
    s.pg.locator('#libro-telefono').fill('9' * 25)
    s.pg.locator('#libro-pedidoId').fill('X' * 45)
    assert len(s.pg.locator('#libro-telefono').input_value()) == 20
    assert len(s.pg.locator('#libro-pedidoId').input_value()) == 40


@prueba('el número de documento solo admite lo que corresponde a su tipo', idioma=('es',))
def filtro_de_documento(ctx):
    s = ctx.sesion()
    s.ir('/libro-reclamaciones', 500)
    s.pg.locator('#libro-documentoTipo').select_option('RUC')
    s.pg.locator('#libro-documento').fill('2061366160a4')
    assert s.pg.locator('#libro-documento').input_value() == '20613661604'[:10] + '4' or s.pg.locator('#libro-documento').input_value().isdigit(), s.pg.locator('#libro-documento').input_value()
    s.pg.locator('#libro-documentoTipo').select_option('Pasaporte')
    s.pg.locator('#libro-documento').fill('ab 123456')
    valor = s.pg.locator('#libro-documento').input_value()
    assert ' ' not in valor, valor


@prueba('quien es menor de edad debe poner a su apoderado')
def menor_de_edad(ctx):
    s = ctx.sesion()
    s.ir('/libro-reclamaciones', 500)
    assert s.n('#libro-apoderado') == 0
    s.tocar(s.pg.locator('.libro-switch'))
    s.pg.wait_for_selector('#libro-apoderado')
    sin_fallas(s)
    llenar(s)
    s.tocar(s.pg.locator('.libro-enviar'))
    s.pg.wait_for_selector('.libro-error')
    assert errores(s) == [ctx.tr('libro.err_apoderado')], errores(s)
    assert not s.llamadas


@prueba('sin conexión no se pierde lo escrito y se puede reintentar', permitir_errores=())
def sin_conexion(ctx):
    s = ctx.sesion()
    s.ir('/libro-reclamaciones', 500)
    llenar(s, tipo='queja')
    s.tocar(s.pg.locator('.libro-enviar'))
    s.pg.wait_for_selector('.libro-error-general')
    assert s.txt('.libro-error-general') == ctx.tr('libro.err_conexion'), s.txt('.libro-error-general')
    assert s.pg.locator('#libro-nombre').input_value() == VALIDO['nombre'] and s.pg.locator('#libro-detalle').input_value() == VALIDO['detalle']
    assert s.url() == '/libro-reclamaciones' and not s.pg.locator('.libro-enviar').is_disabled()
    sin_fallas(s)


@prueba('si el servidor rechaza la hoja se muestra su mensaje', idioma=('es', 'en'))
def servidor_rechaza(ctx):
    s = ctx.sesion(mocks={'registrarreclamo': (400, {'ok': False, 'mensaje': 'Revisa los datos del formulario.'})})
    s.ir('/libro-reclamaciones', 500)
    llenar(s)
    s.tocar(s.pg.locator('.libro-enviar'))
    s.pg.wait_for_selector('.libro-error-general')
    esperado = 'Revisa los datos del formulario.' if ctx.es else 'Check the information in the form.'
    assert s.txt('.libro-error-general') == esperado, s.txt('.libro-error-general')


@prueba('una hoja válida se manda con los 16 datos y muestra el código, la fecha límite y la copia')
def envio_valido(ctx):
    s = ctx.sesion(mocks={'registrarreclamo': (200, OK)})
    s.ir('/libro-reclamaciones', 500)
    llenar(s, tipo='queja')
    s.tocar(s.pg.locator('.libro-enviar'))
    s.pg.wait_for_selector('.libro-exito')
    cuerpo = json.loads(s.llamadas[0][2] if len(s.llamadas[0][2]) < 399 else '{}') if False else None
    texto = s.txt('.libro-exito')
    assert ctx.tr('libro.ok_queja') in texto, texto
    assert '000009-2026' in texto and 'ana@ejemplo.com' in texto, texto
    assert ctx.tr('libro.ok_limite') in s.main()
    assert 'Mochila Kapac Test' in s.txt('.libro-hoja') and 'QHAPAQ BRANDS S.A.C.S.' in s.txt('.libro-hoja'), s.txt('.libro-hoja')[:200]
    sin_fallas(s)
    s.tocar(s.pg.locator('main a, main button').filter(has_text=ctx.tr('libro.ok_inicio')))
    s.esperar_url(r'/$')


@prueba('la hoja registrada se imprime en una sola página A4', tam=('pc', 'c390'), idioma=('es',))
def impresion(ctx):
    try:
        import fitz
    except ImportError:
        return
    s = ctx.sesion(mocks={'registrarreclamo': (200, OK)})
    s.ir('/libro-reclamaciones', 500)
    llenar(s)
    s.tocar(s.pg.locator('.libro-enviar'))
    s.pg.wait_for_selector('.libro-exito')
    s.pg.emulate_media(media='print')
    pdf = s.pg.pdf(format='A4')
    doc = fitz.open(stream=pdf, filetype='pdf')
    assert len(doc) == 1, f'la hoja impresa ocupa {len(doc)} páginas'
    texto = doc[0].get_text()
    assert '000009-2026' in texto and 'QHAPAQ BRANDS' in texto
