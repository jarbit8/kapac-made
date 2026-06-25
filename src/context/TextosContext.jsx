import React, { createContext, useContext, useEffect, useState } from 'react';
import { obtenerTextos, guardarTexto } from '../firebase/textos';
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

  return (
    <TextosContext.Provider value={{ textos, esAdmin, guardar }}>
      {children}
    </TextosContext.Provider>
  );
}

export const useTextos = () => useContext(TextosContext);
