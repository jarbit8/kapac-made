"""La tienda y la ficha del producto: lo que ve el visitante con el catálogo de ejemplo."""
import re

import datos
from base import OTRO_PRODUCTO, OTRO_PRODUCTO_ID, PREFIJO_EN, PRODUCTO, PRODUCTO_ID, auditar, prueba, sin_fallas

P = datos.producto

VARIOS = {
    'productos/largo': P(nombre='Mochila Expedición Andina Edición Limitada Con Un Nombre Muy Largo Para Probar El Diseño 45L', precio='1299', stock='10'),
    'productos/agotado': P(nombre='Daypack Agotado', precio='189', stock='0'),
    'productos/descuento': P(nombre='Daypack con descuento', precio='189', stock='5', precioOriginal='249'),
    'productos/sinfoto': P(nombre='Mochila sin foto', precio='99', stock='4', fotos=[], imagenMochila='', galeria=[]),
    'productos/borrador': P(nombre='Borrador que no se ve', precio='150', stock='4', activo=False),
}


def nombres_tienda(s):
    return s.ev("[...document.querySelectorAll('.catalogo-page-name')].map(a => a.innerText.trim())")


@prueba('la tienda lista los productos activos con su precio')
def tienda(ctx):
    s = ctx.sesion(datos=VARIOS)
    s.ir('/shop', 800)
    nombres = nombres_tienda(s)
    assert 'KAPAC TEST' in nombres and 'DAYPACK LIGERO' in nombres, nombres
    assert 'BORRADOR QUE NO SE VE' not in nombres, 'el borrador aparece para el visitante'
    assert len(nombres) == 6, nombres
    precios = s.ev(r"[...document.querySelectorAll('.catalogo-page-card')].map(c => [c.querySelector('.catalogo-page-name').innerText.trim(), c.querySelector('.catalogo-page-precios').innerText.replace(/\s+/g, ' ').trim()])")
    por_nombre = dict(precios)
    assert por_nombre['KAPAC TEST'] == 'S/90.00', por_nombre
    assert por_nombre['DAYPACK LIGERO'] == 'S/150.00 S/190.00', 'el precio anterior debe salir junto al actual'
    assert por_nombre['MOCHILA SIN FOTO'] == 'S/99.00'
    sin_fallas(s)
    s.tocar(s.pg.locator('.catalogo-page-card').first)
    s.esperar_url('/producto/')
    assert s.url() == PRODUCTO, s.url()


@prueba('la búsqueda filtra la tienda')
def busqueda(ctx):
    s = ctx.sesion(datos=VARIOS)
    s.ir('/shop?q=daypack', 800)
    assert nombres_tienda(s) == ['DAYPACK LIGERO', 'DAYPACK AGOTADO', 'DAYPACK CON DESCUENTO'], nombres_tienda(s)
    s.ir('/shop?q=zzzz', 800)
    assert nombres_tienda(s) == []
    s.ir('/shop?q=KAPAC', 600)
    assert nombres_tienda(s) == ['KAPAC TEST'], 'la búsqueda no distingue mayúsculas'


@prueba('la ficha muestra nombre, precio, descripción, características y stock')
def ficha(ctx):
    s = ctx.sesion()
    s.ir(PRODUCTO, 800)
    assert s.txt('h1').lower() == 'kapac test'
    assert s.txt('.producto-precio') == 'S/90.00'
    assert 'Mochila de prueba hecha a mano en Arequipa.' in s.main()
    assert 'Descripcion test 1' in s.main() and '45 L' in s.main(), 'faltan características o especificaciones'
    assert re.search(r'2', s.txt('.producto-stock')), f'stock: {s.txt(".producto-stock")}'
    assert s.n('.galeria-img') >= 1
    sin_fallas(s)


@prueba('en inglés los textos del producto salen traducidos y si la traducción falla queda el español')
def nombre_en_ingles(ctx):
    s = ctx.sesion(traduccion='prefijo')
    s.ir(OTRO_PRODUCTO, 800)
    esperado = 'daypack ligero' if ctx.es else (PREFIJO_EN + 'Daypack Ligero').lower()
    assert s.txt('h1').lower() == esperado, s.txt('h1')
    s.ir('/shop', 800)
    assert (nombres_tienda(s)[1].lower()) == esperado.upper().lower(), nombres_tienda(s)
    caida = ctx.sesion(traduccion='cae')
    caida.ir(OTRO_PRODUCTO, 800)
    assert caida.txt('h1').lower() == 'daypack ligero', 'si falla la traducción debe quedar el español, no vacío'


@prueba('un producto agotado no se puede agregar')
def agotado(ctx):
    s = ctx.sesion(datos=VARIOS)
    s.ir('/producto/agotado', 700)
    assert s.pg.locator('.producto-add').is_disabled(), 'el botón de agregar sigue activo'
    assert 'agotado' in s.txt('.producto-stock').lower() or 'out of stock' in s.txt('.producto-stock').lower(), s.txt('.producto-stock')
    sin_fallas(s)


@prueba('el producto con descuento muestra el precio anterior')
def descuento(ctx):
    s = ctx.sesion(datos=VARIOS)
    s.ir('/producto/descuento', 700)
    assert s.txt('.producto-precio') == 'S/189.00', s.txt('.producto-precio')
    assert s.txt('.producto-precio-original') == 'S/249.00', 'no marca el precio anterior'


@prueba('un nombre larguísimo y un producto sin foto no rompen la ficha')
def casos_raros(ctx):
    s = ctx.sesion(datos=VARIOS)
    for pid in ('largo', 'sinfoto'):
        s.ir(f'/producto/{pid}', 700)
        sin_fallas(s, pid)
    assert s.n('.galeria-img') == 0 or s.ev("[...document.querySelectorAll('.galeria-img')].every(i => i.naturalWidth > 0)")


@prueba('un borrador no se ve por su dirección directa')
def borrador(ctx):
    s = ctx.sesion(datos=VARIOS)
    s.ir('/producto/borrador', 700)
    assert ctx.tr('producto.no_encontrado').lower() in s.main().lower(), s.main()[:120]


@prueba('el producto desaparece de la tienda si se borra')
def producto_borrado(ctx):
    s = ctx.sesion(datos={f'productos/{OTRO_PRODUCTO_ID}': None})
    s.ir('/shop', 700)
    assert nombres_tienda(s) == ['KAPAC TEST'], nombres_tienda(s)
    s.ir(OTRO_PRODUCTO, 600)
    assert ctx.tr('producto.no_encontrado').lower() in s.main().lower()
