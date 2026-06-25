// Servicio de productos - Firestore
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, increment,
} from 'firebase/firestore';
import { db } from './config';

// Descontar stock al comprar (no baja de 0)
export async function descontarStock(id, cantidad) {
  try {
    const ref = doc(db, 'productos', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const actual = Number(snap.data().stock || 0);
    const restar = Math.min(cantidad, actual); // nunca negativo
    if (restar > 0) await updateDoc(ref, { stock: increment(-restar) });
  } catch (e) {
    console.warn('No se pudo descontar stock de', id, e?.message);
  }
}

const COLECCION = 'productos';

// Obtener TODOS los productos
export async function obtenerProductos() {
  const snapshot = await getDocs(collection(db, COLECCION));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
  return ref.id;
}

// Actualizar un producto (admin)
export async function actualizarProducto(id, datos) {
  await updateDoc(doc(db, COLECCION, id), datos);
}

// Eliminar un producto (admin)
export async function eliminarProducto(id) {
  await deleteDoc(doc(db, COLECCION, id));
}
