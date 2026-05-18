// Mapa de imágenes locales (las fotos viven en assets, Firestore guarda solo la "clave")
import mochila1 from '../assets/images/mochila 1.png';
import mochila2 from '../assets/images/mochila 2.png';
import mochila3 from '../assets/images/mochila 3.png';
import mochila4 from '../assets/images/mochila 4.png';
import foto1 from '../assets/images/foto 1.png';
import foto2 from '../assets/images/foto 2.png';
import foto3 from '../assets/images/foto 3.png';
import foto4 from '../assets/images/foto 4.png';

export const IMAGENES = {
  'mochila-1': mochila1,
  'mochila-2': mochila2,
  'mochila-3': mochila3,
  'mochila-4': mochila4,
  'foto-1': foto1,
  'foto-2': foto2,
  'foto-3': foto3,
  'foto-4': foto4,
};

// Devuelve la imagen a partir de su clave guardada en Firestore
export function imagen(clave) {
  return IMAGENES[clave] || '';
}
