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

// Las fotos se bajan de tamaño y se pasan a WebP antes de subir. Las de pantalla completa
// (fondos y zone) conservan más resolución; el resto sale a 1600 px.
// Si el navegador no sabe hacer WebP o no se gana nada, se sube el archivo original.
const LIMITES = {
  pantalla: { lado: 3072, calidad: 0.9, kb: 900 },
  normal: { lado: 1600, calidad: 0.82, kb: 400 },
};
async function optimizar(file, carpeta) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const { lado, calidad, kb } = LIMITES[carpeta === 'fondos' || carpeta === 'zone' ? 'pantalla' : 'normal'];
  let img;
  try { img = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { return file; }
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  if (escala === 1 && file.size < kb * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', calidad));
  if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
}

// Los nombres llevan la fecha, así que el archivo nunca cambia: se puede cachear para siempre
const cacheo = (file) => ({ contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' });

// Sube un archivo y devuelve su URL pública.
// carpeta: 'productos' | 'home' | 'galeria'
export async function subirImagen(file, carpeta = 'varios') {
  if (!file) throw new Error('Sin archivo');
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen');
  if (file.size > 20 * 1024 * 1024) throw new Error('La imagen supera los 20 MB');
  file = await optimizar(file, carpeta);

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const refArchivo = ref(storage, nombre);
  await uploadBytes(refArchivo, file, cacheo(file));
  return getDownloadURL(refArchivo);
}

// Sube imagen O video (para fondos). Devuelve { tipo, url }.
export async function subirMedia(file, carpeta = 'fondos') {
  if (!file) throw new Error('Sin archivo');
  const esImagen = file.type.startsWith('image/');
  const esVideo = file.type.startsWith('video/');
  if (!esImagen && !esVideo) throw new Error('Debe ser una imagen o un video');
  if (file.size > 50 * 1024 * 1024) throw new Error('El archivo supera los 50 MB');
  if (esImagen) file = await optimizar(file, carpeta);

  const ext = (file.name.split('.').pop() || (esVideo ? 'mp4' : 'jpg')).toLowerCase();
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const refArchivo = ref(storage, nombre);
  await uploadBytes(refArchivo, file, cacheo(file));
  const url = await getDownloadURL(refArchivo);
  return { tipo: esVideo ? 'video' : 'imagen', url };
}
