import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { obtenerTextos, guardarTexto } from '../firebase/textos';
import { traducirEsEn } from '../i18n/traducir';
import { useAuth } from './AuthContext';

const TextosContext = createContext({ textos: {}, esAdmin: false, guardar: async () => {} });

export function TextosProvider({ children }) {
  const [textos, setTextos] = useState({});
  const { usuario } = useAuth();
  const esAdmin = usuario?.email === 'jarb2299@gmail.com';

  useEffect(() => {
    obtenerTextos().then(setTextos).catch(() => {});
  }, []);

  const guardar = async (clave, valor) => {
    setTextos((prev) => ({ ...prev, [clave]: valor })); // refleja al instante
    try { await guardarTexto(clave, valor); } catch (e) { /* error silencioso */ }
  };

  // Textos editados cuya traducción quedó pendiente (la API falló al guardar):
  // cuando entra el admin se completan solas, una vez por sesión.
  const rellenado = useRef(false);
  useEffect(() => {
    if (!esAdmin || rellenado.current) return;
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
  }, [esAdmin, textos]);

  return (
    <TextosContext.Provider value={{ textos, esAdmin, guardar }}>
      {children}
    </TextosContext.Provider>
  );
}

export const useTextos = () => useContext(TextosContext);
