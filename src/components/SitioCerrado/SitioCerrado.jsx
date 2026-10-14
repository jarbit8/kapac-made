import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTema } from '../../context/TemaContext';
import { useIdioma } from '../../context/LanguageContext';
import logoLocal from '../../assets/images/kapac_made_1.png';
import video from '../../assets/videos/proximamente.mp4';
import videoFondo from '../../assets/videos/proximamente-fondo.mp4';
import poster from '../../assets/images/proximamente.jpg';
import './SitioCerrado.css';

const WHATSAPP = 'https://wa.me/51997050752?text=' +
  encodeURIComponent('¡Hola Kapac Made! 🎒 Tengo una consulta sobre sus mochilas.');

const PALABRAS = { es: 'PRÓXIMAMENTE', en: 'COMING SOON' };
const GLIFOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/*+<>';
const PANTALLA_ANCHA = '(min-aspect-ratio: 3/4)';

// React no escribe el atributo muted y algunos celulares no reproducen solos sin él
function reproducir(v) {
  if (!v) return;
  v.muted = true;
  v.setAttribute('muted', '');
  v.play().catch(() => {});
}

// Las letras se mezclan y se van fijando de izquierda a derecha;
// cada pocos segundos el título pasa al otro idioma.
function useTitulo(primero) {
  const [letras, setLetras] = useState(() => PALABRAS[primero].split('').map((c) => ({ c, estado: 'fija' })));

  useEffect(() => {
    const orden = primero === 'es' ? ['es', 'en'] : ['en', 'es'];
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vuelta = 0;
    let reloj = null;
    let pausa = null;

    const siguiente = () => {
      const meta = PALABRAS[orden[vuelta % 2]].split('');
      vuelta++;
      if (quieto) {
        setLetras(meta.map((c) => ({ c, estado: 'fija' })));
        pausa = setTimeout(siguiente, 4000);
        return;
      }
      let cuadro = 0;
      reloj = setInterval(() => {
        cuadro++;
        setLetras(meta.map((c, i) => {
          const fijaEn = 8 + i * 2;
          if (cuadro < fijaEn) return { c: GLIFOS[Math.floor(Math.random() * GLIFOS.length)], estado: 'mezcla' };
          return { c, estado: cuadro < fijaEn + 3 ? 'destello' : 'fija' };
        }));
        if (cuadro > 12 + meta.length * 2) {
          clearInterval(reloj);
          pausa = setTimeout(siguiente, 4000);
        }
      }, 45);
    };

    pausa = setTimeout(siguiente, 500);
    return () => { clearInterval(reloj); clearTimeout(pausa); };
  }, [primero]);

  return letras;
}

// Pantalla "Próximamente": lo que ve cualquier visitante cuando la tienda
// está cerrada desde el admin. El admin entra normal con su cuenta (/login).
export default function SitioCerrado() {
  const { logo, logoListo } = useTema();
  const { idioma } = useIdioma();
  const es = idioma === 'es';

  const [ancha, setAncha] = useState(() => window.matchMedia(PANTALLA_ANCHA).matches);
  const letras = useTitulo(es ? 'es' : 'en');
  const videoRef = useRef(null);
  const fondoRef = useRef(null);
  const refVideo = useCallback((v) => { videoRef.current = v; reproducir(v); }, []);
  const refFondo = useCallback((v) => { fondoRef.current = v; reproducir(v); }, []);

  const sincronizar = (e) => {
    const f = fondoRef.current;
    if (f && Math.abs(f.currentTime - e.target.currentTime) > 0.3) f.currentTime = e.target.currentTime;
  };

  useEffect(() => {
    const mq = window.matchMedia(PANTALLA_ANCHA);
    const onCambio = () => setAncha(mq.matches);
    mq.addEventListener('change', onCambio);
    const alVolver = () => {
      if (document.hidden) return;
      reproducir(videoRef.current);
      reproducir(fondoRef.current);
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      mq.removeEventListener('change', onCambio);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  return (
    <div className="cerrado-page">
      {ancha && (
        <video
          ref={refFondo}
          src={videoFondo}
          className="cerrado-fondo"
          autoPlay loop muted playsInline aria-hidden="true"
        />
      )}
      <video
        ref={refVideo}
        src={video}
        poster={poster}
        className="cerrado-video"
        autoPlay loop muted playsInline aria-hidden="true"
        onTimeUpdate={sincronizar}
      />
      <div className="cerrado-velo" />
      <div className="cerrado-grano" />

      <header className="cerrado-top">
        <img
          src={logo || logoLocal}
          alt="Kapac Made"
          className="cerrado-logo"
          style={logoListo ? undefined : { opacity: 0 }}
        />
        <span className="cerrado-lugar">{es ? 'Arequipa, Perú' : 'Arequipa, Peru'}<br />16°24′S 71°32′W</span>
      </header>

      <h1 className="cerrado-titulo" aria-label={es ? 'Próximamente' : 'Coming soon'}>
        {letras.map((l, i) => (
          <span key={i} className={l.estado} aria-hidden="true">{l.c === ' ' ? ' ' : l.c}</span>
        ))}
      </h1>

      <footer className="cerrado-pie">
        <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
        <span className="cerrado-pie-der">© Kapac Made</span>
      </footer>

      <Link to="/login" className="cerrado-admin" aria-label="Admin">·</Link>
    </div>
  );
}
