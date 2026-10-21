import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { obtenerTextos, guardarTexto } from '../firebase/textos';
import { traducirEsEn } from '../i18n/traducir';
import { useAuth } from './AuthContext';

const TextosContext = createContext({ textos: {}, esAdmin: false, guardar: async () => {} });

// Textos de la visita anterior: se pintan al instante y Firestore los actualiza después
const CACHE_KEY = 'kapac_textos_v1';
const textosGuardados = (() => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (_) { return null; }
})();

export function TextosProvider({ children }) {
  const [textos, setTextos] = useState(textosGuardados || {});
  const [listos, setListos] = useState(textosGuardados !== null);
  const [frescos, setFrescos] = useState(false); // ya respondió Firestore
  // Para los componentes, esAdmin = mostrar los controles de edición (solo en modo edición)
  const { esAdmin, puedeEditar, cargando } = useAuth();

  useEffect(() => {
    obtenerTextos()
      .then((t) => { setTextos(t); setFrescos(true); })
      .catch(() => {})
      .finally(() => setListos(true));
  }, []);

  useEffect(() => {
    if (!frescos) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(textos)); } catch (_) {}
  }, [textos, frescos]);

  const guardar = async (clave, valor) => {
    const anterior = textos[clave];
    setTextos((prev) => ({ ...prev, [clave]: valor })); // refleja al instante
    try {
      await guardarTexto(clave, valor);
    } catch (e) {
      console.error('No se pudo guardar el texto:', clave, e);
      setTextos((prev) => ({ ...prev, [clave]: anterior })); // revertir: no se guardó de verdad
      window.alert('No se pudo guardar el cambio. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
  };

  // Textos editados cuya traducción quedó pendiente (la API falló al guardar):
  // cuando entra el admin se completan solas, una vez por sesión. Solo con los
  // textos recién leídos: con los guardados podría pisar una traducción nueva.
  const rellenado = useRef(false);
  useEffect(() => {
    if (!esAdmin || cargando || !frescos || rellenado.current) return;
    const claves = Object.keys(textos).filter((k) => k.endsWith('__es'));
    if (!claves.length) return;
    rellenado.current = true;
    (async () => {
      for (const k of claves) {
        const id = k.slice(0, -4);
        if (textos[`${id}__en`] !== undefined) continue;
        const tr = await traducirEsEn(textos[k]);
        if (tr) await guardar(`${id}__en`, tr);
      }
    })();
  }, [esAdmin, cargando, textos, frescos]);

  return (
    <TextosContext.Provider value={{ textos, listos, esAdmin: puedeEditar, guardar }}>
      {children}
    </TextosContext.Provider>
  );
}

export const useTextos = () => useContext(TextosContext);
