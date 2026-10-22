import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { obtenerContenido, contenidoGuardado, ACENTO_DEFAULT, LOGO_DEFAULT, FONDO_DEFAULT, TEXTO_DEFAULT } from '../firebase/contenido';

export const LOGO_CACHE_KEY = 'kapac_logo_v1';
const ACENTO_CACHE_KEY = 'kapac_acento_v1';
const FONDO_CACHE_KEY = 'kapac_fondo_v1';
const CERRADO_CACHE_KEY = 'kapac_cerrado_v1';

const TemaContext = createContext({ logo: LOGO_DEFAULT, acento: ACENTO_DEFAULT, fondo: FONDO_DEFAULT, texto: TEXTO_DEFAULT, setTema: () => {} });

export function TemaProvider({ children }) {
  // Sin cache de una visita anterior, lo que había al publicar
  const [tema, setTema] = useState(() => {
    const c = contenidoGuardado();
    try {
      return {
        logo: localStorage.getItem(LOGO_CACHE_KEY) || c?.logo || LOGO_DEFAULT,
        acento: localStorage.getItem(ACENTO_CACHE_KEY) || c?.acento || ACENTO_DEFAULT,
        fondo: localStorage.getItem(FONDO_CACHE_KEY) || c?.fondo || FONDO_DEFAULT,
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
    try { return localStorage.getItem(LOGO_CACHE_KEY) !== null || contenidoGuardado() !== null; } catch (_) { return true; }
  });

  // Tienda cerrada al público (pantalla "Próximamente"). Cacheado para que en
  // visitas repetidas aplique al instante; en la primera, lo que había al publicar,
  // y si no se sabe, se asume cerrada.
  const [cerrado, setCerrado] = useState(() => {
    try {
      const guardado = localStorage.getItem(CERRADO_CACHE_KEY);
      if (guardado !== null) return guardado !== '0';
    } catch (_) {}
    const c = contenidoGuardado();
    return c ? c.cerrado === true : true;
  });
  const [cerradoListo, setCerradoListo] = useState(false); // ya respondió Firestore

  // Aplica el acento/fondo cacheados ANTES de pintar (useLayoutEffect corre
  // sincrónico, antes de que el navegador muestre el frame), para no destellar
  // el terracota de fábrica mientras se espera la respuesta de Firestore.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--clay', tema.acento);
    document.documentElement.style.setProperty('--fondo', tema.fondo);
    document.documentElement.style.setProperty('--ink', tema.texto);
  }, [tema.acento, tema.fondo, tema.texto]);

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
      try {
        localStorage.setItem(LOGO_CACHE_KEY, logo);
        localStorage.setItem(ACENTO_CACHE_KEY, acento);
        localStorage.setItem(FONDO_CACHE_KEY, fondo);
        localStorage.setItem(CERRADO_CACHE_KEY, c.cerrado === true ? '1' : '0');
      } catch (_) {}
      setLogoListo(true);
    }).catch(() => setLogoListo(true)) // sin conexión: se mantiene lo de la visita anterior
      .finally(() => setCerradoListo(true));
  }, []);

  return <TemaContext.Provider value={{ ...tema, logoListo, cerrado, cerradoListo, setCerrado, setTema }}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
