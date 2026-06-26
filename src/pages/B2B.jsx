import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import coser1 from '../assets/images/coser1.png';
import { useIdioma } from '../context/LanguageContext';
import '../styles/B2B.css';

export default function B2B() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';

  return (
    <>
      <Header />
      <main className="b2b-page">

        {/* Hero B2B */}
        <section className="b2b-hero">
          <img src={coser1} alt={es ? 'Diseño para empresas' : 'Design for companies'} className="b2b-hero-img" />
          <div className="b2b-hero-overlay" />
          <div className="b2b-hero-content">
            <p className="b2b-tagline">KAPAC MADE · B2B</p>
            <h1>{es ? 'Diseñamos para tu empresa' : 'We design for your company'}</h1>
            <p className="b2b-subtitulo">
              {es ? 'Productos únicos, hechos a tu medida.' : 'Unique products, made for you.'}
            </p>
          </div>
        </section>

        {/* Propuesta */}
        <section className="b2b-section">
          <h2>{es ? '¿Qué hacemos?' : 'What we do'}</h2>
          <p className="b2b-parrafo">
            {es
              ? 'En Kapac Made diseñamos y fabricamos productos personalizados para empresas que buscan destacar. Desde mochilas corporativas hasta accesorios únicos, cada pieza combina diseños innovadores y minimalistas con la mejor calidad y funcionalidad del mercado.'
              : 'At Kapac Made we design and manufacture custom products for companies that want to stand out. From corporate backpacks to unique accessories, each piece combines innovative and minimalist design with the highest quality and functionality on the market.'}
          </p>
        </section>

        {/* Beneficios */}
        <section className="b2b-section b2b-beneficios">
          <h2>{es ? '¿Por qué Kapac Made?' : 'Why Kapac Made?'}</h2>
          <div className="b2b-grid">
            <div className="b2b-bloque">
              <h3>{es ? 'Diseño innovador' : 'Innovative design'}</h3>
              <p>{es ? 'Piezas únicas con la identidad de tu marca.' : 'Unique pieces with your brand identity.'}</p>
            </div>
            <div className="b2b-bloque">
              <h3>{es ? 'Calidad superior' : 'Superior quality'}</h3>
              <p>{es ? 'Materiales de primera, hechos a mano para durar.' : 'Premium materials, handmade to last.'}</p>
            </div>
            <div className="b2b-bloque">
              <h3>{es ? 'Funcionalidad real' : 'Real functionality'}</h3>
              <p>{es ? 'Pensadas para el uso diario.' : 'Designed for everyday use.'}</p>
            </div>
            <div className="b2b-bloque">
              <h3>{es ? 'Hecho en Arequipa' : 'Made in Arequipa'}</h3>
              <p>{es ? 'Producción local y artesanal del Perú.' : 'Local, artisanal production from Peru.'}</p>
            </div>
          </div>
        </section>

        {/* CTA Contacto */}
        <section className="b2b-cta">
          <h2>{es ? '¿Listos para empezar?' : 'Ready to start?'}</h2>
          <p>
            {es
              ? 'Cuéntanos sobre tu proyecto y diseñemos algo único para tu empresa.'
              : "Tell us about your project and let's design something unique for your company."}
          </p>
          <Link to="/contacto" className="b2b-btn">
            {es ? 'Hablemos' : "Let's talk"} →
          </Link>
        </section>

      </main>
      <Footer />
    </>
  );
}
