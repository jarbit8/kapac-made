import React, { useState, useEffect } from 'react';
import '../../styles/Hero.css';
import videoFallback from '../../assets/videos/ojo.mp4';
import { obtenerContenido, normalizarMedio } from '../../firebase/contenido';

// Clave compartida con Admin.jsx para sincronizar el cache del hero.
export const HERO_CACHE_KEY = 'kapac_hero_v1';

export default function Hero() {
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [videoCfg, setVideoCfg] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HERO_CACHE_KEY)); }
    catch (_) { return null; }
  });
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    obtenerContenido().then((c) => {
      const cfg = c.heroVideo || null;
      setVideoCfg(cfg);
      try { localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(cfg)); } catch (_) {}
    }).catch(() => {});
  }, []);

  const videoLocal = videoFallback;
  const medio = videoCfg ? normalizarMedio(esMobile ? videoCfg.mobile : videoCfg.pc) : null;
  const usarSubido = medio && medio.url && !fallo;

  return (
    <section className="hero">
      {videoCfg !== null && (
        usarSubido && medio.tipo === 'imagen' ? (
          <img src={medio.url} alt="Kapac Made" className="hero-bg"
            onError={() => setFallo(true)} />
        ) : (
          <video
            key={usarSubido ? medio.url : videoLocal}
            src={usarSubido ? medio.url : videoLocal}
            autoPlay
            loop
            muted
            playsInline
            className="hero-bg"
            onError={() => { if (usarSubido) setFallo(true); }}
          />
        )
      )}
      <div className="hero-overlay" />

      <div className="hero-content hero-content-center">
      </div>

      <svg className="hero-flecha" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="6" y1="0" x2="6" y2="14" stroke="white" strokeWidth="1"/>
        <polyline points="2,10 6,15 10,10" fill="none" stroke="white" strokeWidth="1"/>
      </svg>
    </section>
  );
}
