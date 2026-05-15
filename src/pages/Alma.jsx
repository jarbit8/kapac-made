import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import paisajeVideo from '../assets/videos/paisaje.mp4';
import coser1 from '../assets/images/coser1.png';
import coser2 from '../assets/images/coser2.png';
import '../styles/Alma.css';

export default function Alma() {
  return (
    <>
      <Header />
      <main className="alma-page">

        {/* Hero video paisaje */}
        <div className="alma-hero">
          <video src={paisajeVideo} autoPlay loop muted playsInline className="alma-video" />
          <h1>El alma de Kapac Made</h1>
          <p className="alma-subtitulo">Mochilas para explorar sin límites</p>
        </div>

        {/* Video Facebook */}
        <div className="alma-section">
          <h2>Así nacen nuestras mochilas</h2>
          <div className="alma-fb-video">
            <iframe
              src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F2062139780577196&show_text=false&appId"
              scrolling="no"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              title="Kapac Made - Proceso"
            />
          </div>
        </div>

        {/* Fotos del proceso */}
        <div className="alma-section">
          <h2>El proceso</h2>
          <div className="alma-fotos-grid">
            <img src={coser1} alt="Proceso de costura 1" />
            <img src={coser2} alt="Proceso de costura 2" />
          </div>
        </div>

        {/* Historia */}
        <div className="alma-content">
          <section className="alma-section">
            <h2>Nuestra historia</h2>
            <p>Kapac Made nació en Arequipa, Perú, con una visión simple: crear mochilas que sean tan únicas como las personas que las usan. Inspirados por los paisajes andinos y la riqueza cultural de nuestra tierra, diseñamos cada producto con identidad propia.</p>
          </section>

          <section className="alma-section">
            <h2>Hecho en Arequipa</h2>
            <p>Cada mochila es fabricada artesanalmente en Arequipa, usando materiales de alta calidad y técnicas de serigrafía únicas. Creemos en el trabajo local y en apoyar a nuestra comunidad.</p>
          </section>

          <section className="alma-section">
            <h2>Diseño que destaca</h2>
            <p>Nuestras ilustraciones son creadas por artistas locales que plasman la esencia de los Andes en cada pieza. Cada mochila cuenta una historia, cada diseño es un reflejo de nuestra cultura.</p>
          </section>
        </div>

      </main>
      <Footer />
    </>
  );
}
