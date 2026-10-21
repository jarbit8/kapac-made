// Contexto de idioma — persiste la selección en localStorage
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();
const STORAGE_KEY = 'kapac_idioma';
const DEFAULT_LANG = 'es';
const SUPPORTED = ['es', 'en'];

export function LanguageProvider({ children }) {
  const [idioma, setIdiomaState] = useState(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado && SUPPORTED.includes(guardado)) return guardado;
      // Detectar idioma del navegador la primera vez
      const navLang = (navigator.language || 'es').slice(0, 2);
      return SUPPORTED.includes(navLang) ? navLang : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, idioma); } catch {}
    document.documentElement.lang = idioma;
  }, [idioma]);

  const setIdioma = useCallback((nuevo) => {
    if (SUPPORTED.includes(nuevo)) setIdiomaState(nuevo);
  }, []);

  const t = useCallback((key) => {
    const dict = translations[idioma] || translations[DEFAULT_LANG];
    return dict[key] || translations[DEFAULT_LANG][key] || key;
  }, [idioma]);

  return (
    <LanguageContext.Provider value={{ idioma, setIdioma, t, idiomas: SUPPORTED }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useIdioma() {
  return useContext(LanguageContext);
}
