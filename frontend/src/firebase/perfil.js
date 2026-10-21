// Servicio de perfil de usuario - Firestore
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const COLECCION = 'usuarios';

// Obtener perfil del usuario
export async function obtenerPerfil(uid) {
  const ref = doc(db, COLECCION, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Crear/actualizar perfil
export async function guardarPerfil(uid, datos) {
  const ref = doc(db, COLECCION, uid);
  await setDoc(ref, datos, { merge: true });
}
