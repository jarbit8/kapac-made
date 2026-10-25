// Las funciones de index.js con una base en memoria, Resend y Culqi simulados
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarIndex, peticion, respuesta, evento } = require('./ayudas/cargar-index');

test.mock.method(console, 'error', () => {});
test.mock.method(console, 'log', () => {});

const PRODUCTOS = {
  p1: { nombre: 'Daypack', precio: 100, stock: 5 },
  p2: { nombre: 'Trek 45L', precio: 250, stock: 2 },
  barato: { nombre: 'Llavero', precio: 3, stock: 50 },
};

const pedido = (extra = {}) => ({
  usuarioId: 'u1', email: 'ana@ejemplo.com', nombre: 'Ana Quispe', estado: 'procesando_pago', metodoPago: 'tarjeta',
  items: [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2 }], total: 200, envio: { tipo: 'recojo' }, ...extra,
});

// Arma el entorno de una prueba y lo limpia al terminar
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

test('index.js carga sin Firebase y exporta las 9 funciones', (t) => {
  const { funciones } = entorno(t);
  assert.deepEqual(Object.keys(funciones).sort(), [
    'cobrarCulqi', 'cortarFacturacion', 'crearOrdenCulqi', 'culqiWebhook', 'enviarCodigoNewsletter',
    'notificarCambioEstado', 'registrarReclamo', 'responderReclamo', 'verificarCodigoNewsletter',
  ]);
  for (const f of Object.values(funciones)) assert.equal(typeof f, 'function');
});

test('las funciones públicas solo aceptan el sitio como origen', (t) => {
  const { funciones } = entorno(t);
  for (const nombre of ['cobrarCulqi', 'crearOrdenCulqi', 'enviarCodigoNewsletter', 'verificarCodigoNewsletter', 'registrarReclamo']) {
    const { cors } = funciones[nombre].opciones;
    assert.ok(Array.isArray(cors), nombre);
    assert.ok(!cors.includes('*'), nombre);
    assert.ok(cors.includes('https://www.kapac-made.com'), nombre);
  }
  assert.equal(funciones.culqiWebhook.opciones.cors, false);
});

test('todas las funciones viven en us-central1', (t) => {
  const { funciones } = entorno(t);
  for (const [nombre, f] of Object.entries(funciones)) assert.equal(f.opciones.region, 'us-central1', nombre);
});

// ─── cobrarCulqi ─────────────────────────────────────────────────────────────

const cuerpoCobro = (extra = {}) => ({ token: 'tkn_test', pedidoId: 'ped1', email: 'ana@ejemplo.com', ...extra });

test('cobrarCulqi: solo acepta POST', async (t) => {
  const { funciones } = entorno(t);
  const res = await llamar(funciones.cobrarCulqi, { metodo: 'GET' });
  assert.equal(res.codigo, 405);
});

test('cobrarCulqi: sin token o sin pedido es 400', async (t) => {
  const { funciones } = entorno(t);
  assert.equal((await llamar(funciones.cobrarCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) })).codigo, 400);
  assert.equal((await llamar(funciones.cobrarCulqi, { cuerpo: { token: 'x' }, ...IP(2) })).codigo, 400);
});

test('cobrarCulqi: un pedido que no existe es 404', async (t) => {
  const { funciones } = entorno(t);
  const res = await llamar(funciones.cobrarCulqi, { cuerpo: cuerpoCobro({ pedidoId: 'nada' }), ...IP(1) });
  assert.equal(res.codigo, 404);
  assert.equal(res.cuerpo.mensaje, 'Pedido no encontrado.');
});

test('cobrarCulqi: cobra el monto real de la base, no el que diga el pedido', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ total: 1, items: [{ id: 'p1', nombre: 'Gratis', precio: 1, cantidad: 2 }] }) } });
  e.responder('/v2/charges', { object: 'charge', id: 'chr_123' });
  const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
  assert.equal(res.codigo, 200);
  assert.deepEqual(res.cuerpo, { ok: true, chargeId: 'chr_123' });
  const cobro = e.llamadas.find((l) => l.url.endsWith('/v2/charges'));
  assert.equal(cobro.cuerpo.amount, 20000);
  assert.equal(cobro.cuerpo.currency_code, 'PEN');
  assert.equal(cobro.cuerpo.source_id, 'tkn_test');
  assert.equal(cobro.cabeceras.Authorization, 'Bearer valor-de-CULQI_SECRET_KEY');
});

test('cobrarCulqi: tras cobrar el pedido pasa a pendiente_envio con el total y los items reales', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ total: 1, items: [{ id: 'p1', nombre: 'Gratis', precio: 1, cantidad: 2 }] }) } });
  e.responder('/v2/charges', { object: 'charge', id: 'chr_123' });
  await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
  const p = e.db.leer('pedidos/ped1');
  assert.equal(p.estado, 'pendiente_envio');
  assert.equal(p.culqiChargeId, 'chr_123');
  assert.equal(p.total, 200);
  assert.deepEqual(p.items, [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2 }]);
  assert.ok(p.pagoFecha);
});

test('cobrarCulqi: un pedido ya pagado, enviado o cancelado no se vuelve a cobrar', async (t) => {
  for (const estado of ['verificando_pago', 'pendiente_envio', 'enviado', 'entregado', 'cancelado']) {
    const e = entorno(t, { pedidos: { ped1: pedido({ estado }) } });
    const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
    assert.equal(res.codigo, 409, estado);
    assert.equal(e.llamadas.length, 0, estado);
  }
});

test('cobrarCulqi: un pedido con cargo de Culqi no se vuelve a cobrar', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ culqiChargeId: 'chr_viejo' }) } });
  const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
  assert.equal(res.codigo, 409);
  assert.equal(e.llamadas.length, 0);
});

test('cobrarCulqi: la misma IP no puede repetir en 5 segundos', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  e.responder('/v2/charges', { object: 'error', user_message: 'Tarjeta rechazada.' });
  assert.equal((await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) })).codigo, 400);
  const otra = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
  assert.equal(otra.codigo, 429);
  assert.equal(e.llamadas.length, 1);
});

test('cobrarCulqi: inventar IPs en x-forwarded-for no salta el límite', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  e.responder('/v2/charges', { object: 'error', user_message: 'Tarjeta rechazada.' });
  await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), forwarded: '1.1.1.1, 203.0.113.50' });
  const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), forwarded: '2.2.2.2, 203.0.113.50' });
  assert.equal(res.codigo, 429);
});

test('cobrarCulqi: una tarjeta rechazada devuelve el mensaje de Culqi y suma un intento', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  e.responder('/v2/charges', { object: 'error', user_message: 'La tarjeta no tiene fondos.' });
  const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
  assert.equal(res.codigo, 400);
  assert.deepEqual(res.cuerpo, { ok: false, mensaje: 'La tarjeta no tiene fondos.' });
  assert.equal(e.db.leer('pedidos/ped1').intentosCobro, 1);
  assert.equal(e.db.leer('pedidos/ped1').estado, 'procesando_pago');
});

test('cobrarCulqi: sin mensaje de Culqi dice "Tarjeta rechazada."', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  e.responder('/v2/charges', { object: 'error' });
  const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
  assert.equal(res.cuerpo.mensaje, 'Tarjeta rechazada.');
});

test('cobrarCulqi: al quinto intento fallido el pedido queda bloqueado', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  e.responder('/v2/charges', { object: 'error', user_message: 'Rechazada.' });
  for (let i = 1; i <= 5; i += 1) {
    assert.equal((await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(i) })).codigo, 400, `intento ${i}`);
  }
  const sexto = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(6) });
  assert.equal(sexto.codigo, 429);
  assert.match(sexto.cuerpo.mensaje, /Demasiados intentos con este pedido/);
  assert.equal(e.llamadas.length, 5);
});

test('cobrarCulqi: producto sin stock o inexistente es 400 y no llega a Culqi', async (t) => {
  for (const items of [[{ id: 'p2', cantidad: 3 }], [{ id: 'fantasma', cantidad: 1 }], []]) {
    const e = entorno(t, { pedidos: { ped1: pedido({ items }) } });
    const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
    assert.equal(res.codigo, 400);
    assert.equal(res.cuerpo.mensaje, 'No se pudo validar el monto del pedido.');
    assert.equal(e.llamadas.length, 0);
  }
});

test('cobrarCulqi: el correo "null" del navegador se cambia por el del pedido', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ email: 'luis@ejemplo.com' }) } });
  e.responder('/v2/charges', { object: 'charge', id: 'chr_1' });
  await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro({ email: 'null' }), ...IP(1) });
  assert.equal(e.llamadas[0].cuerpo.email, 'luis@ejemplo.com');
});

test('cobrarCulqi: sin ningún correo usa el de relleno de la tienda', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ email: '' }) } });
  e.responder('/v2/charges', { object: 'charge', id: 'chr_1' });
  await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro({ email: undefined }), ...IP(1) });
  assert.equal(e.llamadas[0].cuerpo.email, 'pedidos@kapac-made.com');
});

test('cobrarCulqi: si Culqi se cae responde 500 sin dejar el pedido pagado', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  const res = await llamar(e.funciones.cobrarCulqi, { cuerpo: cuerpoCobro(), ...IP(1) });
  assert.equal(res.codigo, 500);
  assert.equal(e.db.leer('pedidos/ped1').estado, 'procesando_pago');
});

// ─── crearOrdenCulqi (PagoEfectivo) ──────────────────────────────────────────

const respuestasPagoEfectivo = (e, confirmacion = {}) => {
  e.responder('/v2/orders/ord_1/confirm', { object: 'order', id: 'ord_1', payment_code: '123456789012', expiration_date: 1893456000, qr: 'qr-base64', url_pe: 'https://pagoefectivo.pe/x', ...confirmacion });
  e.responder('/v2/orders', { object: 'order', id: 'ord_1' });
};

test('crearOrdenCulqi: solo acepta POST y pide el pedido', async (t) => {
  const { funciones } = entorno(t);
  assert.equal((await llamar(funciones.crearOrdenCulqi, { metodo: 'GET' })).codigo, 405);
  assert.equal((await llamar(funciones.crearOrdenCulqi, { cuerpo: {}, ...IP(1) })).codigo, 400);
});

test('crearOrdenCulqi: pedido inexistente es 404 y uno ya pagado es 409', async (t) => {
  const e = entorno(t, { pedidos: { pagado: pedido({ estado: 'pendiente_envio' }) } });
  assert.equal((await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'nada' }, ...IP(1) })).codigo, 404);
  assert.equal((await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'pagado' }, ...IP(2) })).codigo, 409);
  assert.equal(e.llamadas.length, 0);
});

test('crearOrdenCulqi: genera el CIP con el monto real y lo guarda en el pedido', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ total: 1 }) } });
  respuestasPagoEfectivo(e);
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1', nombre: 'Ana Quispe Mamani' }, ...IP(1) });
  assert.equal(res.codigo, 200);
  assert.deepEqual(res.cuerpo, { ok: true, orderId: 'ord_1', codigoPago: '123456789012', expiration: 1893456000, qr: 'qr-base64', urlPe: 'https://pagoefectivo.pe/x' });
  const orden = e.llamadas.find((l) => l.url.endsWith('/v2/orders'));
  assert.equal(orden.cuerpo.amount, 20000);
  assert.equal(orden.cuerpo.client_details.first_name, 'Ana');
  assert.equal(orden.cuerpo.client_details.last_name, 'Quispe Mamani');
  assert.equal(orden.cuerpo.confirm, false);
  const p = e.db.leer('pedidos/ped1');
  assert.equal(p.codigoPago, '123456789012');
  assert.equal(p.codigoPagoVence, 1893456000);
  assert.equal(p.culqiOrderId, 'ord_1');
  assert.equal(p.metodoPago, 'efectivo');
  assert.equal(p.total, 200);
});

test('crearOrdenCulqi: la orden vence en 48 horas', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  respuestasPagoEfectivo(e);
  const antes = Math.floor(Date.now() / 1000);
  await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  const venc = e.llamadas.find((l) => l.url.endsWith('/v2/orders')).cuerpo.expiration_date;
  assert.ok(venc >= antes + 48 * 3600 && venc <= antes + 48 * 3600 + 5);
});

test('crearOrdenCulqi: con la sesión anónima toma el correo del pedido y no manda "null"', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ email: 'luis@ejemplo.com' }) } });
  respuestasPagoEfectivo(e);
  await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1', email: 'null' }, ...IP(1) });
  assert.equal(e.llamadas.find((l) => l.url.endsWith('/v2/orders')).cuerpo.client_details.email, 'luis@ejemplo.com');
});

test('crearOrdenCulqi: un pedido sin correo en ningún lado usa el de relleno', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ email: null }) } });
  respuestasPagoEfectivo(e);
  await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1', email: 'undefined' }, ...IP(1) });
  assert.equal(e.llamadas.find((l) => l.url.endsWith('/v2/orders')).cuerpo.client_details.email, 'pedidos@kapac-made.com');
});

test('crearOrdenCulqi: un CIP vigente se reutiliza sin llamar a Culqi', async (t) => {
  const vence = Math.floor(Date.now() / 1000) + 3600;
  const e = entorno(t, { pedidos: { ped1: pedido({ estado: 'verificando_pago', codigoPago: '999', codigoPagoVence: vence, culqiOrderId: 'ord_viejo', codigoPagoQR: 'q', codigoPagoUrl: 'u' }) } });
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 200);
  assert.deepEqual(res.cuerpo, { ok: true, orderId: 'ord_viejo', codigoPago: '999', expiration: vence, qr: 'q', urlPe: 'u' });
  assert.equal(e.llamadas.length, 0);
});

test('crearOrdenCulqi: un CIP vencido genera uno nuevo', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ codigoPago: '999', codigoPagoVence: Math.floor(Date.now() / 1000) - 60 }) } });
  respuestasPagoEfectivo(e);
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.cuerpo.codigoPago, '123456789012');
});

test('crearOrdenCulqi: PagoEfectivo exige S/ 6.00 como mínimo', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ items: [{ id: 'barato', cantidad: 1 }] }) } });
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 400);
  assert.match(res.cuerpo.mensaje, /compra mínima de S\/ 6\.00/);
  assert.equal(e.llamadas.length, 0);
  const justo = entorno(t, { pedidos: { ped1: pedido({ items: [{ id: 'barato', cantidad: 2 }] }) } });
  respuestasPagoEfectivo(justo);
  assert.equal((await llamar(justo.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) })).codigo, 200);
});

test('crearOrdenCulqi: sin stock da un mensaje claro', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido({ items: [{ id: 'p2', cantidad: 9 }] }) } });
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.mensaje, 'No hay stock suficiente para tu pedido.');
});

test('crearOrdenCulqi: si Culqi rechaza la orden no se guarda ningún CIP', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  e.responder('/v2/orders', { object: 'error', user_message: 'Orden inválida.' });
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.mensaje, 'Orden inválida.');
  assert.equal(e.db.leer('pedidos/ped1').codigoPago, undefined);
});

test('crearOrdenCulqi: si la confirmación no trae código tampoco se guarda', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  respuestasPagoEfectivo(e, { payment_code: null });
  const res = await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) });
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.mensaje, 'No se pudo generar el código.');
  assert.equal(e.db.leer('pedidos/ped1').codigoPago, undefined);
});

test('crearOrdenCulqi: la misma IP no puede repetir en 5 segundos', async (t) => {
  const e = entorno(t, { pedidos: { ped1: pedido() } });
  respuestasPagoEfectivo(e);
  assert.equal((await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) })).codigo, 200);
  assert.equal((await llamar(e.funciones.crearOrdenCulqi, { cuerpo: { pedidoId: 'ped1' }, ...IP(1) })).codigo, 429);
});

// ─── culqiWebhook ────────────────────────────────────────────────────────────

const aviso = (id = 'ord_1') => ({ data: JSON.stringify({ id }) });
const ordenPagada = (extra = {}) => ({ object: 'order', id: 'ord_1', state: 'paid', amount: 20000, ...extra });
const conOrden = (extra = {}) => ({ pedidos: { ped1: pedido({ estado: 'verificando_pago', metodoPago: 'efectivo', culqiOrderId: 'ord_1', ...extra }) } });

test('culqiWebhook: sin id de orden responde OK sin hacer nada', async (t) => {
  const e = entorno(t, conOrden());
  for (const cuerpo of [{}, { data: '{roto' }, { data: {} }, undefined]) {
    const res = await llamar(e.funciones.culqiWebhook, { cuerpo });
    assert.equal(res.codigo, 200);
  }
  assert.equal(e.llamadas.length, 0);
});

test('culqiWebhook: confirma con Culqi y pasa el pedido a pendiente_envio', async (t) => {
  const e = entorno(t, conOrden());
  e.responder('/v2/orders/ord_1', ordenPagada());
  const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(res.codigo, 200);
  assert.equal(e.db.leer('pedidos/ped1').estado, 'pendiente_envio');
  assert.ok(e.db.leer('pedidos/ped1').pagoFecha);
  assert.equal(e.llamadas[0].cabeceras.Authorization, 'Bearer valor-de-CULQI_SECRET_KEY');
});

test('culqiWebhook: acepta data como objeto', async (t) => {
  const e = entorno(t, conOrden());
  e.responder('/v2/orders/ord_1', ordenPagada());
  await llamar(e.funciones.culqiWebhook, { cuerpo: { data: { id: 'ord_1' } } });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'pendiente_envio');
});

test('culqiWebhook: también cobra los pedidos en procesando_pago', async (t) => {
  const e = entorno(t, conOrden({ estado: 'procesando_pago' }));
  e.responder('/v2/orders/ord_1', ordenPagada());
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'pendiente_envio');
});

test('culqiWebhook: una orden que Culqi no marca como pagada no cambia nada', async (t) => {
  for (const orden of [ordenPagada({ state: 'pending' }), ordenPagada({ state: 'expired' }), { object: 'error' }]) {
    const e = entorno(t, conOrden());
    e.responder('/v2/orders/ord_1', orden);
    const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
    assert.equal(res.codigo, 200);
    assert.equal(e.db.leer('pedidos/ped1').estado, 'verificando_pago');
  }
});

test('culqiWebhook: un aviso falso no pasa: se verifica la orden con Culqi, no con el cuerpo', async (t) => {
  const e = entorno(t, conOrden());
  e.responder('/v2/orders/ord_1', ordenPagada({ state: 'pending' }));
  await llamar(e.funciones.culqiWebhook, { cuerpo: { data: JSON.stringify({ id: 'ord_1', state: 'paid', amount: 20000 }) } });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'verificando_pago');
  assert.ok(e.llamadas[0].url.endsWith('/v2/orders/ord_1'));
});

test('culqiWebhook: si el monto pagado no coincide con el real no se confirma', async (t) => {
  const e = entorno(t, conOrden());
  e.responder('/v2/orders/ord_1', ordenPagada({ amount: 600 }));
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'verificando_pago');
});

test('culqiWebhook: no revive pedidos cancelados ni vuelve a procesar los ya enviados', async (t) => {
  for (const estado of ['cancelado', 'pendiente_envio', 'enviado', 'entregado']) {
    const e = entorno(t, conOrden({ estado }));
    e.responder('/v2/orders/ord_1', ordenPagada());
    await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
    assert.equal(e.db.leer('pedidos/ped1').estado, estado);
    assert.equal(e.db.leer('pedidos/ped1').pagoFecha, undefined, estado);
  }
});

test('culqiWebhook: una orden sin pedido no rompe', async (t) => {
  const e = entorno(t);
  e.responder('/v2/orders/ord_1', ordenPagada());
  const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(res.codigo, 200);
});

test('culqiWebhook: si el pedido ya no se puede valorar (producto borrado) no lo confirma', async (t) => {
  const e = entorno(t, conOrden({ items: [{ id: 'borrado', cantidad: 1 }] }));
  e.responder('/v2/orders/ord_1', ordenPagada());
  await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(e.db.leer('pedidos/ped1').estado, 'verificando_pago');
});

test('culqiWebhook: si Culqi no responde igual contesta 200 para que no reintente sin fin', async (t) => {
  const e = entorno(t, conOrden());
  const res = await llamar(e.funciones.culqiWebhook, { cuerpo: aviso() });
  assert.equal(res.codigo, 200);
  assert.equal(e.db.leer('pedidos/ped1').estado, 'verificando_pago');
});

// ─── notificarCambioEstado ───────────────────────────────────────────────────

async function cambiar(e, antes, despues, params = { pedidoId: 'ped1' }) {
  await e.funciones.notificarCambioEstado(evento(e.db, 'pedidos/ped1', antes, despues, params));
}

test('notificarCambioEstado: sin cambio de estado ni aviso nuevo no hace nada', async (t) => {
  const e = entorno(t);
  const p = pedido({ estado: 'verificando_pago', canalNotificacion: 'email' });
  await cambiar(e, p, { ...p, nombre: 'Otro nombre' });
  assert.equal(e.correos.length, 0);
});

test('notificarCambioEstado: al pagar descuenta el stock y avisa por correo', async (t) => {
  const e = entorno(t);
  const antes = pedido({ canalNotificacion: 'email' });
  await cambiar(e, antes, { ...antes, estado: 'pendiente_envio' });
  assert.equal(e.db.leer('productos/p1').stock, 3);
  assert.equal(e.db.leer('pedidos/ped1').stockDescontado, true);
  assert.equal(e.correos.length, 1);
  assert.deepEqual(e.correos[0].to, ['ana@ejemplo.com']);
  assert.match(e.correos[0].subject, /Pago confirmado/);
  assert.equal(e.correos[0].from, 'Kapac Made <pedidos@kapac-made.com>');
  assert.equal(e.db.leer('pedidos/ped1').ultimoAviso, 'pendiente_envio');
});

test('notificarCambioEstado: el stock no se descuenta dos veces si el trigger se repite', async (t) => {
  const e = entorno(t);
  const antes = pedido();
  const despues = { ...antes, estado: 'pendiente_envio' };
  await cambiar(e, antes, despues);
  await cambiar(e, antes, { ...despues, stockDescontado: true });
  assert.equal(e.db.leer('productos/p1').stock, 3);
});

test('notificarCambioEstado: al cancelar un pedido pagado devuelve el stock', async (t) => {
  const e = entorno(t, { productos: { p1: { nombre: 'Daypack', precio: 100, stock: 3 } } });
  const antes = pedido({ estado: 'pendiente_envio', stockDescontado: true });
  await cambiar(e, antes, { ...antes, estado: 'cancelado' });
  assert.equal(e.db.leer('productos/p1').stock, 5);
  assert.equal(e.db.leer('pedidos/ped1').stockDescontado, false);
});

test('notificarCambioEstado: cancelar un pedido que nunca descontó no toca el stock', async (t) => {
  const e = entorno(t);
  const antes = pedido({ estado: 'verificando_pago' });
  await cambiar(e, antes, { ...antes, estado: 'cancelado' });
  assert.equal(e.db.leer('productos/p1').stock, 5);
});

test('notificarCambioEstado: avanzar de pendiente_envio a enviado no mueve el stock', async (t) => {
  const e = entorno(t, { productos: { p1: { nombre: 'Daypack', precio: 100, stock: 3 } } });
  const antes = pedido({ estado: 'pendiente_envio', stockDescontado: true });
  await cambiar(e, antes, { ...antes, estado: 'enviado' });
  assert.equal(e.db.leer('productos/p1').stock, 3);
});

test('notificarCambioEstado: Yape QR rehace total e items con los precios reales', async (t) => {
  const e = entorno(t);
  const antes = pedido({ metodoPago: 'yape', total: 1, items: [{ id: 'p1', nombre: 'Gratis', precio: 1, cantidad: 2 }], canalNotificacion: 'email' });
  await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
  const p = e.db.leer('pedidos/ped1');
  assert.equal(p.total, 200);
  assert.deepEqual(p.items, [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2 }]);
  assert.ok(e.correos[0].html.includes('S/ 200.00'));
  assert.ok(!e.correos[0].html.includes('Gratis'));
});

test('notificarCambioEstado: Yape QR deja pasar el pedido aunque no haya stock (el admin decide)', async (t) => {
  const e = entorno(t);
  const antes = pedido({ metodoPago: 'yape', items: [{ id: 'p2', precio: 1, cantidad: 9 }] });
  await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
  assert.equal(e.db.leer('pedidos/ped1').total, 2250);
});

test('notificarCambioEstado: un correo por estado, sin repetir', async (t) => {
  const e = entorno(t);
  const antes = pedido({ estado: 'pendiente_envio', canalNotificacion: 'email', stockDescontado: true });
  await cambiar(e, antes, { ...antes, estado: 'enviado' });
  assert.equal(e.correos.length, 1);
  const enviado = e.db.leer('pedidos/ped1');
  await cambiar(e, { ...enviado, estado: 'pendiente_envio' }, enviado);
  assert.equal(e.correos.length, 1, 'el mismo estado no vuelve a mandar correo');
  await cambiar(e, enviado, { ...enviado, estado: 'entregado' });
  assert.equal(e.correos.length, 2);
});

test('notificarCambioEstado: sin correo o sin aviso activado no manda nada', async (t) => {
  const e = entorno(t);
  const sinAviso = pedido();
  await cambiar(e, sinAviso, { ...sinAviso, estado: 'enviado' });
  const otroCanal = pedido({ canalNotificacion: 'sms' });
  await cambiar(e, otroCanal, { ...otroCanal, estado: 'enviado' });
  const sinCorreo = pedido({ canalNotificacion: 'email', email: '' });
  await cambiar(e, sinCorreo, { ...sinCorreo, estado: 'enviado' });
  assert.equal(e.correos.length, 0);
});

test('notificarCambioEstado: al activar el aviso con el pedido ya pagado manda el correo de ese estado', async (t) => {
  const e = entorno(t, { productos: { p1: { nombre: 'Daypack', precio: 100, stock: 3 } } });
  const antes = pedido({ estado: 'pendiente_envio', stockDescontado: true });
  await cambiar(e, antes, { ...antes, canalNotificacion: 'email' });
  assert.equal(e.correos.length, 1);
  assert.match(e.correos[0].subject, /Pago confirmado/);
  assert.equal(e.db.leer('productos/p1').stock, 3, 'no vuelve a descontar');
});

test('notificarCambioEstado: procesando_pago no manda correo', async (t) => {
  const e = entorno(t);
  const antes = pedido({ estado: 'verificando_pago', canalNotificacion: 'email' });
  await cambiar(e, antes, { ...antes, estado: 'procesando_pago' });
  assert.equal(e.correos.length, 0);
});

test('notificarCambioEstado: PagoEfectivo manda el CIP', async (t) => {
  const e = entorno(t);
  const antes = pedido({ metodoPago: 'efectivo', codigoPago: '123456789012', codigoPagoVence: 1893456000, canalNotificacion: 'email' });
  await cambiar(e, antes, { ...antes, estado: 'verificando_pago' });
  assert.ok(e.correos[0].html.includes('123456789012'));
  assert.match(e.correos[0].subject, /Tu código de pago/);
});

test('notificarCambioEstado: si Resend falla no se cae el trigger', async (t) => {
  const e = entorno(t);
  e.estado.errorResend = { name: 'validation_error', message: 'dominio sin verificar' };
  const antes = pedido({ canalNotificacion: 'email' });
  await assert.doesNotReject(cambiar(e, antes, { ...antes, estado: 'pendiente_envio' }));
  assert.equal(e.db.leer('productos/p1').stock, 3, 'el stock se descuenta aunque el correo falle');
});

// ─── Boletín ─────────────────────────────────────────────────────────────────

test('enviarCodigoNewsletter: correo inválido', async (t) => {
  const { funciones } = entorno(t);
  for (const email of ['', 'ana', 'ana@', 'a b@x.com', undefined]) {
    const res = await llamar(funciones.enviarCodigoNewsletter, { cuerpo: { email }, ...IP(1) });
    assert.equal(res.codigo, 400);
    assert.equal(res.cuerpo.mensaje, 'Correo inválido');
  }
  assert.equal((await llamar(funciones.enviarCodigoNewsletter, { metodo: 'GET' })).codigo, 405);
});

test('enviarCodigoNewsletter: manda un código de 6 dígitos que vale 15 minutos', async (t) => {
  const e = entorno(t);
  const res = await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: ' Ana@Ejemplo.com ' }, ...IP(1) });
  assert.deepEqual(res.cuerpo, { ok: true });
  const guardado = e.db.leer('newsletter_codigos/ana@ejemplo.com');
  assert.match(guardado.codigo, /^\d{6}$/);
  assert.equal(guardado.intentos, 0);
  assert.ok(Math.abs(guardado.expira - (Date.now() + 15 * 60 * 1000)) < 5000);
  assert.equal(e.correos.length, 1);
  assert.deepEqual(e.correos[0].to, 'ana@ejemplo.com');
  assert.ok(e.correos[0].subject.startsWith(guardado.codigo));
  assert.ok(e.correos[0].html.includes(`>${guardado.codigo}<`));
});

test('enviarCodigoNewsletter: quien ya está suscrito no recibe otro código', async (t) => {
  const e = entorno(t, { newsletter: { n1: { email: 'ana@ejemplo.com', verificado: true } } });
  const res = await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com' }, ...IP(1) });
  assert.deepEqual(res.cuerpo, { ok: true, yaExistia: true });
  assert.equal(e.correos.length, 0);
});

test('enviarCodigoNewsletter: no reenvía antes de 60 segundos', async (t) => {
  const e = entorno(t, { newsletter_codigos: { 'ana@ejemplo.com': { codigo: '111111', enviado: Date.now() - 10_000, expira: Date.now() + 60_000 } } });
  const res = await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com' }, ...IP(1) });
  assert.equal(res.codigo, 429);
  assert.equal(res.cuerpo.mensaje, 'Ya te enviamos un código. Espera un momento.');
  assert.equal(e.correos.length, 0);
});

test('enviarCodigoNewsletter: una IP no puede pedir códigos seguidos para correos distintos', async (t) => {
  const e = entorno(t);
  assert.equal((await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'a@ejemplo.com' }, ...IP(1) })).codigo, 200);
  assert.equal((await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'b@ejemplo.com' }, ...IP(1) })).codigo, 429);
  assert.equal((await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'c@ejemplo.com' }, ...IP(2) })).codigo, 200);
});

test('enviarCodigoNewsletter: tope de 80 envíos al día', async (t) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const e = entorno(t, { limites: { newsletter_dia: { dia: hoy, count: 80 } } });
  const res = await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com' }, ...IP(1) });
  assert.equal(res.codigo, 429);
  assert.equal(e.correos.length, 0);
});

test('enviarCodigoNewsletter: un tope de ayer no bloquea hoy', async (t) => {
  const e = entorno(t, { limites: { newsletter_dia: { dia: '2020-01-01', count: 80 } } });
  const res = await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com' }, ...IP(1) });
  assert.equal(res.codigo, 200);
  assert.equal(e.db.leer('limites/newsletter_dia').count, 1);
});

test('enviarCodigoNewsletter: si Resend falla avisa con 500 y borra el código', async (t) => {
  const e = entorno(t);
  e.estado.errorResend = { name: 'validation_error', message: 'dominio sin verificar' };
  const res = await llamar(e.funciones.enviarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com' }, ...IP(1) });
  assert.equal(res.codigo, 500);
  assert.equal(res.cuerpo.ok, false);
  assert.equal(e.db.existe('newsletter_codigos/ana@ejemplo.com'), false);
});

const conCodigo = (extra = {}) => ({ newsletter_codigos: { 'ana@ejemplo.com': { email: 'ana@ejemplo.com', codigo: '482913', expira: Date.now() + 60_000, intentos: 0, ...extra } } });

test('verificarCodigoNewsletter: faltan datos o no hay código pedido', async (t) => {
  const e = entorno(t);
  assert.equal((await llamar(e.funciones.verificarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com' } })).codigo, 400);
  const sin = await llamar(e.funciones.verificarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com', codigo: '111111' } });
  assert.equal(sin.cuerpo.mensaje, 'Solicita un código primero.');
  assert.equal((await llamar(e.funciones.verificarCodigoNewsletter, { metodo: 'GET' })).codigo, 405);
});

test('verificarCodigoNewsletter: el código correcto suscribe y se borra', async (t) => {
  const e = entorno(t, conCodigo());
  const res = await llamar(e.funciones.verificarCodigoNewsletter, { cuerpo: { email: 'Ana@Ejemplo.com', codigo: ' 482913 ' } });
  assert.deepEqual(res.cuerpo, { ok: true });
  assert.equal(e.db.existe('newsletter_codigos/ana@ejemplo.com'), false);
  const suscrito = e.db.leer('newsletter/auto1');
  assert.equal(suscrito.email, 'ana@ejemplo.com');
  assert.equal(suscrito.verificado, true);
});

test('verificarCodigoNewsletter: un código incorrecto suma un intento', async (t) => {
  const e = entorno(t, conCodigo());
  const res = await llamar(e.funciones.verificarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com', codigo: '000000' } });
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.mensaje, 'Código incorrecto.');
  assert.equal(e.db.leer('newsletter_codigos/ana@ejemplo.com').intentos, 1);
  assert.equal(e.db.existe('newsletter/auto1'), false);
});

test('verificarCodigoNewsletter: con 5 intentos el código se borra aunque acierten', async (t) => {
  const e = entorno(t, conCodigo({ intentos: 5 }));
  const res = await llamar(e.funciones.verificarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com', codigo: '482913' } });
  assert.equal(res.cuerpo.mensaje, 'Demasiados intentos. Pide un código nuevo.');
  assert.equal(e.db.existe('newsletter_codigos/ana@ejemplo.com'), false);
  assert.equal(e.db.existe('newsletter/auto1'), false);
});

test('verificarCodigoNewsletter: un código vencido se borra', async (t) => {
  const e = entorno(t, conCodigo({ expira: Date.now() - 1 }));
  const res = await llamar(e.funciones.verificarCodigoNewsletter, { cuerpo: { email: 'ana@ejemplo.com', codigo: '482913' } });
  assert.equal(res.cuerpo.mensaje, 'El código expiró. Pide uno nuevo.');
  assert.equal(e.db.existe('newsletter_codigos/ana@ejemplo.com'), false);
});

// ─── Libro de Reclamaciones ──────────────────────────────────────────────────

const hoja = (extra = {}) => ({
  tipo: 'reclamo', nombre: 'Ana Quispe Mamani', documentoTipo: 'DNI', documento: '45678912',
  domicilio: 'Calle Mercaderes 123, Arequipa', telefono: '987654321', email: 'ana@ejemplo.com',
  menorDeEdad: false, bienTipo: 'producto', bienDescripcion: 'Mochila Kapac Test', monto: 180, pedidoId: 'AB12CD34',
  detalle: 'La costura del tirante se soltó.', pedido: 'Cambio de la mochila.', idioma: 'es', ...extra,
});

const anioLima = () => Number(new Date().toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' }));

test('registrarReclamo: registra la hoja con número correlativo del año', async (t) => {
  const e = entorno(t);
  const res = await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) });
  assert.equal(res.codigo, 200);
  const codigo = `000001-${anioLima()}`;
  assert.equal(res.cuerpo.codigo, codigo);
  const guardado = e.db.leer(`reclamos/${codigo}`);
  assert.equal(guardado.estado, 'pendiente');
  assert.equal(guardado.respuesta, null);
  assert.equal(guardado.nombre, 'Ana Quispe Mamani');
  assert.equal(guardado.copiaEnviada, true);
  assert.deepEqual(e.db.leer('contadores/reclamos').n, 1);
  const segundo = await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(2) });
  assert.equal(segundo.cuerpo.codigo, `000002-${anioLima()}`);
});

test('registrarReclamo: el plazo es de 15 días hábiles', async (t) => {
  const e = entorno(t);
  const res = await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) });
  const dias = (new Date(res.cuerpo.fechaLimite) - new Date(res.cuerpo.fecha)) / 86400000;
  // de viernes a viernes son 21 días corridos; desde un sábado o domingo, menos
  assert.ok(dias >= 19 && dias <= 21.1, `${dias} días corridos`);
  const dia = new Date(res.cuerpo.fechaLimite).toLocaleDateString('en-US', { timeZone: 'America/Lima', weekday: 'long' });
  assert.ok(!['Saturday', 'Sunday'].includes(dia));
});

test('registrarReclamo: manda la copia al consumidor y el aviso a la tienda', async (t) => {
  const e = entorno(t);
  await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) });
  assert.equal(e.correos.length, 2);
  assert.deepEqual(e.correos.map((c) => c.to).sort(), [['ana@ejemplo.com'], ['jarb2299@gmail.com']]);
  assert.ok(e.correos.some((c) => c.subject.startsWith('Tu reclamo')));
  assert.ok(e.correos.some((c) => c.subject.startsWith('Nuevo reclamo')));
});

test('registrarReclamo: datos inválidos son 400 y no gastan número', async (t) => {
  const e = entorno(t);
  const res = await llamar(e.funciones.registrarReclamo, { cuerpo: hoja({ documento: '123' }), ...IP(1) });
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.mensaje, 'Revisa los datos del formulario.');
  assert.equal(e.db.existe('contadores/reclamos'), false);
  assert.equal(e.correos.length, 0);
  assert.equal((await llamar(e.funciones.registrarReclamo, { metodo: 'GET' })).codigo, 405);
  assert.equal((await llamar(e.funciones.registrarReclamo, { cuerpo: undefined, ...IP(2) })).codigo, 400);
});

test('registrarReclamo: una IP no puede enviar dos seguidos', async (t) => {
  const e = entorno(t);
  assert.equal((await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) })).codigo, 200);
  assert.equal((await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) })).codigo, 429);
});

test('registrarReclamo: tope de 50 por día', async (t) => {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const e = entorno(t, { contadores: { reclamos: { anio: anioLima(), n: 50, dia: hoy, delDia: 50 } } });
  const res = await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) });
  assert.equal(res.codigo, 503);
  assert.equal(e.correos.length, 0);
});

test('registrarReclamo: un nuevo año reinicia el número', async (t) => {
  const e = entorno(t, { contadores: { reclamos: { anio: 2020, n: 77, dia: '2020-12-31', delDia: 3 } } });
  const res = await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) });
  assert.equal(res.cuerpo.codigo, `000001-${anioLima()}`);
});

test('registrarReclamo: si no sale el correo igual registra el reclamo y lo anota', async (t) => {
  const e = entorno(t);
  e.estado.errorResend = { name: 'validation_error', message: 'x' };
  const res = await llamar(e.funciones.registrarReclamo, { cuerpo: hoja(), ...IP(1) });
  assert.equal(res.codigo, 200);
  assert.equal(e.db.leer(`reclamos/${res.cuerpo.codigo}`).copiaEnviada, false);
});

test('responderReclamo: al guardar la respuesta se la manda al consumidor', async (t) => {
  const e = entorno(t);
  const base = { codigo: '000001-2026', tipo: 'reclamo', nombre: 'Ana', email: 'ana@ejemplo.com', fecha: { toDate: () => new Date('2026-10-26T15:00:00Z') }, fechaLimite: { toDate: () => new Date('2026-11-16T15:00:00Z') }, detalle: 'x', pedido: 'y', documentoTipo: 'DNI', documento: '45678912', domicilio: 'Calle 1', bienDescripcion: 'Mochila', bienTipo: 'producto', monto: null };
  const ev = evento(e.db, 'reclamos/000001-2026', { ...base, respuesta: null }, { ...base, respuesta: 'Te cambiamos la mochila.', fechaRespuesta: { toDate: () => new Date('2026-10-28T15:00:00Z') } }, { codigo: '000001-2026' });
  await e.funciones.responderReclamo(ev);
  assert.equal(e.correos.length, 1);
  assert.deepEqual(e.correos[0].to, ['ana@ejemplo.com']);
  assert.match(e.correos[0].subject, /^Respuesta a tu reclamo/);
  assert.equal(e.db.leer('reclamos/000001-2026').respuestaEnviada, true);
});

test('responderReclamo: no contesta dos veces ni sin respuesta', async (t) => {
  const e = entorno(t);
  const base = { codigo: '000001-2026', email: 'ana@ejemplo.com', fecha: { toDate: () => new Date() } };
  await e.funciones.responderReclamo(evento(e.db, 'reclamos/000001-2026', { ...base, respuesta: 'primera' }, { ...base, respuesta: 'primera', otro: 1 }, { codigo: '000001-2026' }));
  await e.funciones.responderReclamo(evento(e.db, 'reclamos/000001-2026', { ...base, respuesta: null }, { ...base, respuesta: null, otro: 1 }, { codigo: '000001-2026' }));
  assert.equal(e.correos.length, 0);
});

test('responderReclamo: si el correo falla lo anota', async (t) => {
  const e = entorno(t);
  e.estado.errorResend = { name: 'x', message: 'y' };
  const base = { codigo: '000001-2026', tipo: 'queja', nombre: 'Ana', email: 'ana@ejemplo.com', fecha: { toDate: () => new Date() }, fechaLimite: { toDate: () => new Date() }, detalle: 'x', pedido: 'y', documentoTipo: 'DNI', documento: '1', domicilio: 'z', bienDescripcion: 'm', bienTipo: 'servicio', monto: null };
  await e.funciones.responderReclamo(evento(e.db, 'reclamos/000001-2026', { ...base, respuesta: null }, { ...base, respuesta: 'Hola' }, { codigo: '000001-2026' }));
  assert.equal(e.db.leer('reclamos/000001-2026').respuestaEnviada, false);
});

// ─── cortarFacturacion ───────────────────────────────────────────────────────

const mensaje = (json) => ({ data: { message: { json } } });
const redFacturacion = (e, { facturacion = true, putOk = true } = {}) => {
  e.responder('metadata.google.internal', { access_token: 'tok' });
  e.responder('billingInfo', { billingEnabled: facturacion }, { metodo: 'GET' });
  e.responder('billingInfo', { billingEnabled: false }, { metodo: 'PUT', ok: putOk, estado: putOk ? 200 : 403 });
};

test('cortarFacturacion: con el gasto bajo el tope no hace nada', async (t) => {
  const e = entorno(t);
  await e.funciones.cortarFacturacion(mensaje({ costAmount: 0.5, budgetAmount: 1, currencyCode: 'USD' }));
  assert.equal(e.llamadas.length, 0);
});

test('cortarFacturacion: al llegar al tope desvincula la facturación', async (t) => {
  const e = entorno(t);
  redFacturacion(e);
  await e.funciones.cortarFacturacion(mensaje({ costAmount: 1, budgetAmount: 1, currencyCode: 'USD' }));
  const put = e.llamadas.find((l) => l.metodo === 'PUT');
  assert.ok(put.url.includes('/projects/kapac-made/billingInfo'));
  assert.deepEqual(put.cuerpo, { billingAccountName: '' });
  assert.equal(put.cabeceras.Authorization, 'Bearer tok');
});

test('cortarFacturacion: si ya está desvinculada no vuelve a cortar', async (t) => {
  const e = entorno(t);
  redFacturacion(e, { facturacion: false });
  await e.funciones.cortarFacturacion(mensaje({ costAmount: 5, budgetAmount: 1 }));
  assert.equal(e.llamadas.some((l) => l.metodo === 'PUT'), false);
});

test('cortarFacturacion: avisos sin números válidos se ignoran', async (t) => {
  const e = entorno(t);
  for (const json of [{}, { costAmount: 'x', budgetAmount: 1 }, { costAmount: 1 }, undefined]) {
    await e.funciones.cortarFacturacion(mensaje(json));
  }
  assert.equal(e.llamadas.length, 0);
});

test('cortarFacturacion: si Google rechaza el corte lanza el error para que se reintente', async (t) => {
  const e = entorno(t);
  redFacturacion(e, { putOk: false });
  await assert.rejects(e.funciones.cortarFacturacion(mensaje({ costAmount: 2, budgetAmount: 1 })), /No se pudo cortar la facturación/);
});
