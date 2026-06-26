import React, { useEffect, useRef, useState } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useIdioma } from '../context/LanguageContext';
import { obtenerContenido } from '../firebase/contenido';
import '../styles/Alma.css';

export default function Alma() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const [almaFotos, setAlmaFotos] = useState([]);
  const fotosRef = useRef([]);

  useEffect(() => {
    obtenerContenido().then((c) => {
      if (Array.isArray(c.almaFotos) && c.almaFotos.length) setAlmaFotos(c.almaFotos);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!almaFotos.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('alma-foto--visible'); }),
      { threshold: 0.12 }
    );
    fotosRef.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [almaFotos]);

  return (
    <>
      <Header />
      <main className="alma-page">
        <div className="alma-wrap">
          <p className="alma-eyebrow">Kapac Made · Arequipa, {es ? 'Perú' : 'Peru'}</p>

          <h1 className="alma-manifiesto">
            {es
              ? 'Mochilas hechas a mano para explorar sin límites.'
              : 'Handmade backpacks built to explore without limits.'}
          </h1>

          <p className="alma-intro">
            {es
              ? 'Kapac Made nace de los Andes: un laboratorio de diseño donde cada mochila se cose una a una, con identidad propia. Creemos en el trabajo local, en los materiales que duran y en acompañarte en cada camino.'
              : 'Kapac Made is born from the Andes: a design lab where each backpack is sewn one by one, with its own identity. We believe in local craft, materials that last, and gear that follows you on every path.'}
          </p>

          <div className="alma-bloques">
            <section className="alma-bloque">
              <h2>{es ? '01 — Origen' : '01 — Origin'}</h2>
              <p>
                {es
                  ? 'Nacimos en Arequipa, a los pies del Misti. Cada diseño se inspira en los paisajes andinos y la riqueza cultural de nuestra tierra.'
                  : 'We were born in Arequipa, at the foot of the Misti. Every design draws from the Andean landscapes and the cultural richness of our land.'}
              </p>
            </section>
            <section className="alma-bloque">
              <h2>{es ? '02 — Artesanía' : '02 — Craft'}</h2>
              <p>
                {es
                  ? 'Cada mochila es fabricada a mano con materiales de alta calidad y técnicas de serigrafía únicas. Sin fast fashion, sin atajos.'
                  : 'Each backpack is handcrafted with high-quality materials and unique screen-printing techniques. No fast fashion, no shortcuts.'}
              </p>
            </section>
            <section className="alma-bloque">
              <h2>{es ? '03 — Diseño' : '03 — Design'}</h2>
              <p>
                {es
                  ? 'Nuestras ilustraciones las crean artistas locales que plasman la esencia de los Andes. Cada mochila cuenta una historia; ninguna es igual a otra.'
                  : 'Our illustrations are made by local artists who capture the essence of the Andes. Every backpack tells a story; no two are alike.'}
              </p>
            </section>
          </div>

          <p className="alma-cierre">{es ? 'Explorar sin límites.' : 'Explore without limits.'}</p>
        </div>

        {almaFotos.length > 0 && (
          <section className="alma-galeria-section">
            <div className="alma-galeria-header">
              <span className="alma-galeria-titulo">{es ? 'Archivo visual' : 'Visual archive'}</span>
            </div>
            <div className="alma-galeria-grid">
              {almaFotos.map((foto, i) => (
                <div
                  key={i}
                  className={`alma-foto${i === 0 ? ' alma-foto--hero' : ''}`}
                  style={{ transitionDelay: `${(i % 3) * 0.12}s` }}
                  ref={(el) => { fotosRef.current[i] = el; }}
                >
                  <img src={foto.url} alt={foto.caption || ''} loading="lazy" />
                  {foto.caption && (
                    <div className="alma-foto-overlay">
                      <p className="alma-foto-caption">{foto.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
