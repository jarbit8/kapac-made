const test = require('node:test');
const assert = require('node:assert/strict');
const { correoValido, ipCliente, nombreCulqi, ordenDelAviso, leerReclamo, sumarDiasHabiles } = require('../lib/validar');

const RELLENO = 'pedidos@kapac-made.com';

test('correoValido: devuelve el primer correo bueno de la lista', () => {
  assert.equal(correoValido('ana@ejemplo.com', 'luis@ejemplo.com'), 'ana@ejemplo.com');
  assert.equal(correoValido(null, 'luis@ejemplo.com'), 'luis@ejemplo.com');
  assert.equal(correoValido('null', undefined, '  luis@ejemplo.com  '), 'luis@ejemplo.com');
});

test('correoValido: "null", "undefined", vacío y espacios no valen', () => {
  for (const malo of ['null', 'undefined', '', '   ', null, undefined, 0, false]) {
    assert.equal(correoValido(malo), RELLENO, `con ${String(malo)}`);
  }
  assert.equal(correoValido(), RELLENO);
});

test('correoValido: descarta correos mal escritos', () => {
  for (const malo of ['ana', 'ana@', '@x.com', 'ana@x', 'ana @x.com', 'ana@@x.com', 'a b@x.com']) {
    assert.equal(correoValido(malo), RELLENO, malo);
  }
});

test('ipCliente: toma el último valor de x-forwarded-for', () => {
  assert.equal(ipCliente({ headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 203.0.113.9' } }), '203.0.113.9');
  assert.equal(ipCliente({ headers: { 'x-forwarded-for': '203.0.113.9' } }), '203.0.113.9');
});

test('ipCliente: una IP inventada al principio no cambia el resultado', () => {
  const real = ipCliente({ headers: { 'x-forwarded-for': '203.0.113.9' } });
  const falsa = ipCliente({ headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' } });
  assert.equal(falsa, real);
});

test('ipCliente: sin cabecera usa req.ip y si no, "na"', () => {
  assert.equal(ipCliente({ headers: {}, ip: '10.0.0.5' }), '10.0.0.5');
  assert.equal(ipCliente({ headers: {} }), 'na');
  assert.equal(ipCliente({ headers: { 'x-forwarded-for': '' }, ip: '10.0.0.5' }), '10.0.0.5');
});

test('ipCliente: queda saneada a letras, números, punto, dos puntos y guion', () => {
  assert.equal(ipCliente({ headers: { 'x-forwarded-for': '2001:db8::1' } }), '2001:db8::1');
  assert.equal(ipCliente({ headers: { 'x-forwarded-for': 'a/b c?d' } }), 'a_b_c_d');
  assert.match(ipCliente({ headers: { 'x-forwarded-for': '../../etc/passwd' } }), /^[\w.:-]+$/);
});

test('ipCliente: máximo 60 caracteres', () => {
  assert.equal(ipCliente({ headers: { 'x-forwarded-for': '9'.repeat(200) } }).length, 60);
});

test('nombreCulqi: separa nombre y apellido', () => {
  assert.deepEqual(nombreCulqi('Ana Quispe Mamani'), { nombre: 'Ana', apellido: 'Quispe Mamani' });
});

test('nombreCulqi: sin nombre usa Cliente / Kapac', () => {
  assert.deepEqual(nombreCulqi(''), { nombre: 'Cliente', apellido: 'Kapac' });
  assert.deepEqual(nombreCulqi(undefined), { nombre: 'Cliente', apellido: 'Kapac' });
  assert.deepEqual(nombreCulqi('   '), { nombre: 'Cliente', apellido: 'Kapac' });
});

test('nombreCulqi: una sola palabra deja el apellido por defecto', () => {
  assert.deepEqual(nombreCulqi('Ana'), { nombre: 'Ana', apellido: 'Kapac' });
});

test('nombreCulqi: quita números y símbolos y exige al menos 2 letras', () => {
  assert.deepEqual(nombreCulqi('Ana2 Quis#pe'), { nombre: 'Ana', apellido: 'Quispe' });
  const corto = nombreCulqi('A B');
  assert.ok(corto.nombre.length >= 2 && corto.apellido.length >= 2);
  const numeros = nombreCulqi('123 456');
  assert.ok(numeros.nombre.length >= 2 && numeros.apellido.length >= 2);
  assert.match(numeros.nombre + numeros.apellido, /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/);
});

test('nombreCulqi: conserva tildes y eñes', () => {
  assert.deepEqual(nombreCulqi('María Núñez Peña'), { nombre: 'María', apellido: 'Núñez Peña' });
});

test('ordenDelAviso: data como objeto', () => {
  assert.equal(ordenDelAviso({ data: { id: 'ord_123' } }), 'ord_123');
});

test('ordenDelAviso: data como texto JSON (así lo manda Culqi)', () => {
  assert.equal(ordenDelAviso({ data: '{"id":"ord_123","state":"paid"}' }), 'ord_123');
});

test('ordenDelAviso: JSON roto, vacío o sin id da null', () => {
  assert.equal(ordenDelAviso({ data: '{no es json' }), null);
  assert.equal(ordenDelAviso({ data: '' }), null);
  assert.equal(ordenDelAviso({ data: {} }), null);
  assert.equal(ordenDelAviso({}), null);
  assert.equal(ordenDelAviso(undefined), null);
  assert.equal(ordenDelAviso(null), null);
  assert.equal(ordenDelAviso({ data: 'null' }), null);
  assert.equal(ordenDelAviso({ data: '[]' }), null);
});

const reclamo = {
  tipo: 'reclamo', nombre: 'Ana Quispe Mamani', documentoTipo: 'DNI', documento: '45678912',
  domicilio: 'Calle Mercaderes 123, Cercado, Arequipa', telefono: '987654321', email: 'ana@ejemplo.com',
  menorDeEdad: false, apoderado: '', bienTipo: 'producto', bienDescripcion: 'Mochila Kapac Test', monto: 180,
  pedidoId: 'AB12CD34', detalle: 'La costura del tirante se soltó a la semana.\nAdjunto fotos por WhatsApp.',
  pedido: 'Cambio de la mochila o devolución del dinero.', idioma: 'es',
};

test('leerReclamo: un reclamo válido devuelve las 16 claves', () => {
  const r = leerReclamo(reclamo);
  assert.deepEqual(Object.keys(r).sort(), [
    'apoderado', 'bienDescripcion', 'bienTipo', 'detalle', 'documento', 'documentoTipo', 'domicilio',
    'email', 'idioma', 'menorDeEdad', 'monto', 'nombre', 'pedido', 'pedidoId', 'telefono', 'tipo',
  ]);
  assert.equal(r.monto, 180);
  assert.equal(r.tipo, 'reclamo');
});

test('leerReclamo: queja sin monto, sin teléfono y sin pedido', () => {
  const r = leerReclamo({ ...reclamo, tipo: 'queja', monto: null, telefono: '', pedidoId: '' });
  assert.equal(r.tipo, 'queja');
  assert.equal(r.monto, null);
});

test('leerReclamo: el monto vacío o ausente es null', () => {
  assert.equal(leerReclamo({ ...reclamo, monto: '' }).monto, null);
  const { monto, ...sinMonto } = reclamo;
  assert.equal(leerReclamo(sinMonto).monto, null);
});

test('leerReclamo: el monto puede ser 0 o llegar como texto', () => {
  assert.equal(leerReclamo({ ...reclamo, monto: 0 }).monto, 0);
  assert.equal(leerReclamo({ ...reclamo, monto: '180.50' }).monto, 180.5);
});

test('leerReclamo: monto inválido', () => {
  for (const monto of [-5, 'abc', 100001, NaN, Infinity]) {
    assert.equal(leerReclamo({ ...reclamo, monto }), null, String(monto));
  }
});

test('leerReclamo: el menor de edad necesita apoderado', () => {
  assert.equal(leerReclamo({ ...reclamo, menorDeEdad: true, apoderado: '' }), null);
  assert.equal(leerReclamo({ ...reclamo, menorDeEdad: true, apoderado: '1' }), null);
  assert.equal(leerReclamo({ ...reclamo, menorDeEdad: true, apoderado: 'Rosa Mamani' }).apoderado, 'Rosa Mamani');
});

test('leerReclamo: el apoderado se ignora si no es menor', () => {
  assert.equal(leerReclamo({ ...reclamo, menorDeEdad: false, apoderado: 'Rosa Mamani' }).apoderado, '');
});

test('leerReclamo: menorDeEdad solo vale con true exacto', () => {
  assert.equal(leerReclamo({ ...reclamo, menorDeEdad: 'true', apoderado: '' }).menorDeEdad, false);
});

test('leerReclamo: el tipo debe ser reclamo o queja', () => {
  assert.equal(leerReclamo({ ...reclamo, tipo: 'otro' }), null);
  assert.equal(leerReclamo({ ...reclamo, tipo: '' }), null);
});

test('leerReclamo: documentos según su tipo', () => {
  assert.equal(leerReclamo({ ...reclamo, documento: '4567891' }), null); // DNI de 7
  assert.equal(leerReclamo({ ...reclamo, documento: '456789123' }), null); // DNI de 9
  assert.equal(leerReclamo({ ...reclamo, documento: '4567891a' }), null);
  assert.ok(leerReclamo({ ...reclamo, documentoTipo: 'RUC', documento: '20613661604' }));
  assert.equal(leerReclamo({ ...reclamo, documentoTipo: 'RUC', documento: '2061366160' }), null);
  assert.equal(leerReclamo({ ...reclamo, documentoTipo: 'Otro' }), null);
});

test('leerReclamo: CE y pasaporte alfanuméricos, en mayúsculas', () => {
  assert.equal(leerReclamo({ ...reclamo, documentoTipo: 'CE', documento: 'ab12345' }).documento, 'AB12345');
  assert.ok(leerReclamo({ ...reclamo, documentoTipo: 'Pasaporte', documento: 'X1234567' }));
  assert.equal(leerReclamo({ ...reclamo, documentoTipo: 'Pasaporte', documento: 'AB 123' }), null);
  assert.equal(leerReclamo({ ...reclamo, documentoTipo: 'CE', documento: 'ab123' }), null);
});

test('leerReclamo: el correo se normaliza y se valida', () => {
  assert.equal(leerReclamo({ ...reclamo, email: '  ANA@Ejemplo.COM ' }).email, 'ana@ejemplo.com');
  for (const malo of ['ana@', 'ana', 'ana@x', '', 'ana @x.com']) assert.equal(leerReclamo({ ...reclamo, email: malo }), null, malo);
  assert.equal(leerReclamo({ ...reclamo, email: 'a'.repeat(115) + '@x.com' }), null);
});

test('leerReclamo: nombre con al menos 2 letras', () => {
  assert.equal(leerReclamo({ ...reclamo, nombre: '   ' }), null);
  assert.equal(leerReclamo({ ...reclamo, nombre: '1' }), null);
  assert.equal(leerReclamo({ ...reclamo, nombre: '12 34' }), null);
  assert.equal(leerReclamo({ ...reclamo, nombre: 'x'.repeat(121) }), null);
  assert.equal(leerReclamo({ ...reclamo, nombre: '  Ana    Quispe ' }).nombre, 'Ana Quispe');
});

test('leerReclamo: límites de domicilio, teléfono, descripción, pedido y detalle', () => {
  assert.equal(leerReclamo({ ...reclamo, domicilio: 'ab' }), null);
  assert.equal(leerReclamo({ ...reclamo, domicilio: 'x'.repeat(201) }), null);
  assert.equal(leerReclamo({ ...reclamo, telefono: '9'.repeat(21) }), null);
  assert.equal(leerReclamo({ ...reclamo, bienDescripcion: 'ab' }), null);
  assert.equal(leerReclamo({ ...reclamo, bienDescripcion: 'x'.repeat(301) }), null);
  assert.equal(leerReclamo({ ...reclamo, pedidoId: 'x'.repeat(41) }), null);
  assert.equal(leerReclamo({ ...reclamo, detalle: 'mal' }), null);
  assert.equal(leerReclamo({ ...reclamo, detalle: 'x'.repeat(3001) }), null);
  assert.ok(leerReclamo({ ...reclamo, detalle: 'x'.repeat(3000) }));
  assert.equal(leerReclamo({ ...reclamo, pedido: 'ab' }), null);
  assert.equal(leerReclamo({ ...reclamo, pedido: 'x'.repeat(1501) }), null);
});

test('leerReclamo: el producto es el valor por defecto y el servicio se respeta', () => {
  assert.equal(leerReclamo({ ...reclamo, bienTipo: 'lo que sea' }).bienTipo, 'producto');
  assert.equal(leerReclamo({ ...reclamo, bienTipo: 'servicio' }).bienTipo, 'servicio');
});

test('leerReclamo: el idioma es es o en', () => {
  assert.equal(leerReclamo({ ...reclamo, idioma: 'en' }).idioma, 'en');
  assert.equal(leerReclamo({ ...reclamo, idioma: 'fr' }).idioma, 'es');
});

test('leerReclamo: el HTML del detalle se guarda tal cual (se escapa en el correo)', () => {
  const r = leerReclamo({ ...reclamo, detalle: '<script>alert(1)</script> no llegó' });
  assert.equal(r.detalle, '<script>alert(1)</script> no llegó');
});

test('leerReclamo: los saltos de línea se normalizan', () => {
  const r = leerReclamo({ ...reclamo, detalle: 'Primera línea\r\nsegunda\n\n\n\n\ntercera' });
  assert.equal(r.detalle, 'Primera línea\nsegunda\n\ntercera');
});

test('leerReclamo: un cuerpo vacío o con valores nulos se rechaza', () => {
  assert.equal(leerReclamo({}), null);
  assert.equal(leerReclamo({ ...reclamo, detalle: null }), null);
});

test('leerReclamo: un objeto en vez de texto se rechaza', { todo: 'hoy el nombre {a:1} se guarda como "[object Object]" (functions/lib/validar.js, leerReclamo)' }, () => {
  assert.equal(leerReclamo({ ...reclamo, nombre: { a: 1 } }), null);
  assert.equal(leerReclamo({ ...reclamo, bienDescripcion: ['abc', 'def'] }), null);
});

const limaTexto = (fecha) => fecha.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const limaDia = (fecha) => fecha.toLocaleDateString('en-US', { timeZone: 'America/Lima', weekday: 'long' });

test('sumarDiasHabiles: 15 hábiles desde el lunes 26 oct 2026 10:00 Lima es el lunes 16 nov', () => {
  const limite = sumarDiasHabiles(new Date('2026-10-26T15:00:00Z'), 15);
  assert.equal(limaTexto(limite), '2026-11-16');
  assert.equal(limaDia(limite), 'Monday');
});

test('sumarDiasHabiles: desde el viernes 23 oct 22:00 Lima (ya sábado en UTC) es el viernes 13 nov', () => {
  const limite = sumarDiasHabiles(new Date('2026-10-24T03:00:00Z'), 15);
  assert.equal(limaTexto(limite), '2026-11-13');
  assert.equal(limaDia(limite), 'Friday');
});

test('sumarDiasHabiles: cero días deja la misma fecha', () => {
  const d = new Date('2026-10-26T15:00:00Z');
  assert.equal(sumarDiasHabiles(d, 0).getTime(), d.getTime());
});

test('sumarDiasHabiles: un día hábil desde el viernes cae el lunes', () => {
  const limite = sumarDiasHabiles(new Date('2026-10-23T15:00:00Z'), 1);
  assert.equal(limaTexto(limite), '2026-10-26');
});

test('sumarDiasHabiles: no cambia la fecha que recibe', () => {
  const d = new Date('2026-10-26T15:00:00Z');
  sumarDiasHabiles(d, 5);
  assert.equal(d.toISOString(), '2026-10-26T15:00:00.000Z');
});

test('sumarDiasHabiles: nunca cae en sábado ni domingo', () => {
  for (let h = 0; h < 24 * 14; h += 7) {
    const desde = new Date(Date.UTC(2026, 9, 19) + h * 3600 * 1000);
    for (const dias of [1, 5, 15]) {
      const dia = limaDia(sumarDiasHabiles(desde, dias));
      assert.ok(dia !== 'Saturday' && dia !== 'Sunday', `${desde.toISOString()} + ${dias} cae ${dia}`);
    }
  }
});
