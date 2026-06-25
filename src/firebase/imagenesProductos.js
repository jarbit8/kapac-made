// Mapa de imágenes locales (las fotos viven en assets, Firestore guarda solo la "clave")
import mochila1 from '../assets/images/mochila 1.png';
import mochila2 from '../assets/images/mochila 2.png';
import gonzalo  from '../assets/images/gonzalo.jpeg';
import gonzalo2 from '../assets/images/gonzalo2.jpeg';
import foto1 from '../assets/images/foto 1.png';
import foto2 from '../assets/images/foto 2.png';

export const IMAGENES = {
  'mochila-1': mochila1,
  'mochila-2': mochila2,
  'gonzalo':   gonzalo,
  'gonzalo-2': gonzalo2,
  'foto-1': foto1,
  'foto-2': foto2,
};

// Devuelve la imagen a partir de lo guardado en Firestore.
// Acepta tanto una URL (foto subida por el admin a Storage) como una clave local.
export function imagen(valor) {
  if (!valor) return '';
  if (/^https?:\/\//.test(valor) || valor.startsWith('data:')) return valor;
  return IMAGENES[valor] || '';
}
