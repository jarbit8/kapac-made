// Servicio de productos - Firestore
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from './config';

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
