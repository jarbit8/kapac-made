// Reseñas de productos — Firestore
// El cliente crea la reseña (queda pendiente); el admin la aprueba desde el panel.
import {
  collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const COLECCION = 'resenas';

// Crear reseña (queda pendiente de aprobación)
export async function crearResena({ productoId, nombre, estrellas, texto }) {
  const limpia = {
    productoId,
    nombre: (nombre || 'Anónimo').trim().slice(0, 40),
    estrellas: Math.min(5, Math.max(1, Number(estrellas) || 5)),
    texto: (texto || '').trim().slice(0, 500),
    aprobada: false,
    fecha: serverTimestamp(),
  };
  if (!limpia.texto) throw new Error('texto vacío');
  const ref = await addDoc(collection(db, COLECCION), limpia);
  return ref.id;
}

// Reseñas aprobadas de un producto (para mostrar en la página)
export async function obtenerResenasProducto(productoId) {
  const q = query(
    collection(db, COLECCION),
    where('productoId', '==', productoId),
    where('aprobada', '==', true),
  );
  const snap = await getDocs(q);
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
  return lista;
}

// TODAS las reseñas (admin)
export async function obtenerTodasResenas() {
  const snap = await getDocs(collection(db, COLECCION));
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
  return lista;
}

export async function aprobarResena(id) {
  await updateDoc(doc(db, COLECCION, id), { aprobada: true });
}

export async function eliminarResena(id) {
  await deleteDoc(doc(db, COLECCION, id));
}

// Promedio de estrellas
export function promedioEstrellas(resenas) {
  if (!resenas.length) return 0;
  return resenas.reduce((s, r) => s + (r.estrellas || 0), 0) / resenas.length;
}
