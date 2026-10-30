import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTema } from '../../context/TemaContext';
import { fotoRapida } from '../../utils/fotos';
import logoLocal from '../../assets/images/kapac_made_1.png';
import video from '../../assets/videos/proximamente.mp4';
import videoMovil from '../../assets/videos/proximamente-movil.mp4';
import videoFondo from '../../assets/videos/proximamente-fondo.mp4';
import poster from '../../assets/images/proximamente.jpg';
import './SitioCerrado.css';

const PALABRAS = ['COMING', 'SOON'];
const PANTALLA_ANCHA = '(min-aspect-ratio: 3/4)';
const MAPA = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Arequipa, Perú');

// React no escribe el atributo muted y algunos celulares no reproducen solos sin él
function reproducir(v) {
  if (!v) return;
  v.muted = true;
  v.setAttribute('muted', '');
  v.play().catch(() => {});
}

// Pantalla "Próximamente": lo que ve cualquier visitante cuando la tienda
// está cerrada desde el admin. El admin entra normal con su cuenta (/login).
export default function SitioCerrado() {
  const { logo, logoListo } = useTema();

  const [ancha, setAncha] = useState(() => window.matchMedia(PANTALLA_ANCHA).matches);
  const [fuenteLista, setFuenteLista] = useState(false);
  const videoRef = useRef(null);
  const fondoRef = useRef(null);
  const refVideo = useCallback((v) => { videoRef.current = v; reproducir(v); }, []);
  const refFondo = useCallback((v) => { fondoRef.current = v; reproducir(v); }, []);

  const sincronizar = (e) => {
    const f = fondoRef.current;
    if (f && Math.abs(f.currentTime - e.target.currentTime) > 0.3) f.currentTime = e.target.currentTime;
  };

  // El título entra cuando llegó su letra (o al segundo y medio, aunque no llegue)
  useEffect(() => {
    const listo = () => setFuenteLista(true);
    const reloj = setTimeout(listo, 1500);
    document.fonts?.load('900 100px "Archivo"', 'COMING SOON').then(listo).catch(() => {});
    return () => clearTimeout(reloj);
  }, []);

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
    // Con ahorro de batería algunos celulares no reproducen solos: arranca al primer toque
    const toques = ['touchstart', 'pointerdown', 'scroll', 'keydown'];
    toques.forEach((t) => window.addEventListener(t, alVolver, { passive: true }));
    return () => {
      mq.removeEventListener('change', onCambio);
      document.removeEventListener('visibilitychange', alVolver);
      toques.forEach((t) => window.removeEventListener(t, alVolver));
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
        src={ancha ? video : videoMovil}
        poster={poster}
        className="cerrado-video"
        autoPlay loop muted playsInline aria-hidden="true"
        onTimeUpdate={sincronizar}
      />
      <div className="cerrado-velo" />
      <div className="cerrado-luz" />
      <div className="cerrado-grano" />
      {fuenteLista && <div className="cerrado-destello" />}

      <header className="cerrado-top">
        <img
          src={fotoRapida(logo) || logoLocal}
          alt="Kapac Made"
          className="cerrado-logo"
          style={logoListo ? undefined : { opacity: 0 }}
        />
        <a className="cerrado-lugar" href={MAPA} target="_blank" rel="noopener noreferrer">
          Arequipa, Peru<br />16°24′S 71°32′W
        </a>
      </header>

      {/* Entra como en un tráiler: las letras suben desde el desenfoque y se juntan,
          golpe de luz y, cada tanto, un corte */}
      <h1 className={`cerrado-titulo${fuenteLista ? ' listo' : ''}`} aria-label="Coming soon">
        {PALABRAS.map((palabra, k) => (
          <span key={palabra} className={`cerrado-palabra${k ? ' contorno' : ''}`} aria-hidden="true">
            {palabra.split('').map((c, i) => (
              <span key={i} style={{ '--i': k * PALABRAS[0].length + i }}>{c}</span>
            ))}
          </span>
        ))}
      </h1>

      <footer className="cerrado-pie">
        <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer" className="cerrado-ig">Instagram ↗</a>
        <span className="cerrado-pie-der">Powered by jarbit</span>
      </footer>
    </div>
  );
}
