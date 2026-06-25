import React, { createContext, useContext, useEffect, useState } from 'react';
import { obtenerContenido, ACENTO_DEFAULT, LOGO_DEFAULT } from '../firebase/contenido';

export const LOGO_CACHE_KEY = 'kapac_logo_v1';

const TemaContext = createContext({ logo: LOGO_DEFAULT, acento: ACENTO_DEFAULT, setTema: () => {} });

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      const logo = localStorage.getItem(LOGO_CACHE_KEY) || LOGO_DEFAULT;
      return { logo, acento: ACENTO_DEFAULT };
    } catch (_) {
      return { logo: LOGO_DEFAULT, acento: ACENTO_DEFAULT };
    }
  });

  useEffect(() => {
    obtenerContenido().then((c) => {
      const logo = c.logo || LOGO_DEFAULT;
      const acento = c.acento || ACENTO_DEFAULT;
      setTema({ logo, acento });
      if (acento) document.documentElement.style.setProperty('--clay', acento);
      try { localStorage.setItem(LOGO_CACHE_KEY, logo); } catch (_) {}
    }).catch(() => {});
  }, []);

  return <TemaContext.Provider value={{ ...tema, setTema }}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
