"""El carrito: agregar, cantidades, stock, y ponerse al día con el catálogo."""
import datos
from base import CLIENTE, PRECIO, PRODUCTO, PRODUCTO_ID, STOCK, auditar, prueba, sin_fallas

P = datos.producto


def avisos(s):
    return s.ev("[...document.querySelectorAll('.carrito-avisos li')].map(l => l.innerText.trim())")


def cantidad(s):
    return s.txt('.carrito-cantidad span')


@prueba('agregar al carrito no pasa del stock')
def tope_de_stock(ctx):
    s = ctx.sesion()
    s.ir(PRODUCTO, 600)
    boton = s.pg.locator('.producto-add')
    assert 'AGREGAR' in boton.inner_text().upper() or 'ADD' in boton.inner_text().upper()
    s.tocar(boton)
    s.pg.wait_for_function("document.querySelector('.producto-add').innerText.includes('✓')")
    assert [i['cantidad'] for i in s.carrito()] == [1]
    s.pg.wait_for_function("!document.querySelector('.producto-add').innerText.includes('✓')")
    s.tocar(boton)
    s.pg.wait_for_timeout(200)
    assert [i['cantidad'] for i in s.carrito()] == [STOCK]
    s.pg.wait_for_function("!document.querySelector('.producto-add').innerText.includes('✓')")
    s.tocar(boton)
    s.pg.wait_for_timeout(300)
    assert [i['cantidad'] for i in s.carrito()] == [STOCK], 'agregó más unidades de las que hay'
    assert ctx.tr('producto.maximo').lower() in boton.inner_text().lower(), boton.inner_text()


@prueba('el carrito suma, resta, quita y vuelve a la tienda')
def cantidades(ctx):
    s = ctx.sesion()
    s.agregar_al_carrito(PRODUCTO, 2)
    s.ir('/carrito', 500)
    assert s.n('.carrito-item') == 1
    assert s.txt('.carrito-precio') == f'S/{PRECIO}.00'
    assert cantidad(s) == '2'
    assert s.txt('.carrito-subtotal') == f'S/{PRECIO * 2}.00'
    assert s.txt('.carrito-total').endswith(f'S/{PRECIO * 2}.00')
    mas, menos = s.pg.locator('.carrito-cantidad button').nth(1), s.pg.locator('.carrito-cantidad button').nth(0)
    assert mas.is_disabled(), 'se puede pasar del stock con +'
    s.tocar(menos)
    s.pg.wait_for_function("document.querySelector('.carrito-cantidad span').innerText === '1'")
    assert s.txt('.carrito-total').endswith(f'S/{PRECIO}.00')
    assert s.carrito()[0]['cantidad'] == 1
    assert menos.is_disabled() or (s.tocar(menos), cantidad(s))[1] == '1', 'bajó de 1'
    assert not mas.is_disabled()
    s.tocar(mas)
    s.pg.wait_for_function("document.querySelector('.carrito-cantidad span').innerText === '2'")
    sin_fallas(s)
    s.tocar(s.pg.locator('.carrito-quitar'))
    s.pg.wait_for_selector('.carrito-vacio')
    assert s.carrito() == []
    assert ctx.tr('carrito.vacio') in s.main()
    s.tocar(s.pg.locator('.carrito-vacio button'))
    s.esperar_url('/shop')


@prueba('el carrito se conserva al recargar y suma productos distintos')
def varios_productos(ctx):
    s = ctx.sesion()
    s.agregar_al_carrito(PRODUCTO, 1)
    s.agregar_al_carrito('/producto/' + 'daypack-ligero', 2)
    s.ir('/carrito', 500)
    assert s.n('.carrito-item') == 2
    assert s.txt('.carrito-total').endswith(f'S/{PRECIO + 150 * 2}.00'), s.txt('.carrito-total')
    s.pg.reload()
    s.pg.wait_for_selector('.carrito-item')
    assert s.n('.carrito-item') == 2
    s.tocar(s.pg.locator('.carrito-finalizar'))
    s.esperar_url('/checkout')


@prueba('un carrito dañado en el navegador no rompe la página')
def carrito_danado(ctx):
    for malo in ('xx', '{"a":1}', 'null'):
        s = ctx.sesion(init_extra=f"try {{ localStorage.setItem('kapac_carrito', {malo!r}); }} catch (e) {{}}")
        s.ir('/carrito', 500)
        assert s.n('.carrito-vacio') == 1, f'con {malo!r}: {s.main()[:100]}'
        s.ir('/shop', 400)


@prueba('si el catálogo cambia, el carrito se pone al día y avisa', idioma=('es', 'en'))
def carrito_al_dia(ctx):
    n = 'Kapac Test'
    ruta = f'productos/{PRODUCTO_ID}'
    casos = [
        ('sube el precio', P(precio='110'), [ctx.tr('carrito.aviso_precio', n=n, antes='S/90.00', ahora='S/110.00')], dict(precio='S/110.00', cant='2', total='S/220.00')),
        ('baja el stock', P(stock='1'), [ctx.tr('carrito.aviso_stock', n=n, stock=1)], dict(precio='S/90.00', cant='1', total='S/90.00')),
        ('se borra el producto', None, [ctx.tr('carrito.aviso_quitado', n=n)], dict(vacio=True)),
        ('pasa a borrador', P(activo=False), [ctx.tr('carrito.aviso_quitado', n=n)], dict(vacio=True)),
        ('se agota', P(stock='0'), [ctx.tr('carrito.aviso_agotado', n=n)], dict(vacio=True)),
        ('precio inválido', P(precio='0'), [ctx.tr('carrito.aviso_quitado', n=n)], dict(vacio=True)),
        ('no cambia nada', P(), [], dict(precio='S/90.00', cant='2', total='S/180.00')),
    ]
    fallas = []
    for nombre, doc, esperados, datos_carrito in casos:
        s = ctx.sesion()
        s.agregar_al_carrito(PRODUCTO, 2)
        s.cambiar_catalogo(ruta, doc)
        s.ir('/carrito', 900)
        if avisos(s) != esperados:
            fallas.append(f'{nombre}: avisos {avisos(s)} y se esperaba {esperados}')
        if datos_carrito.get('vacio'):
            if s.n('.carrito-vacio') != 1:
                fallas.append(f'{nombre}: el carrito no quedó vacío')
        else:
            visto = dict(precio=s.txt('.carrito-precio'), cant=cantidad(s), total=s.txt('.carrito-total').split('|')[-1].strip())
            if visto != datos_carrito:
                fallas.append(f'{nombre}: {visto} y se esperaba {datos_carrito}')
        s.ir('/shop', 500)
        s.ir('/carrito', 500)
        if avisos(s):
            fallas.append(f'{nombre}: los avisos vuelven a salir al reabrir el carrito')
        s.cerrar()
    assert not fallas, '\n        '.join(fallas)


@prueba('un aviso detectado fuera del carrito se muestra al abrirlo', idioma=('es',))
def aviso_diferido(ctx):
    s = ctx.sesion()
    s.agregar_al_carrito(PRODUCTO, 2)
    s.cambiar_catalogo(f'productos/{PRODUCTO_ID}', P(precio='120'))
    s.ir('/shop', 3000)
    assert '120' in (s.local('kapac_carrito') or ''), 'el carrito no se actualizó fuera del carrito'
    s.ir('/carrito', 500)
    assert avisos(s) == [ctx.tr('carrito.aviso_precio', n='Kapac Test', antes='S/90.00', ahora='S/120.00')], avisos(s)
    s.tocar(s.pg.locator('.carrito-avisos-cerrar'))
    s.pg.wait_for_selector('.carrito-avisos', state='detached')


@prueba('un carrito con precio y stock viejos se corrige antes de pagar', idioma=('es',))
def precio_viejo(ctx):
    s = ctx.sesion()
    s.agregar_al_carrito(PRODUCTO, 1)
    s.ev("""() => { const c = JSON.parse(localStorage.getItem('kapac_carrito')); c[0].precio = 3; c[0].stock = 9; c[0].cantidad = 5; localStorage.setItem('kapac_carrito', JSON.stringify(c)); }""")
    s.ir('/carrito', 1200)
    assert s.txt('.carrito-precio') == f'S/{PRECIO}.00', s.txt('.carrito-precio')
    assert cantidad(s) == str(STOCK)
    assert s.pg.locator('.carrito-cantidad button').nth(1).is_disabled()
    assert len(avisos(s)) == 2, avisos(s)
    s.llenar_checkout()
    assert s.txt('.metodo-sub').endswith(f'S/{PRECIO * STOCK}.00') or f'{PRECIO * STOCK}' in s.txt('.metodo-sub'), s.txt('.metodo-sub')
    s.elegir_metodo(2)
    s.esperar_url('/pago/tarjeta/')
    pedido = s.pedidos_creados()[-1]['datos']
    assert pedido['total'] == PRECIO * STOCK, pedido['total']
    assert [(i['precio'], i['cantidad']) for i in pedido['items']] == [(str(PRECIO), STOCK)] or [(int(i['precio']), i['cantidad']) for i in pedido['items']] == [(PRECIO, STOCK)], pedido['items']


@prueba('con cuenta el carrito se guarda y se une con el de otro dispositivo', idioma=('es',))
def carrito_en_la_cuenta(ctx):
    guardado = {'carritos/u-1': {'items': [{'id': 'daypack-ligero', 'nombre': 'Daypack Ligero', 'precio': '150', 'moneda': 'S/', 'stock': 10, 'cantidad': 1}]}}
    s = ctx.sesion(usuario=CLIENTE, datos=guardado)
    s.agregar_al_carrito(PRODUCTO, 1)
    s.ir('/carrito', 1200)
    assert sorted(i['id'] for i in s.carrito()) == ['daypack-ligero', PRODUCTO_ID], 'no unió el carrito de la cuenta con el local'
    s.pg.wait_for_timeout(900)
    guardados = [e for e in s.escrituras('carritos')]
    assert guardados, 'no guardó el carrito en la cuenta'
    assert sorted(i['id'] for i in guardados[-1]['datos']['items']) == ['daypack-ligero', PRODUCTO_ID]
