import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTema } from '../../context/TemaContext';
import logoLocal from '../../assets/images/kapac_made_1.png';
import video from '../../assets/videos/proximamente.mp4';
import videoMovil from '../../assets/videos/proximamente-movil.mp4';
import videoFondo from '../../assets/videos/proximamente-fondo.mp4';
import poster from '../../assets/images/proximamente.jpg';
import './SitioCerrado.css';

const FRASES = ['COMING SOON', 'NEXT WEEK'];
const GLIFOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/*+<>';
const PANTALLA_ANCHA = '(min-aspect-ratio: 3/4)';
const MAPA = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Arequipa, Perú');
// Archivo ancha no es monoespaciada: cada casilla toma el ancho de la letra
// final para que la palabra no salte mientras las letras se mezclan.
const anchos = {};
let medidor = null;
function anchoLetra(c) {
  if (!(c in anchos)) {
    if (!medidor) {
      medidor = document.createElement('span');
      medidor.className = 'cerrado-medidor';
      document.body.appendChild(medidor);
    }
    medidor.textContent = c;
    anchos[c] = medidor.getBoundingClientRect().width / 100;
  }
  return anchos[c];
}

// La primera palabra va llena y la segunda en contorno
function enPalabras(letras) {
  const grupos = [[]];
  letras.forEach((l, i) => {
    if (l.final === ' ') grupos.push([]);
    else grupos[grupos.length - 1].push({ ...l, i });
  });
  return grupos;
}

// React no escribe el atributo muted y algunos celulares no reproducen solos sin él
function reproducir(v) {
  if (!v) return;
  v.muted = true;
  v.setAttribute('muted', '');
  v.play().catch(() => {});
}

// Las letras se mezclan y se van fijando de izquierda a derecha; cada pocos
// segundos la palabra se corta con un glitch y pasa a la siguiente frase.
function useTitulo() {
  const [letras, setLetras] = useState([]);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vuelta = 0;
    let reloj = null;
    let pausa = null;

    const siguiente = () => {
      const meta = FRASES[vuelta % FRASES.length].split('');
      vuelta++;
      if (quieto) {
        setLetras(meta.map((c) => ({ c, final: c, estado: 'fija' })));
        pausa = setTimeout(siguiente, 3200);
        return;
      }
      setCambiando(true);
      let cuadro = 0;
      reloj = setInterval(() => {
        cuadro++;
        if (cuadro === 8) setCambiando(false);
        setLetras(meta.map((c, i) => {
          const fijaEn = 8 + i * 2;
          if (cuadro < fijaEn) return { c: GLIFOS[Math.floor(Math.random() * GLIFOS.length)], final: c, estado: 'mezcla' };
          return { c, final: c, estado: cuadro < fijaEn + 3 ? 'destello' : 'fija' };
        }));
        if (cuadro > 12 + meta.length * 2) {
          clearInterval(reloj);
          pausa = setTimeout(siguiente, 3200);
        }
      }, 45);
    };

    pausa = setTimeout(siguiente, 400);
    return () => { clearInterval(reloj); clearTimeout(pausa); };
  }, []);

  return { letras, cambiando };
}

// Pantalla "Próximamente": lo que ve cualquier visitante cuando la tienda
// está cerrada desde el admin. El admin entra normal con su cuenta (/login).
export default function SitioCerrado() {
  const { logo, logoListo } = useTema();

  const [ancha, setAncha] = useState(() => window.matchMedia(PANTALLA_ANCHA).matches);
  const [fuenteLista, setFuenteLista] = useState(false);
  const { letras, cambiando } = useTitulo();
  const videoRef = useRef(null);
  const fondoRef = useRef(null);
  const refVideo = useCallback((v) => { videoRef.current = v; reproducir(v); }, []);
  const refFondo = useCallback((v) => { fondoRef.current = v; reproducir(v); }, []);

  const sincronizar = (e) => {
    const f = fondoRef.current;
    if (f && Math.abs(f.currentTime - e.target.currentTime) > 0.3) f.currentTime = e.target.currentTime;
  };

  useEffect(() => {
    if (!document.fonts) return;
    document.fonts.load('900 100px "Archivo"', 'COMING SOON NEXT WEEK')
      .then(() => setFuenteLista(true))
      .catch(() => {});
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
      <div className="cerrado-grano" />

      <header className="cerrado-top">
        <img
          src={logo || logoLocal}
          alt="Kapac Made"
          className="cerrado-logo"
          style={logoListo ? undefined : { opacity: 0 }}
        />
        <a className="cerrado-lugar" href={MAPA} target="_blank" rel="noopener noreferrer">
          Arequipa, Peru<br />16°24′S 71°32′W
        </a>
      </header>

      <h1 className={`cerrado-titulo ${cambiando ? 'cambiando' : ''}`} aria-label="Coming soon, next week">
        {enPalabras(letras).map((palabra, k) => (
          <span key={k} className={`cerrado-palabra${k ? ' contorno' : ''}`}>
            {palabra.map((l) => (
              <span
                key={l.i}
                className={l.estado}
                style={fuenteLista ? { width: `${anchoLetra(l.final)}em` } : undefined}
                aria-hidden="true"
              >
                {l.c}
              </span>
            ))}
          </span>
        ))}
      </h1>

      <footer className="cerrado-pie">
        <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        <span className="cerrado-pie-der">Powered by jarbit</span>
      </footer>

      <Link to="/login" className="cerrado-admin" aria-label="Admin">·</Link>
    </div>
  );
}
