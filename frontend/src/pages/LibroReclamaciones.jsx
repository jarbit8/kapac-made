import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useIdioma } from '../context/LanguageContext';
import useFormularioReclamo from './libro/useFormularioReclamo';
import FormularioReclamo from './libro/FormularioReclamo';
import ExitoReclamo from './libro/ExitoReclamo';
import Hoja from './libro/Hoja';
import '../styles/LibroReclamaciones.css';

export default function LibroReclamaciones() {
  const { t, idioma } = useIdioma();
  const formulario = useFormularioReclamo();
  const { enviado } = formulario;

  return (
    <>
      <Header />
      <main className="libro-page">
        <div className="libro-hero libro-no-imprimir">
          <h1>{t('libro.titulo')}</h1>
          <p className="libro-sub">{t('libro.subtitulo')}</p>
        </div>

        {enviado ? (
          <>
            <ExitoReclamo enviado={enviado} t={t} />
            <Hoja r={enviado} t={t} idioma={idioma} />
          </>
        ) : (
          <FormularioReclamo f={formulario} />
        )}
      </main>
      <Footer />
    </>
  );
}
