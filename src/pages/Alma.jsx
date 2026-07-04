import React, { useEffect, useState } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Editable from '../components/Editable';
import EditableImage from '../components/EditableImage';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import { obtenerContenido, guardarContenido, ALMA_BLOQUES_DEFAULT, ALMA_FOTOS_DEFAULT } from '../firebase/contenido';
import '../styles/Alma.css';

// Texto por defecto de los 3 bloques originales (los nuevos arrancan vacíos).
const DEFAULTS_BLOQUE = {
  bloque1: { t: ['01 — Origen', '01 — Origin'], d: ['Nacimos en Arequipa, a los pies del Misti. Cada diseño se inspira en los paisajes andinos y la riqueza cultural de nuestra tierra.', 'We were born in Arequipa, at the foot of the Misti. Every design draws from the Andean landscapes and the cultural richness of our land.'] },
  bloque2: { t: ['02 — Artesanía', '02 — Craft'], d: ['Cada mochila es fabricada a mano con materiales de alta calidad y técnicas de serigrafía únicas. Sin fast fashion, sin atajos.', 'Each backpack is handcrafted with high-quality materials and unique screen-printing techniques. No fast fashion, no shortcuts.'] },
  bloque3: { t: ['03 — Diseño', '03 — Design'], d: ['Nuestras ilustraciones las crean artistas locales que plasman la esencia de los Andes. Cada mochila cuenta una historia; ninguna es igual a otra.', 'Our illustrations are made by local artists who capture the essence of the Andes. Every backpack tells a story; no two are alike.'] },
};

export default function Alma() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const { textos, esAdmin, guardar } = useTextos();

  const [contenido, setContenido] = useState(null);
  useEffect(() => {
    obtenerContenido().then(setContenido).catch(() => {});
  }, []);

  const bloques = contenido?.almaBloques || ALMA_BLOQUES_DEFAULT;
  const fotos = contenido?.almaFotos || ALMA_FOTOS_DEFAULT;

  const guardarContenidoParcial = async (parcial) => {
    const base = contenido || await obtenerContenido();
    const nuevo = { ...base, ...parcial };
    setContenido(nuevo);
    try { await guardarContenido(nuevo); } catch (_) { /* error silencioso */ }
  };

  const agregarBloque = () => guardarContenidoParcial({ almaBloques: [...bloques, `bloque_${Date.now()}`] });
  const quitarBloque = (key) => guardarContenidoParcial({ almaBloques: bloques.filter((k) => k !== key) });

  const claveFotoDe = (foto, i) => (typeof foto === 'object' && foto !== null) ? `legacy${i}` : foto;
  const agregarFoto = () => guardarContenidoParcial({ almaFotos: [...fotos, `foto_${Date.now()}`] });
  const quitarFoto = (key) => guardarContenidoParcial({ almaFotos: fotos.filter((f, i) => claveFotoDe(f, i) !== key) });

  return (
    <>
      <Header />
      <main className="alma-page">
        <div className="alma-wrap">
          <p className="alma-eyebrow">Kapac Made · Arequipa, {es ? 'Perú' : 'Peru'}</p>

          <Editable id="alma_manifiesto" as="h1" className="alma-manifiesto">
            {es
              ? 'Mochilas hechas a mano para explorar sin límites.'
              : 'Handmade backpacks built to explore without limits.'}
          </Editable>

          <Editable id="alma_intro" as="p" className="alma-intro" multiline>
            {es
              ? 'Kapac Made nace de los Andes: un laboratorio de diseño donde cada mochila se cose una a una, con identidad propia. Creemos en el trabajo local, en los materiales que duran y en acompañarte en cada camino.'
              : 'Kapac Made is born from the Andes: a design lab where each backpack is sewn one by one, with its own identity. We believe in local craft, materials that last, and gear that follows you on every path.'}
          </Editable>

          <div className="alma-bloques">
            {bloques.map((key) => {
              const def = DEFAULTS_BLOQUE[key] || { t: ['', ''], d: ['', ''] };
              return (
                <section className="alma-bloque" key={key}>
                  <Editable id={`alma_${key}_titulo`} as="h2">{es ? def.t[0] : def.t[1]}</Editable>
                  <Editable id={`alma_${key}_texto`} as="p" multiline>{es ? def.d[0] : def.d[1]}</Editable>
                  {esAdmin && (
                    <button type="button" className="alma-bloque-quitar" onClick={() => quitarBloque(key)} title="Quitar">×</button>
                  )}
                </section>
              );
            })}
            {esAdmin && (
              <button type="button" className="alma-agregar-bloque" onClick={agregarBloque}>
                + Agregar bloque
              </button>
            )}
          </div>

          <Editable id="alma_cierre" as="p" className="alma-cierre">{es ? 'Explorar sin límites.' : 'Explore without limits.'}</Editable>
        </div>

        {/* Galería editable directo en la página */}
        {(fotos.length > 0 || esAdmin) && (
          <section className="alma-galeria-section">
            <div className="alma-galeria-grid">
              {fotos.map((foto, i) => {
                const esViejo = typeof foto === 'object' && foto !== null;
                const key = claveFotoDe(foto, i);
                const urlDefault = esViejo ? (foto.url || '') : '';
                const captionDefault = esViejo ? (foto.caption || '') : '';
                const tamano = textos[`alma_${key}_tamano`] || 'normal';

                return (
                  <div key={key} className={`alma-foto${tamano === 'grande' ? ' alma-foto--hero' : ''}`}>
                    <EditableImage id={`alma_${key}_img`} srcDefault={urlDefault} alt={captionDefault} className="alma-foto-img-wrap" carpeta="alma" />
                    <div className="alma-foto-overlay">
                      <Editable id={`alma_${key}_caption`} as="p" className="alma-foto-caption">{captionDefault}</Editable>
                    </div>
                    {esAdmin && (
                      <div className="alma-foto-admin">
                        <button
                          type="button"
                          className="alma-foto-tamano"
                          onClick={() => guardar(`alma_${key}_tamano`, tamano === 'grande' ? 'normal' : 'grande')}
                          title={tamano === 'grande' ? 'Achicar' : 'Agrandar'}
                        >
                          {tamano === 'grande' ? '⤡ Achicar' : '⤢ Agrandar'}
                        </button>
                        <button type="button" className="alma-foto-quitar-btn" onClick={() => quitarFoto(key)} title="Quitar foto">× Quitar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {esAdmin && (
              <button type="button" className="alma-agregar-foto" onClick={agregarFoto}>
                + Agregar foto
              </button>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
