// Carga functions/index.js con Firebase, Resend y la red simulados: nada sale del equipo.
const Module = require('module');
const path = require('path');
const { crearBase, FieldValue, Timestamp } = require('./base-falsa');

const INDEX = path.join(__dirname, '..', '..', 'index.js');

function cargarIndex({ datos = {} } = {}) {
  const db = crearBase(datos);
  const correos = [];
  const llamadas = [];
  const estado = { errorResend: null, respuestas: [] };

  const decorar = (manejador, opciones) => Object.assign(manejador, { opciones });
  const falsos = {
    'firebase-functions/v2/https': { onRequest: (op, fn) => decorar(fn, op) },
    'firebase-functions/v2/firestore': { onDocumentUpdated: (op, fn) => decorar(fn, op) },
    'firebase-functions/v2/pubsub': { onMessagePublished: (op, fn) => decorar(fn, op) },
    'firebase-functions/params': { defineSecret: (name) => ({ name, value: () => `valor-de-${name}` }) },
    'firebase-admin': {
      initializeApp: () => {},
      firestore: Object.assign(() => db, { FieldValue, Timestamp }),
    },
    resend: {
      Resend: class {
        constructor(clave) { this.clave = clave; }
        get emails() {
          return { send: async (correo) => { correos.push(correo); return { data: { id: 'correo-falso' }, error: estado.errorResend }; } };
        }
      },
    },
  };

  const cargarOriginal = Module._load;
  Module._load = function (pedido, ...resto) {
    if (Object.prototype.hasOwnProperty.call(falsos, pedido)) return falsos[pedido];
    return cargarOriginal.call(this, pedido, ...resto);
  };

  const fetchOriginal = global.fetch;
  global.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), metodo: opciones.method || 'GET', cuerpo: opciones.body ? JSON.parse(opciones.body) : null, cabeceras: opciones.headers || {} });
    const metodo = opciones.method || 'GET';
    const i = estado.respuestas.findIndex((r) => String(url).includes(r.contiene) && (!r.metodo || r.metodo === metodo));
    if (i === -1) throw new Error('Llamada de red no prevista en la prueba: ' + url);
    const { cuerpo, ok = true, estado: codigo = 200, una = false } = estado.respuestas[i];
    if (una) estado.respuestas.splice(i, 1);
    return { ok, status: codigo, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) };
  };

  delete require.cache[INDEX];
  let funciones;
  try {
    funciones = require(INDEX);
  } finally {
    Module._load = cargarOriginal;
  }

  return {
    funciones, db, correos, llamadas, estado,
    // Simula lo que responde la red a una URL (y a un método si se indica); la primera que coincide se repite
    // salvo que se pase { una: true }
    responder: (contiene, cuerpo, extra = {}) => estado.respuestas.push({ contiene, cuerpo, ...extra }),
    restaurar: () => { global.fetch = fetchOriginal; delete require.cache[INDEX]; },
  };
}

// Petición y respuesta de Express mínimas
function peticion({ metodo = 'POST', cuerpo = {}, ip, forwarded } = {}) {
  const cabeceras = {};
  if (forwarded) cabeceras['x-forwarded-for'] = forwarded;
  return { method: metodo, body: cuerpo, headers: cabeceras, ip };
}

function respuesta() {
  const r = {
    codigo: 200, cuerpo: undefined,
    status(c) { r.codigo = c; return r; },
    json(c) { r.cuerpo = c; return r; },
    send(c) { r.cuerpo = c; return r; },
  };
  return r;
}

// Evento de un trigger de actualización de documento
function evento(db, ruta, antes, despues, params = {}) {
  db.poner(ruta, despues);
  const ref = db.collection(ruta.split('/')[0]).doc(ruta.split('/')[1]);
  return {
    params,
    data: { before: { data: () => antes }, after: { data: () => despues, ref } },
  };
}

module.exports = { cargarIndex, peticion, respuesta, evento };
