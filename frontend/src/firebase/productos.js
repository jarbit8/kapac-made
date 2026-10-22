// Servicio de productos - Firestore
// El stock lo descuenta el servidor al confirmarse el pago (Cloud Function):
// las reglas no dejan que un cliente escriba en productos.
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from './config';

const COLECCION = 'productos';

// Los de la visita anterior o, en la primera visita, los que había al publicar
// (scripts/fotos.js): la tienda y la ficha se muestran al instante y se
// actualizan cuando responde Firestore.
const CACHE_KEY = 'kapac_productos_v1';
let productosSesion = (() => {
  try {
    const p = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (p) return p;
  } catch (_) {}
  return window.__CONTENIDO__?.productos || null;
})();
export const productosGuardados = () => productosSesion;

// Tras crear, editar o borrar, la copia guardada se actualiza para que la tienda
// y la ficha muestren el cambio sin esperar a Firestore
function actualizarCopia(cambiar) {
  if (!productosSesion) return;
  productosSesion = cambiar(productosSesion);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(productosSesion)); } catch (_) {}
}

// Obtener TODOS los productos
export async function obtenerProductos() {
  const snapshot = await getDocs(collection(db, COLECCION));
  productosSesion = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(productosSesion)); } catch (_) {}
  return productosSesion;
}

// Obtener UN producto por su ID
export async function obtenerProducto(id) {
  const ref = doc(db, COLECCION, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Agregar un producto (admin)
export async function agregarProducto(producto) {
  const ref = await addDoc(collection(db, COLECCION), producto);
  actualizarCopia((lista) => [...lista, { id: ref.id, ...producto }]);
  return ref.id;
}

// Actualizar un producto (admin)
export async function actualizarProducto(id, datos) {
  await updateDoc(doc(db, COLECCION, id), datos);
  actualizarCopia((lista) => lista.map((p) => (p.id === id ? { ...p, ...datos } : p)));
}

// Eliminar un producto (admin)
export async function eliminarProducto(id) {
  await deleteDoc(doc(db, COLECCION, id));
  actualizarCopia((lista) => lista.filter((p) => p.id !== id));
}
