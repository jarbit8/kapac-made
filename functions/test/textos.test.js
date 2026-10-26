const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '..');
const ORIGEN = path.join(RAIZ, 'descripcion', 'textos-pedidos.json');
const COPIAS = [
  path.join(RAIZ, 'functions', 'textos-pedidos.json'),
  path.join(RAIZ, 'frontend', 'src', 'config', 'textosPedidos.json'),
];
const TEXTOS = JSON.parse(fs.readFileSync(ORIGEN, 'utf8'));

const ESTADOS = ['procesando_pago', 'verificando_pago', 'pendiente_envio', 'enviado', 'entregado', 'cancelado'];
const MARCADORES = ['pedido', 'cip', 'vence'];

// Todos los casos de todos los estados: [estado, caso, texto]
const casos = Object.entries(TEXTOS.estados).flatMap(([estado, porCaso]) => Object.entries(porCaso).map(([caso, t]) => [estado, caso, t]));

test('las copias de los textos de pedidos son idénticas al original', () => {
  const original = fs.readFileSync(ORIGEN, 'utf8');
  for (const copia of COPIAS) {
    assert.equal(fs.readFileSync(copia, 'utf8'), original, `${path.relative(RAIZ, copia)} no coincide con descripcion/textos-pedidos.json (corre Ver cambios.bat)`);
  }
});

test('están todos los estados del pedido', () => {
  assert.deepEqual(Object.keys(TEXTOS.estados).sort(), [...ESTADOS].sort());
});

test('cada estado cubre todas las combinaciones de método y entrega', () => {
  for (const [estado, porCaso] of Object.entries(TEXTOS.estados)) {
    const llaves = Object.keys(porCaso);
    const cubre = llaves.includes('todos')
      || (llaves.includes('yape_qr') && llaves.includes('pagoefectivo'))
      || (llaves.includes('domicilio') && llaves.includes('recojo'));
    assert.ok(cubre, `${estado} no tiene "todos", ni yape_qr y pagoefectivo, ni domicilio y recojo`);
    for (const llave of llaves) {
      assert.ok(['todos', 'yape_qr', 'pagoefectivo', 'domicilio', 'recojo'].includes(llave), `${estado}: caso desconocido "${llave}"`);
    }
  }
});

test('cada caso trae nombre, título y texto en español e inglés', () => {
  for (const [estado, caso, t] of casos) {
    for (const campo of ['nombre', 'nombre_en', 'pagina_titulo', 'pagina_titulo_en', 'pagina_texto', 'pagina_texto_en']) {
      assert.equal(typeof t[campo], 'string', `${estado}/${caso} sin ${campo}`);
      assert.ok(t[campo].trim().length > 0, `${estado}/${caso}: ${campo} vacío`);
    }
    assert.ok('correo' in t, `${estado}/${caso} sin clave correo`);
  }
});

test('el correo es null o trae asunto, título y mensaje', () => {
  for (const [estado, caso, t] of casos) {
    if (t.correo === null) continue;
    for (const campo of ['asunto', 'titulo', 'mensaje']) {
      assert.equal(typeof t.correo[campo], 'string', `${estado}/${caso} correo sin ${campo}`);
      assert.ok(t.correo[campo].trim().length > 0, `${estado}/${caso}: correo.${campo} vacío`);
    }
  }
});

test('procesando_pago no manda correo y los demás estados sí', () => {
  assert.ok(Object.values(TEXTOS.estados.procesando_pago).every((t) => t.correo === null));
  for (const estado of ESTADOS.filter((e) => e !== 'procesando_pago')) {
    assert.ok(Object.values(TEXTOS.estados[estado]).every((t) => t.correo !== null), estado);
  }
});

test('solo se usan los marcadores {pedido} {cip} {vence}', () => {
  const textos = casos.flatMap(([estado, caso, t]) => [
    ...(t.correo ? Object.values(t.correo).map((v) => [`${estado}/${caso}`, v]) : []),
  ]).concat(Object.entries(TEXTOS.correo_comun).map(([k, v]) => [`correo_comun.${k}`, v]));
  for (const [donde, texto] of textos) {
    for (const [, nombre] of texto.matchAll(/\{(\w*)\}/g)) {
      assert.ok(MARCADORES.includes(nombre), `${donde}: marcador desconocido {${nombre}}`);
    }
    assert.equal((texto.match(/\{/g) || []).length, (texto.match(/\}/g) || []).length, `${donde}: llave sin cerrar`);
  }
});

test('{cip} y {vence} solo aparecen en PagoEfectivo', () => {
  for (const [estado, caso, t] of casos) {
    if (!t.correo || caso === 'pagoefectivo') continue;
    assert.doesNotMatch(JSON.stringify(t.correo), /\{(cip|vence)\}/, `${estado}/${caso}`);
  }
});

test('el correo de PagoEfectivo trae el CIP y el vencimiento', () => {
  const t = TEXTOS.estados.verificando_pago.pagoefectivo;
  assert.match(t.correo.mensaje, /\{cip\}/);
  assert.match(t.correo.mensaje, /\{vence\}/);
});

test('el asunto de todos los correos lleva el número de pedido', () => {
  for (const [estado, caso, t] of casos) {
    if (t.correo) assert.match(t.correo.asunto, /\{pedido\}/, `${estado}/${caso}`);
  }
});

test('las palabras fijas del correo están completas', () => {
  for (const clave of ['paso_recibido', 'resumen', 'cantidad', 'entrega', 'domicilio', 'recojo', 'total', 'boton_whatsapp', 'mensaje_whatsapp', 'pie']) {
    assert.equal(typeof TEXTOS.correo_comun[clave], 'string', clave);
    assert.ok(TEXTOS.correo_comun[clave].trim().length > 0, clave);
  }
  assert.match(TEXTOS.correo_comun.mensaje_whatsapp, /\{pedido\}/);
});

test('ningún texto lleva emojis', () => {
  assert.doesNotMatch(fs.readFileSync(ORIGEN, 'utf8'), /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});
