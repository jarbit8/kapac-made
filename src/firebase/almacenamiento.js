// Subida de imágenes a Firebase Storage (solo la usa el admin)
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

// Borra un archivo de Storage dado su URL de descarga. Ignora URLs externas.
export async function borrarMedia(url) {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const ruta = decodeURIComponent(url.split('/o/')[1]?.split('?')[0] || '');
    if (ruta) await deleteObject(ref(storage, ruta));
  } catch (_) {}
}

// Sube un archivo y devuelve su URL pública.
// carpeta: 'productos' | 'home' | 'galeria'
export async function subirImagen(file, carpeta = 'varios') {
  if (!file) throw new Error('Sin archivo');
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen');
  if (file.size > 20 * 1024 * 1024) throw new Error('La imagen supera los 20 MB');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const refArchivo = ref(storage, nombre);
  await uploadBytes(refArchivo, file);
  return getDownloadURL(refArchivo);
}

// Sube imagen O video (para fondos). Devuelve { tipo, url }.
export async function subirMedia(file, carpeta = 'fondos') {
  if (!file) throw new Error('Sin archivo');
  const esImagen = file.type.startsWith('image/');
  const esVideo = file.type.startsWith('video/');
  if (!esImagen && !esVideo) throw new Error('Debe ser una imagen o un video');
  if (file.size > 50 * 1024 * 1024) throw new Error('El archivo supera los 50 MB');

  const ext = (file.name.split('.').pop() || (esVideo ? 'mp4' : 'jpg')).toLowerCase();
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const refArchivo = ref(storage, nombre);
  await uploadBytes(refArchivo, file);
  const url = await getDownloadURL(refArchivo);
  return { tipo: esVideo ? 'video' : 'imagen', url };
}
