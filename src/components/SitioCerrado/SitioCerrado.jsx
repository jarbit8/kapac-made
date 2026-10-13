import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTema } from '../../context/TemaContext';
import { useIdioma } from '../../context/LanguageContext';
import { obtenerContenido, normalizarMedio } from '../../firebase/contenido';
import { HERO_CACHE_KEY } from '../Hero/Hero';
import logoLocal from '../../assets/images/kapac_made_1.png';
import videoLocal from '../../assets/videos/ojo.mp4';
import './SitioCerrado.css';

const WHATSAPP = 'https://wa.me/51997050752?text=' +
  encodeURIComponent('¡Hola Kapac Made! 🎒 Tengo una consulta sobre sus mochilas.');

const FRASES = {
  es: ['Hecho a mano, uno a uno', 'Desde la ciudad hasta los 5,000 metros', 'Ninguna mochila es igual a otra', 'Arequipa, Perú'],
  en: ['Handmade, one by one', 'From the city to 5,000 meters', 'No two backpacks are alike', 'Arequipa, Peru'],
};

function horaArequipa() {
  return new Date().toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

// Pantalla "Próximamente": lo que ve cualquier visitante cuando la tienda
// está cerrada desde el admin. El admin entra normal con su cuenta (/login).
export default function SitioCerrado() {
  const { logo, logoListo } = useTema();
  const { idioma, setIdioma } = useIdioma();
  const es = idioma === 'es';

  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [videoCfg, setVideoCfg] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HERO_CACHE_KEY)); }
    catch (_) { return null; }
  });
  const [fallo, setFallo] = useState(false);
  const [hora, setHora] = useState(horaArequipa);

  useEffect(() => {
    const onResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    const reloj = setInterval(() => setHora(horaArequipa()), 1000);
    obtenerContenido().then((c) => setVideoCfg(c.heroVideo || null)).catch(() => {});
    return () => { window.removeEventListener('resize', onResize); clearInterval(reloj); };
  }, []);

  const medio = videoCfg ? normalizarMedio(esMobile ? videoCfg.mobile : videoCfg.pc) : null;
  const usarSubido = medio && medio.url && !fallo;
  const titulo = es ? 'Próximamente' : 'Coming soon';
  const frases = FRASES[es ? 'es' : 'en'];
  const cinta = [...frases, ...frases, ...frases, ...frases];

  return (
    <div className="cerrado-page">
      {usarSubido && medio.tipo === 'imagen' ? (
        <img src={medio.url} alt="" className="cerrado-bg" onError={() => setFallo(true)} />
      ) : (
        <video
          key={usarSubido ? medio.url : videoLocal}
          src={usarSubido ? medio.url : videoLocal}
          className="cerrado-bg"
          autoPlay
          loop
          muted
          playsInline
          onError={() => { if (usarSubido) setFallo(true); }}
        />
      )}
      <div className="cerrado-velo" />
      <div className="cerrado-grano" />

      <header className="cerrado-top">
        <span>{es ? 'Arequipa, Perú' : 'Arequipa, Peru'}<br />16°24′S 71°32′W</span>
        <span className="cerrado-top-der">
          <span className="cerrado-idioma">
            <button className={es ? 'activo' : ''} onClick={() => setIdioma('es')}>ES</button>
            /
            <button className={es ? '' : 'activo'} onClick={() => setIdioma('en')}>EN</button>
          </span>
          <span>AQP {hora}</span>
        </span>
      </header>

      <main className="cerrado-centro">
        <img
          src={logo || logoLocal}
          alt="Kapac Made"
          className="cerrado-logo"
          style={logoListo ? undefined : { opacity: 0 }}
        />
      </main>

      <h1 className="cerrado-titulo" style={{ '--n': titulo.length }} aria-label={titulo}>
        {titulo.split('').map((letra, i) => (
          <span key={`${idioma}-${i}`} style={{ '--i': i }} aria-hidden="true">
            {letra === ' ' ? ' ' : letra}
          </span>
        ))}
      </h1>

      <div className="cerrado-cinta" aria-hidden="true">
        <div className="cerrado-cinta-pista">
          {cinta.map((f, i) => <span key={i}>{f}<b>✳</b></span>)}
        </div>
      </div>

      <footer className="cerrado-pie">
        <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
        <span className="cerrado-pie-der">© Kapac Made</span>
      </footer>

      <Link to="/login" className="cerrado-admin" aria-label="Admin">·</Link>
    </div>
  );
}
