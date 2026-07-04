import React, { createContext, useContext, useEffect, useState } from 'react';
import { obtenerContenido, ACENTO_DEFAULT, LOGO_DEFAULT, FONDO_DEFAULT, TEXTO_DEFAULT } from '../firebase/contenido';

export const LOGO_CACHE_KEY = 'kapac_logo_v1';

const TemaContext = createContext({ logo: LOGO_DEFAULT, acento: ACENTO_DEFAULT, fondo: FONDO_DEFAULT, texto: TEXTO_DEFAULT, setTema: () => {} });

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      return {
        logo: localStorage.getItem(LOGO_CACHE_KEY) || LOGO_DEFAULT,
        acento: ACENTO_DEFAULT,
        fondo: FONDO_DEFAULT,
        texto: TEXTO_DEFAULT,
      };
    } catch (_) {
      return { logo: LOGO_DEFAULT, acento: ACENTO_DEFAULT, fondo: FONDO_DEFAULT, texto: TEXTO_DEFAULT };
    }
  });

  useEffect(() => {
    obtenerContenido().then((c) => {
      const logo = c.logo || LOGO_DEFAULT;
      const acento = c.acento || ACENTO_DEFAULT;
      const fondo = c.fondo || FONDO_DEFAULT;
      // El color de texto ya no es global: cada bloque tiene su propia pastilla.
      // El valor por defecto es siempre negro, sin importar lo que haya quedado guardado.
      const texto = TEXTO_DEFAULT;
      setTema({ logo, acento, fondo, texto });
      if (acento) document.documentElement.style.setProperty('--clay', acento);
      document.documentElement.style.setProperty('--fondo', fondo);
      document.documentElement.style.setProperty('--ink', texto);
      try { localStorage.setItem(LOGO_CACHE_KEY, logo); } catch (_) {}
    }).catch(() => {});
  }, []);

  return <TemaContext.Provider value={{ ...tema, setTema }}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
