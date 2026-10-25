const test = require('node:test');
const assert = require('node:assert/strict');
const { recalcularPedido, moverStock, permitirIP } = require('../lib/pedidos');
const { crearBase } = require('./ayudas/base-falsa');

const catalogo = () => crearBase({
  productos: {
    p1: { nombre: 'Daypack', precio: 100, stock: 5 },
    p2: { nombre: 'Trek 45L', precio: 250.5, stock: 2 },
    texto: { nombre: 'Precio en texto', precio: '80', stock: '3' },
    sinStock: { nombre: 'Sin campo de stock', precio: 40 },
    gratis: { nombre: 'Gratis', precio: 0, stock: 5 },
    roto: { nombre: 'Precio roto', precio: 'abc', stock: 5 },
    negativo: { nombre: 'Negativo', precio: -10, stock: 5 },
  },
});

test('recalcularPedido: el precio y el nombre salen de la base, no del navegador', async () => {
  const db = catalogo();
  const r = await recalcularPedido(db, [{ id: 'p1', nombre: 'Gratis para mí', precio: 1, cantidad: 2 }]);
  assert.equal(r.centimos, 20000);
  assert.deepEqual(r.items, [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2 }]);
});

test('recalcularPedido: suma varios productos', async () => {
  const db = catalogo();
  const r = await recalcularPedido(db, [{ id: 'p1', cantidad: 1 }, { id: 'p2', cantidad: 2 }]);
  assert.equal(r.centimos, 10000 + 50100);
  assert.equal(r.items.length, 2);
});

test('recalcularPedido: los céntimos no se desvían con decimales', async () => {
  const db = crearBase({ productos: { a: { nombre: 'A', precio: 0.1, stock: 10 }, b: { nombre: 'B', precio: 0.2, stock: 10 } } });
  const r = await recalcularPedido(db, [{ id: 'a', cantidad: 1 }, { id: 'b', cantidad: 1 }]);
  assert.equal(r.centimos, 30);
});

test('recalcularPedido: la cantidad se limita entre 1 y 99', async () => {
  const db = crearBase({ productos: { p: { nombre: 'P', precio: 10, stock: 1000 } } });
  assert.equal((await recalcularPedido(db, [{ id: 'p', cantidad: 0 }])).items[0].cantidad, 1);
  assert.equal((await recalcularPedido(db, [{ id: 'p', cantidad: -4 }])).items[0].cantidad, 1);
  assert.equal((await recalcularPedido(db, [{ id: 'p', cantidad: 'abc' }])).items[0].cantidad, 1);
  assert.equal((await recalcularPedido(db, [{ id: 'p' }])).items[0].cantidad, 1);
  assert.equal((await recalcularPedido(db, [{ id: 'p', cantidad: 500 }])).items[0].cantidad, 99);
  assert.equal((await recalcularPedido(db, [{ id: 'p', cantidad: '3' }])).items[0].cantidad, 3);
  assert.equal((await recalcularPedido(db, [{ id: 'p', cantidad: 2.9 }])).items[0].cantidad, 2);
});

test('recalcularPedido: precio y stock guardados como texto', async () => {
  const r = await recalcularPedido(catalogo(), [{ id: 'texto', cantidad: 3 }]);
  assert.equal(r.centimos, 24000);
  assert.equal(r.items[0].precio, 80);
  await assert.rejects(recalcularPedido(catalogo(), [{ id: 'texto', cantidad: 4 }]), /Sin stock suficiente/);
});

test('recalcularPedido: sin id', async () => {
  await assert.rejects(recalcularPedido(catalogo(), [{ cantidad: 1 }]), /Item sin id/);
  await assert.rejects(recalcularPedido(catalogo(), [null]), /Item sin id/);
});

test('recalcularPedido: producto inexistente', async () => {
  await assert.rejects(recalcularPedido(catalogo(), [{ id: 'fantasma', cantidad: 1 }]), /Producto inexistente: fantasma/);
});

test('recalcularPedido: precio inválido (cero, negativo o texto)', async () => {
  for (const id of ['gratis', 'roto', 'negativo']) {
    await assert.rejects(recalcularPedido(catalogo(), [{ id, cantidad: 1 }]), /Precio inválido/, id);
  }
});

test('recalcularPedido: sin stock suficiente', async () => {
  await assert.rejects(recalcularPedido(catalogo(), [{ id: 'p2', cantidad: 3 }]), /Sin stock suficiente: Trek 45L/);
});

test('recalcularPedido: pedir justo el stock alcanza', async () => {
  const r = await recalcularPedido(catalogo(), [{ id: 'p2', cantidad: 2 }]);
  assert.equal(r.centimos, 50100);
});

test('recalcularPedido: revisarStock en falso no mira el stock', async () => {
  const r = await recalcularPedido(catalogo(), [{ id: 'p2', cantidad: 50 }], { revisarStock: false });
  assert.equal(r.items[0].cantidad, 50);
});

test('recalcularPedido: sin campo de stock no se bloquea la venta', async () => {
  const r = await recalcularPedido(catalogo(), [{ id: 'sinStock', cantidad: 7 }]);
  assert.equal(r.centimos, 28000);
});

test('recalcularPedido: carrito vacío o ausente es monto inválido', async () => {
  await assert.rejects(recalcularPedido(catalogo(), []), /Monto inválido/);
  await assert.rejects(recalcularPedido(catalogo(), undefined), /Monto inválido/);
  await assert.rejects(recalcularPedido(catalogo(), null), /Monto inválido/);
});

test('recalcularPedido: no toca la base', async () => {
  const db = catalogo();
  await recalcularPedido(db, [{ id: 'p1', cantidad: 1 }]);
  assert.equal(db.escrituras.length, 0);
});

const pedidoPagado = (extra = {}) => ({
  estado: 'pendiente_envio', stockDescontado: false,
  items: [{ id: 'p1', cantidad: 2 }, { id: 'p2', cantidad: 1 }], ...extra,
});

function conPedido(pedido, productos) {
  const db = crearBase({
    productos: productos || { p1: { nombre: 'Daypack', precio: 100, stock: 5 }, p2: { nombre: 'Trek', precio: 250, stock: 2 } },
    pedidos: { ped: pedido },
  });
  return { db, ref: db.collection('pedidos').doc('ped') };
}

test('moverStock: al pagar descuenta y marca stockDescontado', async () => {
  const { db, ref } = conPedido(pedidoPagado());
  await moverStock(db, ref, -1);
  assert.equal(db.leer('productos/p1').stock, 3);
  assert.equal(db.leer('productos/p2').stock, 1);
  assert.equal(db.leer('pedidos/ped').stockDescontado, true);
});

test('moverStock: hacerlo dos veces no descuenta dos veces', async () => {
  const { db, ref } = conPedido(pedidoPagado());
  await moverStock(db, ref, -1);
  await moverStock(db, ref, -1);
  assert.equal(db.leer('productos/p1').stock, 3);
  assert.equal(db.leer('productos/p2').stock, 1);
});

test('moverStock: al cancelar devuelve y marca false', async () => {
  const { db, ref } = conPedido(pedidoPagado({ stockDescontado: true }), { p1: { stock: 3 }, p2: { stock: 1 } });
  await moverStock(db, ref, 1);
  assert.equal(db.leer('productos/p1').stock, 5);
  assert.equal(db.leer('productos/p2').stock, 2);
  assert.equal(db.leer('pedidos/ped').stockDescontado, false);
});

test('moverStock: devolver dos veces no infla el stock', async () => {
  const { db, ref } = conPedido(pedidoPagado({ stockDescontado: true }), { p1: { stock: 3 }, p2: { stock: 1 } });
  await moverStock(db, ref, 1);
  await moverStock(db, ref, 1);
  assert.equal(db.leer('productos/p1').stock, 5);
});

test('moverStock: devolver un pedido que nunca descontó no hace nada', async () => {
  const { db, ref } = conPedido(pedidoPagado({ stockDescontado: false }));
  await moverStock(db, ref, 1);
  assert.equal(db.leer('productos/p1').stock, 5);
  assert.equal(db.leer('pedidos/ped').stockDescontado, false);
});

test('moverStock: descontar y devolver deja el stock como estaba', async () => {
  const { db, ref } = conPedido(pedidoPagado());
  await moverStock(db, ref, -1);
  await moverStock(db, ref, 1);
  assert.equal(db.leer('productos/p1').stock, 5);
  assert.equal(db.leer('productos/p2').stock, 2);
});

test('moverStock: nunca baja de cero', async () => {
  const { db, ref } = conPedido(pedidoPagado(), { p1: { stock: 1 }, p2: { stock: 0 } });
  await moverStock(db, ref, -1);
  assert.equal(db.leer('productos/p1').stock, 0);
  assert.equal(db.leer('productos/p2').stock, 0);
});

test('moverStock: ignora productos que no existen o con stock no numérico', async () => {
  const { db, ref } = conPedido(pedidoPagado({ items: [{ id: 'p1', cantidad: 1 }, { id: 'borrado', cantidad: 1 }, { id: 'p2', cantidad: 1 }] }),
    { p1: { stock: 5 }, p2: { stock: 'muchos' } });
  await moverStock(db, ref, -1);
  assert.equal(db.leer('productos/p1').stock, 4);
  assert.equal(db.leer('productos/p2').stock, 'muchos');
  assert.equal(db.existe('productos/borrado'), false);
  assert.equal(db.leer('pedidos/ped').stockDescontado, true);
});

test('moverStock: la cantidad rota cuenta como cero', async () => {
  const { db, ref } = conPedido(pedidoPagado({ items: [{ id: 'p1', cantidad: 'x' }] }));
  await moverStock(db, ref, -1);
  assert.equal(db.leer('productos/p1').stock, 5);
});

test('moverStock: el stock como texto numérico se descuenta', async () => {
  const { db, ref } = conPedido(pedidoPagado({ items: [{ id: 'p1', cantidad: 2 }] }), { p1: { stock: '5' } });
  await moverStock(db, ref, -1);
  assert.equal(db.leer('productos/p1').stock, 3);
});

const req = (ip) => ({ headers: { 'x-forwarded-for': ip } });

test('permitirIP: la primera vez sí y dentro de la ventana no', async () => {
  const db = crearBase();
  assert.equal(await permitirIP(db, req('203.0.113.9'), 5), true);
  assert.equal(await permitirIP(db, req('203.0.113.9'), 5), false);
});

test('permitirIP: otra IP no se ve afectada', async () => {
  const db = crearBase();
  assert.equal(await permitirIP(db, req('203.0.113.9'), 5), true);
  assert.equal(await permitirIP(db, req('203.0.113.10'), 5), true);
});

test('permitirIP: pasada la ventana vuelve a permitir', async () => {
  const db = crearBase({ limites_ip: { '203.0.113.9': { ultimo: Date.now() - 6000 } } });
  assert.equal(await permitirIP(db, req('203.0.113.9'), 5), true);
});

test('permitirIP: dentro de la ventana, aunque falte poco', async () => {
  const db = crearBase({ limites_ip: { '203.0.113.9': { ultimo: Date.now() - 4000 } } });
  assert.equal(await permitirIP(db, req('203.0.113.9'), 5), false);
});

test('permitirIP: los prefijos son independientes', async () => {
  const db = crearBase();
  assert.equal(await permitirIP(db, req('203.0.113.9'), 30, 'news_'), true);
  assert.equal(await permitirIP(db, req('203.0.113.9'), 20, 'reclamo_'), true);
  assert.equal(await permitirIP(db, req('203.0.113.9'), 5), true);
  assert.equal(await permitirIP(db, req('203.0.113.9'), 30, 'news_'), false);
});

test('permitirIP: guarda en limites_ip/<prefijo><ip>', async () => {
  const db = crearBase();
  await permitirIP(db, req('203.0.113.9'), 5, 'news_');
  assert.ok(db.existe('limites_ip/news_203.0.113.9'));
});

test('permitirIP: inventar IPs al principio de x-forwarded-for no salta el límite', async () => {
  const db = crearBase();
  assert.equal(await permitirIP(db, req('1.1.1.1, 203.0.113.9'), 5), true);
  assert.equal(await permitirIP(db, req('2.2.2.2, 203.0.113.9'), 5), false);
  assert.equal(await permitirIP(db, req('3.3.3.3, 203.0.113.9'), 5), false);
});
