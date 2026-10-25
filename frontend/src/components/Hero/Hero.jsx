import React, { useState, useEffect, useRef } from 'react';
import '../../styles/Hero.css';
import { obtenerContenido, contenidoGuardado, normalizarMedio, cambiarContenido } from '../../firebase/contenido';
import { fotoRapida } from '../../utils/fotos';
import CambiarMedio from '../CambiarMedio';
import useEsMobile from '../../hooks/useEsMobile';

export default function Hero() {
  const esMobile = useEsMobile();
  const [videoCfg, setVideoCfg] = useState(() => contenidoGuardado()?.heroVideo ?? null);
  const [fallo, setFallo] = useState(false);
  const cambiado = useRef(false); // la lectura inicial puede llegar tarde y no debe borrar lo que el admin acaba de cambiar

  useEffect(() => {
    obtenerContenido().then((c) => {
      if (!cambiado.current) setVideoCfg(c.heroVideo || null);
    }).catch(() => {});
  }, []);

  const medio = videoCfg ? normalizarMedio(esMobile ? videoCfg.mobile : videoCfg.pc) : null;

  const cambiarFondo = (slot) => async (nuevo) => {
    cambiado.current = true;
    const c = await cambiarContenido((b) => ({ heroVideo: { ...(b.heroVideo || {}), [slot]: nuevo } }));
    setVideoCfg(c.heroVideo);
    setFallo(false);
  };

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

      <div className="hero-editar cambiar-medio-grupo">
        <CambiarMedio texto="Foto o video · computadora" carpeta="fondos"
          anterior={normalizarMedio(videoCfg?.pc)?.url} alSubir={cambiarFondo('pc')} />
        <CambiarMedio texto="Foto o video · celular" carpeta="fondos"
          anterior={normalizarMedio(videoCfg?.mobile)?.url} alSubir={cambiarFondo('mobile')} />
      </div>

      <svg className="hero-flecha" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="6" y1="0" x2="6" y2="14" stroke="white" strokeWidth="1"/>
        <polyline points="2,10 6,15 10,10" fill="none" stroke="white" strokeWidth="1"/>
      </svg>
    </section>
  );
}
