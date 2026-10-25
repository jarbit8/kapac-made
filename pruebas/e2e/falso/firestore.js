// Firestore falso para las pruebas de punta a punta. Reemplaza a 'firebase/firestore' en la
// copia de prueba: los datos salen de semilla.json (+ window.__datos de cada prueba) y todo lo
// que escribe la página queda en localStorage (sobrevive a recargas) y en un registro que las
// pruebas leen. Nunca sale a la red.
import semilla from './semilla.json';

const CLAVE = '__fs';
const ADMINS = ['jarb2299@gmail.com', 'cristhiandccapa@gmail.com'];

class Marca {
  constructor(ms) { this.ms = ms; this.seconds = Math.floor(ms / 1000); this.nanoseconds = 0; }
  toDate() { return new Date(this.ms); }
  toMillis() { return this.ms; }
}
const SERVIDOR = { __servidor: true };

// {__hace: horas}, {__seg: segundos desde ahora}, {__dia: dias atrás}, {__ts: ms} -> valores reales
function resolver(v) {
  if (Array.isArray(v)) return v.map(resolver);
  if (v && typeof v === 'object') {
    if ('__hace' in v) return new Marca(Date.now() - v.__hace * 3600000);
    if ('__seg' in v) return Math.floor(Date.now() / 1000) + v.__seg;
    if ('__ts' in v) return new Marca(v.__ts);
    if ('__dia' in v) return new Date(Date.now() - v.__dia * 86400000).toISOString().slice(0, 10);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolver(x)]));
  }
  return v;
}

function serializar(v) {
  if (v instanceof Marca) return { __ts: v.ms };
  if (Array.isArray(v)) return v.map(serializar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializar(x)]));
  return v;
}

const copia = (v) => resolver(serializar(v));

function leerGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (_) { return {}; }
}

// Lo de partida (semilla + lo que pone cada prueba) y, encima, lo escrito: se lee de localStorage
// en cada operación, así una prueba puede cambiar la base mientras la página está abierta.
const base = new Map();
Object.entries(semilla).forEach(([ruta, d]) => base.set(ruta, resolver(d)));
Object.entries(window.__datos || {}).forEach(([ruta, d]) => (d === null ? base.delete(ruta) : base.set(ruta, resolver(d))));
let contador = Date.now();

const obtener = (ruta) => {
  const escrito = leerGuardado().docs || {};
  if (ruta in escrito) return escrito[ruta] === null ? undefined : resolver(escrito[ruta]);
  return base.get(ruta);
};

const rutasDe = (prefijo) => {
  const escrito = leerGuardado().docs || {};
  return [...new Set([...base.keys(), ...Object.keys(escrito)])]
    .filter((r) => r.startsWith(prefijo) && !r.slice(prefijo.length).includes('/') && obtener(r) !== undefined);
};

function persistir(ruta, d, tipo, datos) {
  const guardado = leerGuardado();
  guardado.docs = guardado.docs || {};
  guardado.docs[ruta] = d === null ? null : serializar(d);
  guardado.registro = [...(guardado.registro || []), { tipo, ruta, datos: serializar(datos) }];
  try { localStorage.setItem(CLAVE, JSON.stringify(guardado)); } catch (_) {}
}

function usuario() {
  try { return JSON.parse(localStorage.getItem('__user')); } catch (_) { return null; }
}
const esAdmin = (u) => !!u && ADMINS.includes(String(u.email || '').toLowerCase());

const error = (code, mensaje) => Object.assign(new Error(mensaje || code), { code });

// ─── Reglas: lo justo para que la página no mande lo que el servidor rechazaría ──────────────
const CLAVES_PEDIDO = ['usuarioId', 'email', 'nombre', 'items', 'total', 'estado', 'metodoPago', 'envio', 'esInvitado', 'fecha'];
const CLAVES_VISITA = ['fecha', 'dia', 'ruta', 'sesionId', 'entrada', 'email', 'uid', 'pais', 'ciudad', 'dispositivo', 'navegador'];
const hasOnly = (obj, claves) => Object.keys(obj).every((k) => claves.includes(k));

function cambios(antes, despues) {
  return Object.keys({ ...antes, ...despues }).filter((k) => JSON.stringify(serializar(antes[k])) !== JSON.stringify(serializar(despues[k])));
}

function permitido(op, ruta, antes, despues) {
  const u = usuario();
  const [coleccion, id] = ruta.split('/');
  const admin = esAdmin(u);
  switch (coleccion) {
    case 'productos': return op === 'leer' || admin;
    case 'contenido': return op === 'leer' || admin;
    case 'pedidos':
      if (op === 'leer') return !!u && (admin || (antes && antes.usuarioId === u.uid));
      if (op === 'crear') {
        return !!u && hasOnly(despues, CLAVES_PEDIDO) && despues.usuarioId === u.uid && typeof despues.total === 'number'
          && despues.total >= 0 && Array.isArray(despues.items) && despues.items.length <= 50 && despues.estado === 'procesando_pago';
      }
      if (op === 'actualizar') {
        if (admin) return true;
        if (!u || !antes || antes.usuarioId !== u.uid) return false;
        const c = cambios(antes, despues);
        return hasOnly(Object.fromEntries(c.map((k) => [k, 1])), ['estado', 'canalNotificacion', 'email'])
          && (despues.estado === antes.estado || (antes.estado === 'procesando_pago' && despues.estado === 'verificando_pago'))
          && (despues.email === antes.email || !antes.email)
          && [undefined, null, 'email'].includes(despues.canalNotificacion);
      }
      return admin;
    case 'usuarios':
    case 'carritos': return !!u && u.uid === id;
    case 'visitas':
      if (op === 'leer') return admin;
      if (op === 'crear') return hasOnly(despues, CLAVES_VISITA) && (!despues.email || (!!u && u.email === despues.email)) && (!despues.uid || (!!u && u.uid === despues.uid));
      return false;
    case 'reclamos':
      if (op === 'leer') return admin;
      if (op === 'actualizar') {
        const c = cambios(antes, despues);
        return admin && hasOnly(Object.fromEntries(c.map((k) => [k, 1])), ['respuesta', 'fechaRespuesta', 'estado'])
          && antes.estado === 'pendiente' && despues.estado === 'respondido' && typeof despues.respuesta === 'string' && despues.respuesta.length > 0;
      }
      return false;
    default: return false;
  }
}

function comprobar(op, ruta, antes, despues) {
  if (!permitido(op, ruta, antes, despues)) throw error('permission-denied', `Missing or insufficient permissions (${op} ${ruta})`);
}

// ─── Fallos simulados: window.__firestore = 'caido' (todo falla), 'colgado' (todo se queda esperando)
// o 'lee_colgado' (solo las lecturas se quedan esperando); window.__fallarEscrituras = true rechaza las escrituras ──
async function lecturaPosible() {
  const modo = window.__firestore;
  if (modo === 'colgado' || modo === 'lee_colgado') return new Promise(() => {});
  if (modo === 'caido') { await new Promise((r) => setTimeout(r, 40)); throw error('unavailable', 'Failed to get document because the client is offline.'); }
  await new Promise((r) => setTimeout(r, 15));
  return undefined;
}

async function escrituraPosible() {
  const modo = window.__firestore;
  if (modo === 'colgado') return new Promise(() => {});
  if (modo === 'caido' || window.__fallarEscrituras) { await new Promise((r) => setTimeout(r, 40)); throw error('unavailable', 'Escritura rechazada en la prueba'); }
  await new Promise((r) => setTimeout(r, 15));
  return undefined;
}

// ─── API ─────────────────────────────────────────────────────────────────────────────────────
export const getFirestore = () => ({ falso: true });
export const collection = (_db, ...partes) => ({ tipo: 'coleccion', ruta: partes.join('/') });
export const doc = (base, ...partes) => {
  const ruta = base && base.tipo === 'coleccion' ? [base.ruta, ...(partes.length ? partes : [`auto${++contador}`])].join('/') : partes.join('/');
  return { tipo: 'doc', ruta, id: ruta.split('/').pop() };
};
export const serverTimestamp = () => SERVIDOR;

const instantanea = (ruta) => {
  const d = obtener(ruta);
  const ref = { tipo: 'doc', ruta, id: ruta.split('/').pop() };
  return { id: ref.id, ref, exists: () => d !== undefined, data: () => (d === undefined ? undefined : copia(d)) };
};

function sellar(datos) {
  const salida = {};
  Object.entries(datos).forEach(([k, v]) => {
    salida[k] = v === SERVIDOR ? new Marca(Date.now()) : (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Marca) ? sellar(v) : v);
  });
  return salida;
}

function guardarDoc(ruta, d, tipo, datosOriginales) {
  persistir(ruta, d, tipo, datosOriginales === undefined ? d : datosOriginales);
}

export async function getDoc(ref) {
  await lecturaPosible();
  const d = obtener(ref.ruta);
  comprobar('leer', ref.ruta, d, undefined);
  return instantanea(ref.ruta);
}

export async function getDocs(consulta) {
  await lecturaPosible();
  const base = consulta.tipo === 'consulta' ? consulta : { ...consulta, filtros: [], orden: [], tope: Infinity };
  const prefijo = `${base.ruta}/`;
  let lista = rutasDe(prefijo);
  const u = usuario();
  const filtraPorDueno = base.filtros.some((f) => f.campo === 'usuarioId' && f.op === '==' && u && f.valor === u.uid);
  if (!esAdmin(u) && !(base.ruta === 'pedidos' && filtraPorDueno)) {
    if (['pedidos', 'visitas', 'reclamos'].includes(base.ruta)) throw error('permission-denied', `Missing or insufficient permissions (listar ${base.ruta})`);
  }
  base.filtros.forEach(({ campo, op, valor }) => {
    lista = lista.filter((r) => {
      const v = obtener(r)[campo];
      if (op === '==') return v === valor;
      if (op === '!=') return v !== valor;
      if (op === '<') return v < valor;
      if (op === '<=') return v <= valor;
      if (op === '>') return v > valor;
      if (op === '>=') return v >= valor;
      if (op === 'in') return valor.includes(v);
      if (op === 'array-contains') return Array.isArray(v) && v.includes(valor);
      return true;
    });
  });
  const valorDe = (r, campo) => { const v = obtener(r)[campo]; return v instanceof Marca ? v.ms : v; };
  base.orden.slice().reverse().forEach(({ campo, dir }) => {
    lista.sort((a, b) => {
      const x = valorDe(a, campo); const y = valorDe(b, campo);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return dir === 'desc' ? -c : c;
    });
  });
  const elegidos = lista.slice(0, base.tope).map(instantanea);
  return { docs: elegidos, empty: elegidos.length === 0, size: elegidos.length, forEach: (f) => elegidos.forEach(f) };
}

export async function setDoc(ref, datos, opciones = {}) {
  await escrituraPosible();
  const antes = obtener(ref.ruta);
  const nuevo = opciones.merge && antes ? { ...antes, ...sellar(datos) } : sellar(datos);
  comprobar(antes ? 'actualizar' : 'crear', ref.ruta, antes, nuevo);
  guardarDoc(ref.ruta, nuevo, 'set', datos);
}

export async function addDoc(coleccion, datos) {
  await escrituraPosible();
  const ref = doc(coleccion);
  const nuevo = sellar(datos);
  comprobar('crear', ref.ruta, undefined, nuevo);
  guardarDoc(ref.ruta, nuevo, 'add', datos);
  return ref;
}

export async function updateDoc(ref, datos) {
  await escrituraPosible();
  const antes = obtener(ref.ruta);
  if (!antes) throw error('not-found', `No document to update: ${ref.ruta}`);
  const nuevo = { ...antes, ...sellar(datos) };
  comprobar('actualizar', ref.ruta, antes, nuevo);
  guardarDoc(ref.ruta, nuevo, 'update', datos);
}

export async function deleteDoc(ref) {
  await escrituraPosible();
  const antes = obtener(ref.ruta);
  comprobar('borrar', ref.ruta, antes, undefined);
  guardarDoc(ref.ruta, null, 'delete', {});
}

export const where = (campo, op, valor) => ({ clase: 'where', campo, op, valor });
export const orderBy = (campo, dir = 'asc') => ({ clase: 'orderBy', campo, dir });
export const limit = (n) => ({ clase: 'limit', n });
export const query = (coleccion, ...restricciones) => ({
  tipo: 'consulta',
  ruta: coleccion.ruta,
  filtros: restricciones.filter((r) => r.clase === 'where'),
  orden: restricciones.filter((r) => r.clase === 'orderBy'),
  tope: restricciones.filter((r) => r.clase === 'limit').reduce((_, r) => r.n, Infinity),
});

export const Timestamp = { now: () => new Marca(Date.now()), fromDate: (d) => new Marca(d.getTime()) };
