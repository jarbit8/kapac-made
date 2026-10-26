// Reserva de stock, órdenes vencidas y el flujo de PagoEfectivo de punta a punta, con la base en memoria
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarIndex, peticion, respuesta, evento } = require('./ayudas/cargar-index');

test.mock.method(console, 'error', () => {});
test.mock.method(console, 'log', () => {});

const PRODUCTOS = {
  p1: { nombre: 'Daypack', precio: 100, stock: 5 },
  p2: { nombre: 'Trek 45L', precio: 250, stock: 2 },
};

const pedido = (extra = {}) => ({
  usuarioId: 'u1', email: 'ana@ejemplo.com', nombre: 'Ana Quispe', estado: 'procesando_pago', metodoPago: 'tarjeta',
  items: [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2 }], total: 200, envio: { tipo: 'envio' }, ...extra,
});

function entorno(t, datos = {}) {
  const e = cargarIndex({ datos: { productos: PRODUCTOS, ...datos } });
  t.after(() => e.restaurar());
  return e;
}

async function llamar(manejador, opciones) {
  const res = respuesta();
  await manejador(peticion(opciones), res);
  return res;
}

const IP = (n) => ({ forwarded: `203.0.113.${n}` });

async function cambiar(e, antes, despues, id = 'ped1') {
  await e.funciones.notificarCambioEstado(evento(e.db, `pedidos/${id}`, antes, despues, { pedidoId: id }));
}

// Lo que hace Firestore tras una escritura del servidor: dispara el trigger con el documento de antes y el de ahora
const dispararTrigger = (e, antes) => cambiar(e, antes, e.db.leer('pedidos/ped1'));

const stock = (e, id = 'p1') => e.db.leer(`productos/${id}`).stock;
const aviso = (id = 'ord_1') => ({ data: JSON.stringify({ id }) });
const ordenCulqi = (extra = {}) => ({ object: 'order', id: 'ord_1', state: 'paid', amount: 20000, ...extra });
const conOrden = (extra = {}) => ({ pedidos: { ped1: pedido({ estado: 'verificando_pago', metodoPago: 'efectivo', culqiOrderId: 'ord_1', ...extra }) } });

// ─── Reserva de stock ────────────────────────────────────────────────────────

for (const metodoPago of ['yape', 'efectivo']) {
  test(`reserva: ${metodoPago} reserva el stock al pasar a verificando_pago, una sola vez`, async (t) => {
    const e = entorno(t);
    const antes = pedido({ metodoPago });
    await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
    assert.equal(stock(e), 3);
    assert.equal(e.db.leer('pedidos/ped1').stockDescontado, true);
    await cambiar(e, antes, e.db.leer('pedidos/ped1'));
    assert.equal(stock(e), 3, 'el trigger repetido no descuenta otra vez');
  });

  test(`reserva: ${metodoPago} no descuenta otra vez al pagarse ni al enviarse después de reservar`, async (t) => {
    const e = entorno(t);
    const antes = pedido({ metodoPago });
    await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
    const reservado = e.db.leer('pedidos/ped1');
    await cambiar(e, reservado, { ...reservado, estado: 'pendiente_envio' });
    assert.equal(stock(e), 3);
    const pagado = e.db.leer('pedidos/ped1');
    await cambiar(e, pagado, { ...pagado, estado: 'enviado' });
    assert.equal(stock(e), 3);
  });

  test(`reserva: cancelar un pedido de ${metodoPago} que reservó devuelve el stock`, async (t) => {
    const e = entorno(t);
    const antes = pedido({ metodoPago });
    await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
    const reservado = e.db.leer('pedidos/ped1');
    await cambiar(e, reservado, { ...reservado, estado: 'cancelado' });
    assert.equal(stock(e), 5);
    assert.equal(e.db.leer('pedidos/ped1').stockDescontado, false);
  });
}

test('reserva: con tarjeta el stock se descuenta al pagar y no antes', async (t) => {
  const e = entorno(t);
  const antes = pedido({ canalNotificacion: 'email' });
  assert.equal(stock(e), 5);
  await cambiar(e, antes, { ...antes, estado: 'pendiente_envio' });
  assert.equal(stock(e), 3);
  assert.equal(e.db.leer('pedidos/ped1').stockDescontado, true);
});

test('reserva: volver a procesando_pago sin haber reservado no toca el stock', async (t) => {
  const e = entorno(t);
  const antes = pedido({ estado: 'verificando_pago' });
  await cambiar(e, antes, { ...antes, estado: 'procesando_pago' });
  assert.equal(stock(e), 5);
  assert.equal(e.db.leer('pedidos/ped1').stockDescontado, undefined);
});

test('reserva: cada pedido descuenta lo suyo', async (t) => {
  const e = entorno(t, { pedidos: { ped2: pedido({ metodoPago: 'yape' }) } });
  const antes = pedido({ metodoPago: 'yape' });
  await cambiar(e, antes, { ...antes, estado: 'verificando_pago' }, 'ped1');
  await cambiar(e, antes, { ...antes, estado: 'verificando_pago' }, 'ped2');
  assert.equal(stock(e), 1);
});

test('reserva: sin stock el pedido igual pasa y el stock queda en cero', async (t) => {
  const e = entorno(t);
  const antes = pedido({ metodoPago: 'yape', items: [{ id: 'p2', precio: 250, cantidad: 9 }] });
  await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
  assert.equal(stock(e, 'p2'), 0);
  assert.equal(e.db.leer('pedidos/ped1').stockDescontado, true);
});

test('reserva: cancelar un pedido que reservó sin tener todo el stock no deja más stock del que había',
  { todo: 'moverStock devuelve la cantidad completa aunque al reservar el stock solo bajó hasta 0: stock 2, pedido de 9, reserva -> 0, cancelación -> 9 (functions/lib/pedidos.js)' },
  async (t) => {
    const e = entorno(t);
    const antes = pedido({ metodoPago: 'yape', items: [{ id: 'p2', precio: 250, cantidad: 9 }] });
    await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
    const reservado = e.db.leer('pedidos/ped1');
    await cambiar(e, reservado, { ...reservado, estado: 'cancelado' });
    assert.ok(stock(e, 'p2') <= 2, `el stock quedó en ${stock(e, 'p2')}`);
  });

// ─── crearOrdenCulqi con la reserva ──────────────────────────────────────────

const darOrden = (e) => e.responder('/v2/orders', { object: 'order', id: 'ord_2', amount: 20000, payment_code: '999888777666', expiration_date: 1893456000, qr: 'qr', cip_url: 'https://pagoefectivo.pe/x' }, { metodo: 'POST' });
const darConfirmacion = (e) => e.responder('/v2/orders/ord_2/confirm', { object: 'order', id: 'ord_2', payment_code: '999888777666', expiration_date: 1893456000, qr: 'qr', cip_url: 'https://pagoefectivo.pe/x' }, { metodo: 'POST' });

test('crearOrdenCulqi: un pedido que ya reservó no cuenta contra su propia reserva', async (t) => {
  const e = entorno(t, {
    productos: { p1: { nombre: 'Daypack', precio: 100, stock: 0 } },
    pedidos: { ped1: pedido({ estado: 'verificando_pago', metodoPago: 'efectivo', stockDescontado: true, culqiOrderId: 'ord_1', codigoPago: '111', codigoPagoVence: 1000 }) },
  });
  darOrden(e);
  darConfirmacion(e);
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 200, JSON.stringify(res.cuerpo));
  assert.equal(e.db.leer('pedidos/ped1').culqiOrderId, 'ord_2');
});

test('crearOrdenCulqi: un pedido que no reservó y no tiene stock se rechaza sin llamar a Culqi', async (t) => {
  const e = entorno(t, {
    productos: { p1: { nombre: 'Daypack', precio: 100, stock: 0 } },
    pedidos: { ped1: pedido({ estado: 'procesando_pago', metodoPago: 'efectivo' }) },
  });
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.mensaje, 'No hay stock suficiente para tu pedido.');
  assert.equal(e.llamadas.length, 0);
});

test('crearOrdenCulqi: un CIP vigente se vuelve a mostrar aunque el stock esté en cero', async (t) => {
  const e = entorno(t, {
    productos: { p1: { nombre: 'Daypack', precio: 100, stock: 0 } },
    pedidos: { ped1: pedido({ estado: 'verificando_pago', metodoPago: 'efectivo', stockDescontado: true, culqiOrderId: 'ord_1', codigoPago: '111', codigoPagoVence: Math.floor(Date.now() / 1000) + 3600 }) },
  });
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 200);
  assert.equal(res.cuerpo.codigoPago, '111');
  assert.equal(e.llamadas.length, 0);
});

// ─── culqiWebhook con la reserva y con órdenes vencidas ──────────────────────

test('culqiWebhook: una orden pagada de un pedido que ya reservó se confirma aunque el stock esté en cero', async (t) => {
  const e = entorno(t, { productos: { p1: { nombre: 'Daypack', precio: 100, stock: 0 } }, ...conOrden({ stockDescontado: true }) });
  e.responder('/v2/orders/ord_1', ordenCulqi());
  const antes = e.db.leer('pedidos/ped1');
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'pendiente_envio');
  await dispararTrigger(e, antes);
  assert.equal(stock(e), 0, 'el trigger no descuenta otra vez');
});

test('culqiWebhook: una orden pagada de un pedido que no reservó y no tiene stock no se confirma', async (t) => {
  const e = entorno(t, { productos: { p1: { nombre: 'Daypack', precio: 100, stock: 0 } }, ...conOrden() });
  e.responder('/v2/orders/ord_1', ordenCulqi());
  const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(res.cuerpo, 'OK (monto no validable)');
  assert.equal(e.db.leer('pedidos/ped1').estado, 'verificando_pago');
});

test('culqiWebhook: una orden vencida cancela el pedido y el trigger devuelve la unidad reservada', async (t) => {
  const e = entorno(t, { productos: { p1: { nombre: 'Daypack', precio: 100, stock: 3 } }, ...conOrden({ stockDescontado: true }) });
  e.responder('/v2/orders/ord_1', ordenCulqi({ state: 'expired' }));
  const antes = e.db.leer('pedidos/ped1');
  const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(res.codigo, 200);
  assert.equal(res.cuerpo, 'OK (vencido)');
  assert.equal(e.db.leer('pedidos/ped1').estado, 'cancelado');
  await dispararTrigger(e, antes);
  assert.equal(stock(e), 5);
  assert.equal(e.db.leer('pedidos/ped1').stockDescontado, false);
});

test('culqiWebhook: una orden vencida de un pedido que no reservó solo lo cancela', async (t) => {
  for (const estado of ['procesando_pago', 'verificando_pago']) {
    const e = entorno(t, conOrden({ estado }));
    e.responder('/v2/orders/ord_1', ordenCulqi({ state: 'expired' }));
    const antes = e.db.leer('pedidos/ped1');
    await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
    assert.equal(e.db.leer('pedidos/ped1').estado, 'cancelado', estado);
    await dispararTrigger(e, antes);
    assert.equal(stock(e), 5, estado);
  }
});

test('culqiWebhook: una orden vencida no toca pedidos ya pagados, enviados o cancelados', async (t) => {
  for (const estado of ['pendiente_envio', 'enviado', 'entregado', 'cancelado']) {
    const e = entorno(t, conOrden({ estado, stockDescontado: true }));
    e.responder('/v2/orders/ord_1', ordenCulqi({ state: 'expired' }));
    const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
    assert.equal(res.cuerpo, 'OK (ya procesado)', estado);
    assert.equal(e.db.leer('pedidos/ped1').estado, estado);
  }
});

test('culqiWebhook: la orden vencida se cancela sin comparar el monto', async (t) => {
  const e = entorno(t, conOrden());
  e.responder('/v2/orders/ord_1', ordenCulqi({ state: 'expired', amount: 1 }));
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'cancelado');
});

test('culqiWebhook: una orden pagada y luego repetida no vuelve a cambiar nada', async (t) => {
  const e = entorno(t, conOrden({ stockDescontado: true }));
  e.responder('/v2/orders/ord_1', ordenCulqi());
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  const primero = e.db.leer('pedidos/ped1');
  const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(res.cuerpo, 'OK (ya procesado)');
  assert.deepEqual(e.db.leer('pedidos/ped1'), primero);
});

// ─── PagoEfectivo de punta a punta ───────────────────────────────────────────

test('PagoEfectivo completo: código, "ya tengo mi código" reserva, el webhook paga y el stock queda descontado una vez', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ metodoPago: 'efectivo', canalNotificacion: 'email' }) } });
  darOrden(e);
  darConfirmacion(e);
  assert.equal((await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) })).codigo, 200);
  assert.equal(stock(e), 5, 'generar el código todavía no reserva');
  const conCodigo = e.db.leer('pedidos/ped1');
  await cambiar(e, conCodigo, { ...conCodigo, estado: 'verificando_pago' });
  assert.equal(stock(e), 3, 'tocar "ya tengo mi código" reserva');
  assert.match(e.correos.at(-1).subject, /Tu código de pago/);
  e.responder('/v2/orders/ord_2', ordenCulqi({ id: 'ord_2' }));
  const reservado = e.db.leer('pedidos/ped1');
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso('ord_2') });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'pendiente_envio');
  await dispararTrigger(e, reservado);
  assert.equal(stock(e), 3);
  assert.match(e.correos.at(-1).subject, /Pago confirmado/);
});

test('PagoEfectivo vencido: el código vence, el webhook cancela y la tienda recupera la unidad', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ metodoPago: 'efectivo', culqiOrderId: 'ord_1', codigoPago: '111', codigoPagoVence: 1000 }) } });
  const antes = e.db.leer('pedidos/ped1');
  await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
  assert.equal(stock(e), 3);
  e.responder('/v2/orders/ord_1', ordenCulqi({ state: 'expired' }));
  const reservado = e.db.leer('pedidos/ped1');
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  await dispararTrigger(e, reservado);
  assert.equal(e.db.leer('pedidos/ped1').estado, 'cancelado');
  assert.equal(stock(e), 5);
});
