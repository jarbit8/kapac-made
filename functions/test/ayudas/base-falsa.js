// Firestore en memoria con lo justo que usan las funciones: doc, get, set, update, create,
// delete, add, where(==), limit, transacciones y los valores especiales (increment, serverTimestamp).
const INCREMENTO = Symbol('increment');
const HORA_SERVIDOR = Symbol('serverTimestamp');

class Marca {
  constructor(fecha) { this.fecha = fecha; }
  toDate() { return this.fecha; }
  static fromDate(fecha) { return new Marca(fecha); }
}

const FieldValue = {
  increment: (n) => ({ [INCREMENTO]: n }),
  serverTimestamp: () => ({ [HORA_SERVIDOR]: true }),
};

const copiar = (v) => {
  if (v instanceof Marca || v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(copiar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copiar(x)]));
  return v;
};

function aplicar(actual, cambios) {
  const nuevo = { ...actual };
  for (const [k, v] of Object.entries(cambios)) {
    if (v && typeof v === 'object' && INCREMENTO in v) nuevo[k] = (Number(nuevo[k]) || 0) + v[INCREMENTO];
    else if (v && typeof v === 'object' && HORA_SERVIDOR in v) nuevo[k] = new Marca(new Date());
    else nuevo[k] = copiar(v);
  }
  return nuevo;
}

function crearBase(inicial = {}) {
  const datos = new Map(); // 'coleccion/id' -> objeto
  const escrituras = []; // [{ tipo, ruta, datos }]
  let contador = 0;

  Object.entries(inicial).forEach(([coleccion, docs]) => {
    Object.entries(docs).forEach(([id, d]) => datos.set(`${coleccion}/${id}`, copiar(d)));
  });

  const instantanea = (ruta, ref) => {
    const d = datos.get(ruta);
    return { exists: d !== undefined, id: ruta.split('/')[1], ref, data: () => (d === undefined ? undefined : copiar(d)) };
  };

  const referencia = (coleccion, id) => {
    const ruta = `${coleccion}/${id}`;
    const ref = {
      id, path: ruta,
      get: async () => instantanea(ruta, ref),
      set: async (d, opciones = {}) => {
        escrituras.push({ tipo: 'set', ruta, datos: d });
        datos.set(ruta, opciones.merge ? aplicar(datos.get(ruta) || {}, d) : aplicar({}, d));
      },
      create: async (d) => {
        if (datos.has(ruta)) throw new Error('ALREADY_EXISTS: ' + ruta);
        escrituras.push({ tipo: 'create', ruta, datos: d });
        datos.set(ruta, aplicar({}, d));
      },
      update: async (d) => {
        if (!datos.has(ruta)) throw new Error('NOT_FOUND: ' + ruta);
        escrituras.push({ tipo: 'update', ruta, datos: d });
        datos.set(ruta, aplicar(datos.get(ruta), d));
      },
      delete: async () => {
        escrituras.push({ tipo: 'delete', ruta });
        datos.delete(ruta);
      },
    };
    return ref;
  };

  const consulta = (coleccion, filtros = [], tope = Infinity) => ({
    where: (campo, op, valor) => {
      if (op !== '==') throw new Error('La base falsa solo entiende ==');
      return consulta(coleccion, [...filtros, [campo, valor]], tope);
    },
    limit: (n) => consulta(coleccion, filtros, n),
    get: async () => {
      const docs = [...datos.keys()]
        .filter((r) => r.startsWith(coleccion + '/'))
        .filter((r) => filtros.every(([campo, valor]) => datos.get(r)[campo] === valor))
        .slice(0, tope)
        .map((r) => instantanea(r, referencia(coleccion, r.split('/')[1])));
      return { empty: docs.length === 0, size: docs.length, docs };
    },
  });

  const coleccion = (nombre) => ({
    doc: (id) => referencia(nombre, id),
    add: async (d) => {
      const id = `auto${++contador}`;
      await referencia(nombre, id).create(d);
      return referencia(nombre, id);
    },
    ...consulta(nombre),
  });

  const db = {
    collection: coleccion,
    runTransaction: async (fn) => {
      const pendientes = [];
      let escribio = false;
      const tx = {
        get: async (ref) => {
          if (escribio) throw new Error('Firestore: las lecturas van antes que las escrituras');
          return ref.get();
        },
        set: (ref, d, o) => { escribio = true; pendientes.push(() => ref.set(d, o)); },
        create: (ref, d) => { escribio = true; pendientes.push(() => ref.create(d)); },
        update: (ref, d) => { escribio = true; pendientes.push(() => ref.update(d)); },
        delete: (ref) => { escribio = true; pendientes.push(() => ref.delete()); },
      };
      const resultado = await fn(tx);
      for (const escribir of pendientes) await escribir();
      return resultado;
    },
    // Para comprobar el resultado sin pasar por la API de Firestore
    leer: (ruta) => (datos.has(ruta) ? copiar(datos.get(ruta)) : undefined),
    poner: (ruta, d) => datos.set(ruta, copiar(d)),
    existe: (ruta) => datos.has(ruta),
    escrituras,
  };
  return db;
}

module.exports = { crearBase, FieldValue, Timestamp: Marca };
