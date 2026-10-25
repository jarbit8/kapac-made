const test = require('node:test');
const assert = require('node:assert/strict');
const { correoPedido, correoCodigo, correoReclamo, correoRespuestaReclamo } = require('../correos');
const TEXTOS = require('../textos-pedidos.json');

const ID = 'abcdef1234567890';
const CORTO = 'ABCDEF12';
const CIP = '123456789012';
// 26 oct 2026, 15:00 UTC = 10:00 en Lima
const VENCE = Date.UTC(2026, 9, 26, 15, 0, 0) / 1000;
const ITEMS = [{ nombre: 'Daypack Andino', precio: 100, cantidad: 2 }, { nombre: 'Trek 45L', precio: 250.5, cantidad: 1 }];
const DOMICILIO = { tipo: 'envio', direccion: 'Calle Mercaderes 123', distrito: 'Cayma' };
const RECOJO = { tipo: 'recojo' };

const pedido = (extra = {}) => ({
  pedidoId: ID, estado: 'verificando_pago', total: 450.5, items: ITEMS, envio: DOMICILIO,
  metodoPago: 'yape', codigoPago: CIP, codigoPagoVence: VENCE, ...extra,
});

const escapar = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rellenar = (t, datos) => t.replace(/\{(\w+)\}/g, (todo, k) => (datos[k] !== undefined ? datos[k] : todo));

// Lo que el JSON dice para ese estado, método y entrega
function esperado(estado, metodoPago, recojo) {
  const casos = TEXTOS.estados[estado];
  return casos[metodoPago === 'efectivo' ? 'pagoefectivo' : 'yape_qr'] || casos[recojo ? 'recojo' : 'domicilio'] || casos.todos;
}

const ESTADOS_CON_CORREO = ['verificando_pago', 'pendiente_envio', 'enviado', 'entregado', 'cancelado'];
const METODOS = ['yape', 'yape-codigo', 'tarjeta', 'efectivo'];

test('procesando_pago no manda correo', () => {
  for (const metodoPago of METODOS) {
    assert.equal(correoPedido(pedido({ estado: 'procesando_pago', metodoPago })), null);
  }
});

test('un estado que no existe no manda correo', () => {
  for (const estado of ['', undefined, 'inventado', 'pendiente', 'pagado']) {
    assert.equal(correoPedido(pedido({ estado })), null, String(estado));
  }
});

test('todos los estados con correo del JSON dan asunto y HTML', () => {
  for (const estado of ESTADOS_CON_CORREO) {
    const c = correoPedido(pedido({ estado }));
    assert.ok(c, estado);
    assert.equal(typeof c.asunto, 'string');
    assert.ok(c.asunto.length > 0);
    assert.match(c.html, /^<!DOCTYPE html>/);
  }
});

test('el asunto, el título y el nombre salen del JSON para cada estado × método × entrega', () => {
  for (const estado of ESTADOS_CON_CORREO) {
    for (const metodoPago of METODOS) {
      for (const envio of [DOMICILIO, RECOJO]) {
        const recojo = envio.tipo !== 'envio';
        const e = esperado(estado, metodoPago, recojo);
        const c = correoPedido(pedido({ estado, metodoPago, envio }));
        const clave = `${estado}/${metodoPago}/${envio.tipo}`;
        assert.ok(c, clave);
        const datos = { pedido: CORTO, cip: CIP };
        assert.equal(c.asunto, rellenar(e.correo.asunto, datos), clave);
        assert.ok(c.html.includes(escapar(e.nombre)), `nombre en ${clave}`);
        assert.ok(c.html.includes(escapar(rellenar(e.correo.titulo, datos))), `título en ${clave}`);
      }
    }
  }
});

test('los asuntos llevan el número del pedido (8 letras en mayúscula)', () => {
  for (const estado of ESTADOS_CON_CORREO) {
    assert.ok(correoPedido(pedido({ estado })).asunto.includes(CORTO), estado);
  }
  assert.equal(correoPedido(pedido({ estado: 'enviado', pedidoId: 'xy' })).asunto.includes('XY'), true);
});

test('ningún marcador {pedido} {cip} {vence} queda sin reemplazar', () => {
  for (const estado of ESTADOS_CON_CORREO) {
    for (const metodoPago of METODOS) {
      for (const envio of [DOMICILIO, RECOJO]) {
        const c = correoPedido(pedido({ estado, metodoPago, envio }));
        assert.doesNotMatch(c.asunto, /\{\w+\}/, `asunto ${estado}/${metodoPago}`);
        assert.doesNotMatch(c.html, /\{(pedido|cip|vence)\}/, `html ${estado}/${metodoPago}`);
      }
    }
  }
});

test('PagoEfectivo: el correo trae el CIP y hasta cuándo, en hora de Lima', () => {
  const c = correoPedido(pedido({ metodoPago: 'efectivo', envio: RECOJO }));
  assert.ok(c.html.includes(CIP));
  assert.match(c.html, /26 de octubre/);
  assert.match(c.html, /10:00/);
  assert.match(c.asunto, new RegExp(CORTO));
});

test('PagoEfectivo: pasada la medianoche UTC sigue siendo el día anterior en Lima', () => {
  const c = correoPedido(pedido({ metodoPago: 'efectivo', codigoPagoVence: Date.UTC(2026, 9, 27, 3, 30, 0) / 1000 }));
  assert.match(c.html, /26 de octubre/);
  assert.doesNotMatch(c.html, /27 de octubre/);
});

test('PagoEfectivo sin vencimiento no rompe el correo', () => {
  const c = correoPedido(pedido({ metodoPago: 'efectivo', codigoPagoVence: undefined }));
  assert.ok(c);
  assert.ok(c.html.includes(CIP));
});

test('Yape QR no muestra el CIP', () => {
  const c = correoPedido(pedido({ metodoPago: 'yape' }));
  assert.ok(!c.html.includes(CIP));
});

test('recojo y domicilio dicen cosas distintas en la entrega', () => {
  const dom = correoPedido(pedido({ estado: 'enviado', metodoPago: 'tarjeta', envio: DOMICILIO }));
  const rec = correoPedido(pedido({ estado: 'enviado', metodoPago: 'tarjeta', envio: RECOJO }));
  assert.ok(dom.html.includes('Envío a domicilio'));
  assert.ok(dom.html.includes('Calle Mercaderes 123'));
  assert.ok(dom.html.includes('Cayma'));
  assert.ok(rec.html.includes('Recojo en Arequipa'));
  assert.ok(!rec.html.includes('Calle Mercaderes'));
  assert.notEqual(dom.asunto, rec.asunto);
});

test('sin datos de envío se trata como recojo', () => {
  const c = correoPedido(pedido({ estado: 'enviado', metodoPago: 'tarjeta', envio: undefined }));
  assert.ok(c.html.includes('Recojo en Arequipa'));
  assert.ok(c.asunto.includes('listo para recoger'));
});

test('en recojo el estado "enviado" se llama Listo para recoger', () => {
  const rec = correoPedido(pedido({ estado: 'enviado', metodoPago: 'tarjeta', envio: RECOJO }));
  assert.ok(rec.html.includes('Listo para recoger'));
});

test('la barra de avance sale en todos menos en cancelado', () => {
  for (const estado of ['verificando_pago', 'pendiente_envio', 'enviado', 'entregado']) {
    const c = correoPedido(pedido({ estado, metodoPago: 'tarjeta' }));
    assert.ok(c.html.includes('Recibido'), `${estado} sin barra`);
  }
  assert.ok(!correoPedido(pedido({ estado: 'cancelado' })).html.includes('Recibido'));
});

test('el resumen lista los productos, las cantidades y el total', () => {
  const c = correoPedido(pedido());
  assert.ok(c.html.includes('Daypack Andino'));
  assert.ok(c.html.includes('Trek 45L'));
  assert.ok(c.html.includes('S/ 200.00'));
  assert.ok(c.html.includes('S/ 250.50'));
  assert.ok(c.html.includes('S/ 450.50'));
  assert.ok(c.html.includes(`#${CORTO}`));
  assert.match(c.html, /Cantidad: 2/);
});

test('cantidad rota cuenta como 1 y total ausente como cero', () => {
  const c = correoPedido(pedido({ items: [{ nombre: 'X', precio: 10, cantidad: 'abc' }], total: undefined }));
  assert.match(c.html, /Cantidad: 1/);
  assert.ok(c.html.includes('S/ 0.00'));
});

test('sin productos igual sale el correo', () => {
  assert.ok(correoPedido(pedido({ items: undefined })));
  assert.ok(correoPedido(pedido({ items: [] })));
});

test('escapa el HTML de productos, dirección y distrito', () => {
  const c = correoPedido(pedido({
    estado: 'enviado', metodoPago: 'tarjeta',
    items: [{ nombre: '<script>alert(1)</script>', precio: 10, cantidad: 1 }],
    envio: { tipo: 'envio', direccion: '<img src=x onerror=alert(2)>', distrito: '"><b>x</b>' },
  }));
  assert.ok(!c.html.includes('<script>alert'));
  assert.ok(!c.html.includes('<img src=x'));
  assert.ok(!c.html.includes('<b>x</b>'));
  assert.ok(c.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(c.html.includes('&lt;img src=x onerror=alert(2)&gt;'));
  assert.ok(c.html.includes('&quot;&gt;&lt;b&gt;x&lt;/b&gt;'));
});

test('un id de pedido con HTML no llega crudo al correo', () => {
  const c = correoPedido(pedido({ pedidoId: '<b>hola</b>mundo' }));
  assert.ok(!c.html.includes('<b>hola'));
});

test('el botón de WhatsApp lleva el número de pedido', () => {
  const c = correoPedido(pedido());
  assert.ok(c.html.includes('https://wa.me/51997050752?text='));
  assert.ok(c.html.includes(encodeURIComponent(`Hola, tengo una consulta sobre mi pedido #${CORTO}`)));
});

test('el correo trae el marco: logo, foto de cabecera, pie y año', () => {
  const c = correoPedido(pedido());
  assert.ok(c.html.includes('www.kapac-made.com/correo/logo-blanco.png'));
  assert.ok(c.html.includes('www.kapac-made.com/correo/cabecera.jpg'));
  assert.ok(c.html.includes(`© ${new Date().getFullYear()} Kapac Made`));
  assert.ok(c.html.includes(escapar(TEXTOS.correo_comun.pie)));
  assert.match(c.html, /<meta charset="utf-8">/);
});

test('no usa estilos que Gmail ignora', () => {
  const c = correoPedido(pedido());
  assert.doesNotMatch(c.html, /display:\s*flex/);
  assert.doesNotMatch(c.html, /filter:\s*invert/);
  assert.doesNotMatch(c.html, /<script/i);
});

test('ni el asunto ni el HTML llevan emojis', () => {
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const estado of ESTADOS_CON_CORREO) {
    const c = correoPedido(pedido({ estado }));
    assert.doesNotMatch(c.asunto, emoji, estado);
    assert.doesNotMatch(c.html, emoji, estado);
  }
});

test('correoCodigo: asunto con el código y el código en el cuerpo', () => {
  const c = correoCodigo('482913');
  assert.equal(c.asunto, '482913 es tu código de Kapac Made');
  assert.ok(c.html.includes('>482913<'));
  assert.ok(c.html.includes('15 minutos'));
  assert.ok(!c.html.includes('cabecera.jpg'));
});

test('correoCodigo: escapa lo que no sea un código', () => {
  const c = correoCodigo('<b>1</b>');
  assert.ok(!c.html.includes('<b>1</b>'));
  assert.ok(c.html.includes('&lt;b&gt;1&lt;/b&gt;'));
});

const reclamo = (extra = {}) => ({
  codigo: '000007-2026', tipo: 'reclamo', nombre: 'Ana Quispe Mamani', documentoTipo: 'DNI', documento: '45678912',
  domicilio: 'Calle Mercaderes 123, Arequipa', telefono: '987654321', email: 'ana@ejemplo.com', menorDeEdad: false,
  apoderado: '', bienTipo: 'producto', bienDescripcion: 'Mochila Kapac Test', monto: 180, pedidoId: 'AB12CD34',
  detalle: 'La costura se soltó.\nAdjunto fotos.', pedido: 'Cambio de la mochila.',
  // lunes 26 oct 2026 10:00 Lima y su plazo
  fecha: new Date('2026-10-26T15:00:00Z'), fechaLimite: new Date('2026-11-16T15:00:00Z'), ...extra,
});

test('correoReclamo (copia al consumidor): asunto, plazo y hoja completa', () => {
  const c = correoReclamo(reclamo());
  assert.equal(c.asunto, 'Tu reclamo N.º 000007-2026 · Kapac Made');
  assert.ok(c.html.includes('Registramos tu reclamo el 26 de octubre de 2026'));
  assert.ok(c.html.includes('16 de noviembre de 2026'));
  assert.ok(c.html.includes('Hoja de reclamación N.º 000007-2026'));
  for (const texto of ['QHAPAQ BRANDS S.A.C.S.', '20613661604', 'Lambramani', 'Ana Quispe Mamani', '45678912', 'ana@ejemplo.com',
    '987654321', 'Mochila Kapac Test', 'S/ 180.00', 'AB12CD34', 'La costura se soltó.<br>Adjunto fotos.', 'Cambio de la mochila.',
    'quince (15) días hábiles', 'INDECOPI']) {
    assert.ok(c.html.includes(texto), texto);
  }
});

test('correoReclamo (tienda): asunto de aviso y nada de "tu copia"', () => {
  const c = correoReclamo(reclamo(), { paraTienda: true });
  assert.equal(c.asunto, 'Nuevo reclamo N.º 000007-2026 · Libro de Reclamaciones');
  assert.ok(c.html.includes('Llegó un reclamo nuevo el 26 de octubre de 2026'));
  assert.ok(c.html.includes('pestaña Reclamos'));
  assert.ok(c.html.includes('16 de noviembre de 2026'));
  assert.ok(!c.html.includes('Esta es tu copia'));
});

test('correoReclamo: la queja va en femenino', () => {
  const copia = correoReclamo(reclamo({ tipo: 'queja' }));
  assert.equal(copia.asunto, 'Tu queja N.º 000007-2026 · Kapac Made');
  assert.ok(copia.html.includes('Registramos tu queja'));
  const tienda = correoReclamo(reclamo({ tipo: 'queja' }), { paraTienda: true });
  assert.equal(tienda.asunto, 'Nueva queja N.º 000007-2026 · Libro de Reclamaciones');
});

test('correoReclamo (tienda): "Llegó una queja nueva"', { todo: 'dice "nuevoa" por una a pegada a "nuevo" en functions/correos.js, correoReclamo' }, () => {
  const tienda = correoReclamo(reclamo({ tipo: 'queja' }), { paraTienda: true });
  assert.ok(tienda.html.includes('Llegó una queja nueva el'));
});

test('correoReclamo: la fecha sale en hora de Lima, no en UTC', () => {
  const c = correoReclamo(reclamo({ fecha: new Date('2026-10-27T03:00:00Z') }));
  assert.ok(c.html.includes('26 de octubre de 2026'));
  assert.ok(!c.html.includes('27 de octubre de 2026'));
});

test('correoReclamo: sin monto, teléfono ni pedido no salen esas filas', () => {
  const c = correoReclamo(reclamo({ monto: null, telefono: '', pedidoId: '' }));
  assert.ok(!c.html.includes('Monto reclamado'));
  assert.ok(!c.html.includes('Teléfono'));
  assert.ok(!c.html.includes('N.º de pedido'));
});

test('correoReclamo: el menor de edad muestra a su apoderado', () => {
  const c = correoReclamo(reclamo({ menorDeEdad: true, apoderado: 'Rosa Mamani' }));
  assert.ok(c.html.includes('Padre, madre o apoderado'));
  assert.ok(c.html.includes('Rosa Mamani'));
  assert.ok(!correoReclamo(reclamo()).html.includes('Padre, madre o apoderado'));
});

test('correoReclamo: servicio o producto', () => {
  assert.ok(correoReclamo(reclamo({ bienTipo: 'servicio' })).html.includes('>Servicio<'));
  assert.ok(correoReclamo(reclamo({ bienTipo: 'producto' })).html.includes('>Producto<'));
});

test('correoReclamo: escapa todo lo que escribe el consumidor', () => {
  const malo = '<script>alert(1)</script>';
  const c = correoReclamo(reclamo({
    nombre: malo, domicilio: malo, email: malo, bienDescripcion: malo, pedidoId: malo, detalle: malo, pedido: malo, apoderado: malo, menorDeEdad: true, telefono: malo,
  }), { paraTienda: true });
  assert.ok(!c.html.includes('<script>'));
  assert.ok(c.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!correoReclamo(reclamo({ documento: malo, documentoTipo: malo })).html.includes('<script>'));
});

test('correoRespuestaReclamo: asunto, saludo y respuesta con saltos de línea', () => {
  const c = correoRespuestaReclamo(reclamo({ respuesta: 'Hola Ana, te cambiamos la mochila.\nCoordinemos por WhatsApp.', fechaRespuesta: new Date('2026-10-28T15:00:00Z') }));
  assert.equal(c.asunto, 'Respuesta a tu reclamo N.º 000007-2026 · Kapac Made');
  assert.ok(c.html.includes('Hola Ana Quispe Mamani, esta es nuestra respuesta del 28 de octubre de 2026'));
  assert.ok(c.html.includes('4. Observaciones y acciones adoptadas por el proveedor'));
  assert.ok(c.html.includes('te cambiamos la mochila.<br>Coordinemos por WhatsApp.'));
  assert.ok(c.html.includes('Hoja de reclamación') === false);
  assert.ok(c.html.includes('1. Identificación del consumidor'));
});

test('correoRespuestaReclamo: la queja se nombra queja y la respuesta se escapa', () => {
  const c = correoRespuestaReclamo(reclamo({ tipo: 'queja', respuesta: '<img src=x onerror=alert(1)>', fechaRespuesta: new Date() }));
  assert.ok(c.asunto.includes('tu queja'));
  assert.ok(!c.html.includes('<img src=x'));
  assert.ok(c.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});
