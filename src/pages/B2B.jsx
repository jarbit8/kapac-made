import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Editable from '../components/Editable';
import EditableImage from '../components/EditableImage';
import { useTextos } from '../context/TextosContext';
import coser1 from '../assets/images/coser1.png';
import { useIdioma } from '../context/LanguageContext';
import { obtenerContenido, guardarContenido, B2B_BENEFICIOS_DEFAULT } from '../firebase/contenido';
import '../styles/B2B.css';

// Texto por defecto de los 4 beneficios originales (nuevas tarjetas arrancan vacías).
const DEFAULTS_BENEFICIO = {
  beneficio1: { t: ['Diseño innovador', 'Innovative design'], d: ['Piezas únicas con la identidad de tu marca.', 'Unique pieces with your brand identity.'] },
  beneficio2: { t: ['Calidad superior', 'Superior quality'], d: ['Materiales de primera, hechos a mano para durar.', 'Premium materials, handmade to last.'] },
  beneficio3: { t: ['Funcionalidad real', 'Real functionality'], d: ['Pensadas para el uso diario.', 'Designed for everyday use.'] },
  beneficio4: { t: ['Hecho en Arequipa', 'Made in Arequipa'], d: ['Producción local y artesanal del Perú.', 'Local, artisanal production from Peru.'] },
};

export default function B2B() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const { esAdmin } = useTextos();

  const [contenido, setContenido] = useState(null);
  useEffect(() => {
    obtenerContenido().then(setContenido).catch(() => {});
  }, []);

  const beneficios = contenido?.b2bBeneficios || B2B_BENEFICIOS_DEFAULT;

  const guardarBeneficios = async (nuevos) => {
    const base = contenido || await obtenerContenido();
    const nuevo = { ...base, b2bBeneficios: nuevos };
    setContenido(nuevo);
    try { await guardarContenido(nuevo); } catch (_) { /* error silencioso */ }
  };

  const agregarBeneficio = () => guardarBeneficios([...beneficios, `beneficio_${Date.now()}`]);
  const quitarBeneficio = (key) => guardarBeneficios(beneficios.filter((k) => k !== key));

  return (
    <>
      <Header />
      <main className="b2b-page">

        {/* Hero B2B */}
        <section className="b2b-hero">
          <EditableImage id="b2b_hero_img" srcDefault={coser1} alt={es ? 'Diseño para empresas' : 'Design for companies'} className="b2b-hero-img" carpeta="b2b" />
          <div className="b2b-hero-overlay" />
          <div className="b2b-hero-content">
            <p className="b2b-tagline">KAPAC MADE · B2B</p>
            <Editable id="b2b_hero_titulo" as="h1">{es ? 'Diseñamos para tu empresa' : 'We design for your company'}</Editable>
            <Editable id="b2b_hero_sub" as="p" className="b2b-subtitulo">
              {es ? 'Productos únicos, hechos a tu medida.' : 'Unique products, made for you.'}
            </Editable>
          </div>
        </section>

        {/* Propuesta */}
        <section className="b2b-section">
          <Editable id="b2b_que_titulo" as="h2">{es ? '¿Qué hacemos?' : 'What we do'}</Editable>
          <Editable id="b2b_que_texto" as="p" className="b2b-parrafo" multiline>
            {es
              ? 'En Kapac Made diseñamos y fabricamos productos personalizados para empresas que buscan destacar. Desde mochilas corporativas hasta accesorios únicos, cada pieza combina diseños innovadores y minimalistas con la mejor calidad y funcionalidad del mercado.'
              : 'At Kapac Made we design and manufacture custom products for companies that want to stand out. From corporate backpacks to unique accessories, each piece combines innovative and minimalist design with the highest quality and functionality on the market.'}
          </Editable>
        </section>

        {/* Beneficios */}
        <section className="b2b-section b2b-beneficios">
          <Editable id="b2b_beneficios_titulo" as="h2">{es ? '¿Por qué Kapac Made?' : 'Why Kapac Made?'}</Editable>
          <div className="b2b-grid">
            {beneficios.map((key) => {
              const def = DEFAULTS_BENEFICIO[key] || { t: ['', ''], d: ['', ''] };
              return (
                <div className="b2b-bloque" key={key}>
                  <Editable id={`b2b_${key}_titulo`} as="h3">{es ? def.t[0] : def.t[1]}</Editable>
                  <Editable id={`b2b_${key}_desc`} as="p">{es ? def.d[0] : def.d[1]}</Editable>
                  {esAdmin && (
                    <button type="button" className="b2b-bloque-quitar" onClick={() => quitarBeneficio(key)} title="Quitar">×</button>
                  )}
                </div>
              );
            })}
            {esAdmin && (
              <button type="button" className="b2b-agregar-beneficio" onClick={agregarBeneficio}>
                + Agregar beneficio
              </button>
            )}
          </div>
        </section>

        {/* CTA Contacto */}
        <section className="b2b-cta">
          <Editable id="b2b_cta_titulo" as="h2">{es ? '¿Listos para empezar?' : 'Ready to start?'}</Editable>
          <Editable id="b2b_cta_texto" as="p">
            {es
              ? 'Cuéntanos sobre tu proyecto y diseñemos algo único para tu empresa.'
              : "Tell us about your project and let's design something unique for your company."}
          </Editable>
          <Link to="/contacto" className="b2b-btn">
            <Editable id="b2b_cta_boton" as="span" sinColor>{es ? 'Hablemos' : "Let's talk"}</Editable> →
          </Link>
        </section>

      </main>
      <Footer />
    </>
  );
}
