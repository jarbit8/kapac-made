import React, { useState, useEffect } from 'react';
import '../../styles/Hero.css';
import { obtenerContenido, contenidoGuardado, normalizarMedio } from '../../firebase/contenido';
import { fotoRapida } from '../../utils/fotos';

// Clave compartida con Admin.jsx para sincronizar el cache del hero.
export const HERO_CACHE_KEY = 'kapac_hero_v1';

export default function Hero() {
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);
  const [videoCfg, setVideoCfg] = useState(() => contenidoGuardado()?.heroVideo ?? null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const handleResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    obtenerContenido().then((c) => {
      setVideoCfg(c.heroVideo || null);
    }).catch(() => {});
  }, []);

  const medio = videoCfg ? normalizarMedio(esMobile ? videoCfg.mobile : videoCfg.pc) : null;

  // Sin portada (o si no carga) queda el fondo de carga con el logo
  return (
    <section className="hero">
      {medio && medio.url && !fallo && (
        medio.tipo === 'imagen' ? (
          <img src={fotoRapida(medio.url)} alt="Kapac Made" className="hero-bg" fetchpriority="high"
            onError={(e) => {
              // Si falla la copia publicada, se intenta con Storage
              if (e.currentTarget.src !== medio.url) e.currentTarget.src = medio.url;
              else setFallo(true);
            }} />
        ) : (
          <video
            key={medio.url}
            src={fotoRapida(medio.url)}
            autoPlay
            loop
            muted
            playsInline
            className="hero-bg"
            onError={() => setFallo(true)}
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
