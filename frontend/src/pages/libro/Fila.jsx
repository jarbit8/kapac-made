import React from 'react';
import { EMPRESA } from '../../config/empresa';

export default function Fila({ etiqueta, valor }) {
  if (valor === '' || valor === null || valor === undefined) return null;
  return (
    <div className="libro-fila">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

export function FilasProveedor({ t }) {
  return (
    <>
      <Fila etiqueta={t('libro.razon_social')} valor={EMPRESA.razonSocial} />
      <Fila etiqueta={t('libro.nombre_comercial')} valor={EMPRESA.nombreComercial} />
      <Fila etiqueta={t('libro.ruc')} valor={EMPRESA.ruc} />
      <Fila etiqueta={t('libro.domicilio_proveedor')} valor={EMPRESA.domicilio} />
    </>
  );
}
