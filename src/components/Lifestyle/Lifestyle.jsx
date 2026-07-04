import React, { useEffect, useState } from 'react';
import './Lifestyle.css';
import Editable from '../Editable';
import EditableImage from '../EditableImage';
import { useIdioma } from '../../context/LanguageContext';
import { useTextos } from '../../context/TextosContext';
import { useTraducido } from '../../i18n/useTraducido';
import { obtenerContenido, guardarContenido, HOME_FOTOS_DEFAULT } from '../../firebase/contenido';

// Texto/imagen por defecto de las 4 fotos originales (las nuevas arrancan vacías).
const DEFAULTS_FOTO = {
  foto1: { url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&q=80&fit=crop', t: ['Explorar', 'Explore'], d: ['Desde la ciudad hasta los 5,000 metros.\nDiseñada para no detenerte.', 'From the city to 5,000 meters.\nBuilt to keep you moving.'] },
  foto2: { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80&fit=crop', t: ['Los Andes', 'The Andes'], d: ['Arequipa, Perú.', 'Arequipa, Peru.'] },
  foto3: { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80&fit=crop', t: ['Naturaleza', 'Nature'], d: ['Cada diseño nace de un paisaje real.\nNinguna mochila es igual a otra.', 'Every design is born from a real landscape.\nNo two backpacks are alike.'] },
  foto4: { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80&fit=crop', t: ['Artesanía', 'Craft'], d: ['Hecho a mano, uno a uno.', 'Handmade, one by one.'] },
};

// Texto de las fotos en formato viejo ({url,titulo,desc}, un solo idioma):
// se traduce solo al inglés mientras el admin no lo pise con el lápiz.
function EditableTraducido({ id, as = 'span', className = '', multiline = false, texto, idioma }) {
  const traducido = useTraducido(texto, idioma);
  return <Editable id={id} as={as} className={className} multiline={multiline}>{traducido}</Editable>;
}

export default function Lifestyle() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const { esAdmin } = useTextos();
  const [contenido, setContenido] = useState(null);

  useEffect(() => {
    obtenerContenido().then(setContenido).catch(() => {});
  }, []);

  const fotos = contenido?.homeFotos || HOME_FOTOS_DEFAULT;

  const guardarFotos = async (nuevas) => {
    const base = contenido || await obtenerContenido();
    const nuevo = { ...base, homeFotos: nuevas };
    setContenido(nuevo);
    try { await guardarContenido(nuevo); } catch (_) { /* error silencioso */ }
  };

  const claveDe = (foto, i) => (typeof foto === 'object' && foto !== null) ? `legacy${i}` : foto;

  const agregarFoto = () => guardarFotos([...fotos, `foto_${Date.now()}`]);
  const quitarFoto = (key) => guardarFotos(fotos.filter((f, i) => claveDe(f, i) !== key));

  return (
    <section className="lm-section">

      {/* Grid 2×2 */}
      <div className="lm-grid">
        {fotos.map((foto, i) => {
          // "foto" puede ser una clave nueva (string) o un objeto viejo {url,titulo,desc}
          const esViejo = typeof foto === 'object' && foto !== null;
          const key = claveDe(foto, i);
          const defReal = DEFAULTS_FOTO[key];
          // Si la clave coincide con una de las 4 fotos originales, el texto bilingüe
          // conocido tiene prioridad (así sí traduce). Si no, se usa el dato viejo (1 solo idioma).
          const urlDefault = defReal ? ((esViejo && foto.url) || defReal.url) : (esViejo ? (foto.url || '') : '');
          const tituloDefault = defReal ? (es ? defReal.t[0] : defReal.t[1]) : (esViejo ? (foto.titulo || '') : '');
          const descDefault = defReal ? (es ? defReal.d[0] : defReal.d[1]) : (esViejo ? (foto.desc || '') : '');

          return (
            <div key={key} className="lm-item">
              <EditableImage id={`home_${key}_img`} srcDefault={urlDefault} alt={tituloDefault} className="lm-img-wrap" carpeta="home" />
              <div className="lm-caption">
                {esViejo && !defReal ? (
                  <>
                    <EditableTraducido id={`home_${key}_titulo`} as="span" className="lm-caption-title" texto={tituloDefault} idioma={idioma} />
                    <EditableTraducido id={`home_${key}_desc`} as="p" className="lm-caption-desc" multiline texto={descDefault} idioma={idioma} />
                  </>
                ) : (
                  <>
                    <Editable id={`home_${key}_titulo`} as="span" className="lm-caption-title">{tituloDefault}</Editable>
                    <Editable id={`home_${key}_desc`} as="p" className="lm-caption-desc" multiline>{descDefault}</Editable>
                  </>
                )}
                {esAdmin && (
                  <button type="button" className="lm-quitar" onClick={() => quitarFoto(key)} title="Quitar foto">× Quitar</button>
                )}
              </div>
            </div>
          );
        })}

        {esAdmin && (
          <button type="button" className="lm-item lm-agregar" onClick={agregarFoto}>
            <div className="lm-img-wrap lm-agregar-caja">+ Agregar foto</div>
          </button>
        )}
      </div>

      {/* Línea inferior + texto — abre la pantalla épica en pestaña nueva */}
      <div className="lm-footer">
        <a
          href={`${window.location.origin}${window.location.pathname}#/zone`}
          target="_blank"
          rel="noopener noreferrer"
          className="lm-footer-txt"
          onClick={(e) => {
            // Los controles del Editable (lápiz, color, fuente) viven dentro del enlace:
            // si el clic viene de ellos no hay que abrir /zone.
            if (e.target.closest('select, input, button, .editable-edit')) e.preventDefault();
          }}
        >
          <Editable id="home_in_the_zone" as="span">in the zone</Editable>
        </a>
      </div>

    </section>
  );
}
