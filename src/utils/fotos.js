// Las fotos de Storage no se piden por la API de Firebase (tarda 1–2 s en responder):
// - al publicar, scripts/fotos.js copia las que usa el sitio junto a la página y deja el mapa en
//   window.__FOTOS__ = { 'home/123-abc.webp': '/f/home-123-abc.webp', ... };
// - las que se suban después salen directo de Cloud Storage (lectura pública, con caché de Google).
const COPIAS = (typeof window !== 'undefined' && window.__FOTOS__) || {};
const BUCKET = 'https://storage.googleapis.com/kapac-made.firebasestorage.app/';

export function fotoRapida(url) {
  if (!url || typeof url !== 'string' || !url.includes('firebasestorage.googleapis.com')) return url;
  const ruta = decodeURIComponent((url.split('/o/')[1] || '').split('?')[0]);
  if (!ruta) return url;
  return COPIAS[ruta] || BUCKET + encodeURI(ruta);
}
