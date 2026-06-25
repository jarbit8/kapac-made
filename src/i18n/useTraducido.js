import { useState, useEffect } from 'react';
import { traducirEsEn } from './traducir';

// Devuelve el texto en español, o su traducción al inglés si idioma === 'en'.
// Mientras traduce muestra el español (sin parpadeo brusco). Cachea el resultado.
export function useTraducido(textoEs, idioma) {
  const [texto, setTexto] = useState(textoEs || '');

  useEffect(() => {
    let activo = true;
    if (idioma === 'en' && textoEs) {
      traducirEsEn(textoEs).then((t) => { if (activo) setTexto(t); });
    } else {
      setTexto(textoEs || '');
    }
    return () => { activo = false; };
  }, [textoEs, idioma]);

  return texto;
}
