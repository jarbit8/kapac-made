// Textos editables del sitio. Viven en el doc contenido/textos como un mapa { clave: valor }.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const REF = () => doc(db, 'contenido', 'textos');

export async function obtenerTextos() {
  try {
    const snap = await getDoc(REF());
    return snap.exists() ? (snap.data() || {}) : {};
  } catch (e) {
    return {};
  }
}

export async function guardarTexto(clave, valor) {
  await setDoc(REF(), { [clave]: valor }, { merge: true });
}
