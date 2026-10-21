// Servicio de carritos sincronizados con la cuenta del usuario
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const COLECCION = 'carritos';

/** Lee el carrito guardado del usuario en Firestore */
export async function obtenerCarrito(uid) {
  try {
    const ref = doc(db, COLECCION, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    return snap.data().items || [];
  } catch (e) {
    console.error('Error obteniendo carrito remoto:', e);
    return [];
  }
}

/** Guarda el carrito del usuario en Firestore */
export async function guardarCarrito(uid, items) {
  try {
    const ref = doc(db, COLECCION, uid);
    await setDoc(ref, {
      items,
      actualizadoEn: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error guardando carrito remoto:', e);
  }
}

/** Fusiona dos carritos (local + remoto). Si el mismo id está en ambos, suma cantidades. */
export function fusionarCarritos(carritoA, carritoB) {
  const mapa = new Map();
  [...carritoA, ...carritoB].forEach((item) => {
    if (!item || !item.id) return;
    const existente = mapa.get(item.id);
    if (existente) {
      // Si ya existe, tomar la mayor cantidad (no sumar para no inflar accidentalmente)
      mapa.set(item.id, {
        ...existente,
        cantidad: Math.max(existente.cantidad || 1, item.cantidad || 1),
      });
    } else {
      mapa.set(item.id, { ...item, cantidad: item.cantidad || 1 });
    }
  });
  return Array.from(mapa.values());
}
