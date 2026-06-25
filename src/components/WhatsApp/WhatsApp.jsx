import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './WhatsApp.css';

const NUMERO = '51997050752'; // +51 997 050 752
const MENSAJE = encodeURIComponent('¡Hola Kapac Made! 🎒 Tengo una consulta sobre sus mochilas.');

export default function WhatsApp() {
  const { pathname } = useLocation();
  const enHome = pathname === '/';
  // En home: aparece solo tras pasar el video. En otras páginas: siempre visible.
  const [visible, setVisible] = useState(!enHome);

  useEffect(() => {
    if (pathname !== '/') { setVisible(true); return; }
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return (
    <a
      className={`wa-float ${visible ? '' : 'wa-oculto'}`}
      href={`https://wa.me/${NUMERO}?text=${MENSAJE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
    >
      {/* Burbuja de chat con 3 puntos */}
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.028 2 11c0 2.58 1.077 4.923 2.82 6.622L4 22l4.572-1.592A10.56 10.56 0 0 0 12 21c5.523 0 10-4.028 10-9s-4.477-9-10-9z"/>
        <circle cx="8.5" cy="11" r="1.2" fill="#fff"/>
        <circle cx="12" cy="11" r="1.2" fill="#fff"/>
        <circle cx="15.5" cy="11" r="1.2" fill="#fff"/>
      </svg>
    </a>
  );
}
