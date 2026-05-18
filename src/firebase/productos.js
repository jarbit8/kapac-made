// Servicio de productos - Firestore
import { collection, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
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

// Agregar un producto (uso interno / admin / seed)
export async function agregarProducto(producto) {
  const ref = await addDoc(collection(db, COLECCION), producto);
  return ref.id;
}
