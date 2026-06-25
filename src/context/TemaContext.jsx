import React, { createContext, useContext, useEffect, useState } from 'react';
import { obtenerContenido, ACENTO_DEFAULT, LOGO_DEFAULT } from '../firebase/contenido';

const TemaContext = createContext({ logo: LOGO_DEFAULT, acento: ACENTO_DEFAULT });

export function TemaProvider({ children }) {
  const [tema, setTema] = useState({ logo: LOGO_DEFAULT, acento: ACENTO_DEFAULT });

  useEffect(() => {
    obtenerContenido().then((c) => {
      const t = { logo: c.logo || LOGO_DEFAULT, acento: c.acento || ACENTO_DEFAULT };
      setTema(t);
      // Inyecta el color de acento como variable CSS para todo el sitio.
      if (t.acento) document.documentElement.style.setProperty('--clay', t.acento);
    }).catch(() => {});
  }, []);

  return <TemaContext.Provider value={tema}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
