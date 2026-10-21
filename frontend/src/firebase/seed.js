// Datos iniciales de productos + función para subirlos a Firestore (una sola vez)
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './config';

const PRODUCTOS_INICIALES = [
  {
    nombre: 'Kapac Explorer',
    precio: 129,
    precioOriginal: 149,
    moneda: 'S/',
    imagenMochila: 'mochila-1',
    imagenContexto: 'foto-1',
    descripcion: 'Mochila resistente para aventuras urbanas y de montaña.',
    stock: 10,
    activo: true,
  },
  {
    nombre: 'Kapac Atoms',
    precio: 129,
    precioOriginal: 159,
    moneda: 'S/',
    imagenMochila: 'mochila-2',
    imagenContexto: 'foto-2',
    descripcion: 'Diseño minimalista con ilustraciones andinas únicas.',
    stock: 8,
    activo: true,
  },
  {
    nombre: 'Kapac Trail',
    precio: 119,
    precioOriginal: 139,
    moneda: 'S/',
    imagenMochila: 'mochila-3',
    imagenContexto: 'foto-3',
    descripcion: 'Ligera y cómoda para tus rutas diarias.',
    stock: 12,
    activo: true,
  },
  {
    nombre: 'Kapac Summit',
    precio: 149,
    precioOriginal: 169,
    moneda: 'S/',
    imagenMochila: 'mochila-4',
    imagenContexto: 'foto-4',
    descripcion: 'La más amplia, ideal para viajes largos.',
    stock: 6,
    activo: true,
  },
];

// Sube los productos SOLO si la colección está vacía (evita duplicados)
export async function seedProductos() {
  const col = collection(db, 'productos');
  const snap = await getDocs(col);

  if (!snap.empty) {
    return { creados: 0, mensaje: 'Ya existen productos, no se duplicó nada.' };
  }

  const batch = writeBatch(db);
  PRODUCTOS_INICIALES.forEach((p) => {
    const ref = doc(col);
    batch.set(ref, p);
  });
  await batch.commit();

  return { creados: PRODUCTOS_INICIALES.length, mensaje: 'Productos subidos correctamente.' };
}
