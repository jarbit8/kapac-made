import React from 'react';
import { useTraducido } from '../i18n/useTraducido';

// Muestra un texto de producto (nombre/descr) traducido automáticamente al inglés.
export default function TextoProducto({ texto, idioma }) {
  const t = useTraducido(texto, idioma);
  return <>{t}</>;
}
