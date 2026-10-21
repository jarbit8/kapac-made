import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/images/logo.png';
import ojoVideo from '../../assets/videos/ojo.mp4';
import './LogoAnimado.css';

const DURACION_VISIBLE = 3000;
const DURACION_TRANSICION = 1200;

export default function LogoAnimado() {
  const [mostrar, setMostrar] = useState('logo'); // 'logo' | 'ojo'

  useEffect(() => {
    const ciclo = setInterval(() => {
      setMostrar(prev => prev === 'logo' ? 'ojo' : 'logo');
    }, DURACION_VISIBLE + DURACION_TRANSICION);
    return () => clearInterval(ciclo);
  }, []);

  const variantes = {
    entrada: {
      opacity: 0,
      scale: 0.3,
      filter: 'blur(30px) saturate(3)',
      rotate: -15,
      skewX: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px) saturate(1)',
      rotate: 0,
      skewX: 0,
      transition: {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1],
      }
    },
    salida: {
      opacity: 0,
      scale: 2.5,
      filter: 'blur(40px) saturate(0)',
      rotate: 15,
      skewX: -20,
      transition: {
        duration: 1.2,
        ease: [0.7, 0, 0.84, 0],
      }
    }
  };

  return (
    <div className="logo-animado-wrapper">
      <AnimatePresence mode="wait">
        {mostrar === 'logo' ? (
          <motion.img
            key="logo"
            src={logo}
            alt="Kapac Made"
            className="logo-animado-img"
            variants={variantes}
            initial="entrada"
            animate="visible"
            exit="salida"
          />
        ) : (
          <motion.video
            key="ojo"
            src={ojoVideo}
            autoPlay
            loop
            muted
            playsInline
            className="logo-animado-ojo"
            variants={variantes}
            initial="entrada"
            animate="visible"
            exit="salida"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
