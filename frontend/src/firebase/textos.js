// Textos editables del sitio. Viven en el doc contenido/textos como un mapa { clave: valor }.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const REF = () => doc(db, 'contenido', 'textos');

// Si Firestore no responde, falla (y se quedan los textos de la visita anterior).
export async function obtenerTextos() {
  const snap = await getDoc(REF());
  return snap.exists() ? (snap.data() || {}) : {};
}

export async function guardarTexto(clave, valor) {
  await setDoc(REF(), { [clave]: valor }, { merge: true });
}
