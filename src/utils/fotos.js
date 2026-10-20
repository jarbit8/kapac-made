// Al publicar, scripts/fotos.js copia las fotos de Storage que usa el sitio junto a la
// página (GitHub Pages responde mucho más rápido que Storage) y deja el mapa en
// window.__FOTOS__ = { 'home/123-abc.webp': '/f/home-123-abc.webp', ... }.
// Una foto subida después de publicar sigue saliendo de Storage hasta la próxima publicación.
const COPIAS = (typeof window !== 'undefined' && window.__FOTOS__) || {};

export function fotoRapida(url) {
  if (!url || typeof url !== 'string' || !url.includes('firebasestorage.googleapis.com')) return url;
  const ruta = decodeURIComponent((url.split('/o/')[1] || '').split('?')[0]);
  return COPIAS[ruta] || url;
}
