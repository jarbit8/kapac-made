import { fotoRapida } from './fotos';

// URL de una foto guardada en Firestore: subida a Storage o incrustada
export function imagen(valor) {
  if (!valor) return '';
  if (/^https?:\/\//.test(valor)) return fotoRapida(valor);
  if (valor.startsWith('data:')) return valor;
  return '';
}
