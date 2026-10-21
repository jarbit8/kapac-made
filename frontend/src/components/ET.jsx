import React from 'react';
import Editable from './Editable';
import { useIdioma } from '../context/LanguageContext';

// Atajo: texto traducido (t) + editable en vivo, en un solo componente.
// Usa la misma clave del diccionario de traducciones como id de edición.
export default function ET({ k, as = 'span', className = '', multiline = false, sinColor = false }) {
  const { t } = useIdioma();
  return <Editable id={k} as={as} className={className} multiline={multiline} sinColor={sinColor}>{t(k)}</Editable>;
}
