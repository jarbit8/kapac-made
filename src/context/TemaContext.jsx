import React, { createContext, useContext, useEffect, useState } from 'react';
import { obtenerContenido, ACENTO_DEFAULT, LOGO_DEFAULT, FONDO_DEFAULT, TEXTO_DEFAULT } from '../firebase/contenido';

export const LOGO_CACHE_KEY = 'kapac_logo_v1';
const CERRADO_CACHE_KEY = 'kapac_cerrado_v1';

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

  // En la primera visita no se sabe aún cuál es el logo real: mejor no mostrar
  // ninguno (que "flashear" el de fábrica y luego cambiarlo). Si ya hay cache
  // de una visita anterior, se muestra al instante.
  const [logoListo, setLogoListo] = useState(() => {
    try { return localStorage.getItem(LOGO_CACHE_KEY) !== null; } catch (_) { return true; }
  });

  // Tienda cerrada al público (pantalla "Próximamente"). Cacheado para que en
  // visitas repetidas el bloqueo aplique al instante, sin esperar a Firestore.
  const [cerrado, setCerrado] = useState(() => {
    try { return localStorage.getItem(CERRADO_CACHE_KEY) === '1'; } catch (_) { return false; }
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
      setCerrado(c.cerrado === true);
      if (acento) document.documentElement.style.setProperty('--clay', acento);
      document.documentElement.style.setProperty('--fondo', fondo);
      document.documentElement.style.setProperty('--ink', texto);
      try {
        localStorage.setItem(LOGO_CACHE_KEY, logo);
        localStorage.setItem(CERRADO_CACHE_KEY, c.cerrado === true ? '1' : '0');
      } catch (_) {}
      setLogoListo(true);
    }).catch(() => setLogoListo(true));
  }, []);

  return <TemaContext.Provider value={{ ...tema, logoListo, cerrado, setCerrado, setTema }}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
