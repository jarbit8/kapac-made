import React from 'react';
import { Link } from 'react-router-dom';
import Icono from '../../components/Icono';

export default function ExitoReclamo({ enviado, t }) {
  return (
    <section className="libro-exito libro-no-imprimir" role="status">
      <Icono nombre="checkCirculo" tam={44} />
      <h2>{t(enviado.datos.tipo === 'reclamo' ? 'libro.ok_reclamo' : 'libro.ok_queja')}</h2>
      <p className="libro-exito-codigo">{t('libro.ok_codigo')} <strong>{enviado.codigo}</strong></p>
      <p>{t('libro.ok_copia')} <strong>{enviado.datos.email}</strong></p>
      <div className="libro-acciones">
        <button type="button" className="libro-boton" onClick={() => window.print()}>{t('libro.ok_imprimir')}</button>
        <Link to="/" className="libro-boton secundario">{t('libro.ok_inicio')}</Link>
      </div>
    </section>
  );
}
