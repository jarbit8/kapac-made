// Libro de Reclamaciones: el registro lo hace una Cloud Function (guarda la hoja y manda
// la copia por correo); el admin lee la colección y responde
import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';

const REGISTRAR_URL = 'https://registrarreclamo-3lp3eiv6xa-uc.a.run.app';
const COLECCION = 'reclamos';

// Errores propios vuelven como `error` (la página los pone en el idioma activo);
// los del servidor, como `mensaje`.
export async function enviarReclamo(datos) {
  try {
    const res = await fetch(REGISTRAR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true, codigo: data.codigo, fecha: data.fecha, fechaLimite: data.fechaLimite };
    return { ok: false, mensaje: data.mensaje };
  } catch (e) {
    return { ok: false, error: 'conexion' };
  }
}

// Solo el admin puede leer (lo exigen las reglas); el código es el id del documento
export async function obtenerReclamos() {
  const snap = await getDocs(query(collection(db, COLECCION), orderBy('fecha', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Las reglas solo dejan escribir estas tres claves
export async function responderReclamo(id, respuesta) {
  await updateDoc(doc(db, COLECCION, id), {
    respuesta,
    fechaRespuesta: serverTimestamp(),
    estado: 'respondido',
  });
}
