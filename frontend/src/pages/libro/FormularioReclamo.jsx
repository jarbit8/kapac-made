import React from 'react';
import Icono from '../../components/Icono';
import { useIdioma } from '../../context/LanguageContext';
import Fila, { FilasProveedor } from './Fila';
import Leyendas from './Leyendas';
import BloqueConsumidor from './BloqueConsumidor';
import BloqueBien from './BloqueBien';
import BloqueReclamo from './BloqueReclamo';
import { fechaLarga } from './formato';

export default function FormularioReclamo({ f }) {
  const { t, idioma } = useIdioma();
  const { errores, errorEnvio, enviando, enviar } = f;
  const hayErrores = Object.keys(errores).length > 0;

  return (
    <>
      <section className="libro-proveedor">
        <dl className="libro-datos">
          <FilasProveedor t={t} />
          <Fila etiqueta={t('libro.fecha')} valor={fechaLarga(new Date(), idioma)} />
        </dl>
      </section>

      <form className="libro-form" onSubmit={enviar} noValidate>
        <BloqueConsumidor f={f} t={t} />
        <BloqueBien f={f} t={t} />
        <BloqueReclamo f={f} t={t} />

        {(hayErrores || errorEnvio) && (
          <p className="libro-error-general" role="alert">
            <Icono nombre="alerta" tam={16} /> {errorEnvio || t('libro.err_revisa')}
          </p>
        )}

        <button type="submit" className="libro-enviar" disabled={enviando}>
          {enviando ? t('libro.enviando') : t('libro.enviar')}
        </button>

        <Leyendas t={t} />
      </form>
    </>
  );
}
