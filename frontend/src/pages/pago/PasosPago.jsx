import React from 'react';
import { useIdioma } from '../../context/LanguageContext';

export default function PasosPago({ claves }) {
  const { t } = useIdioma();
  return (
    <ol className="pago-pasos">
      {claves.map((k, i) => (
        <li className="pago-paso" key={k}>
          <span className="paso-num">{i + 1}</span>
          <span>{t(k)}</span>
        </li>
      ))}
    </ol>
  );
}
