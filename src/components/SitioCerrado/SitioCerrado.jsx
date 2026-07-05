import React from 'react';
import { Link } from 'react-router-dom';
import { useTema } from '../../context/TemaContext';
import { useIdioma } from '../../context/LanguageContext';
import logoLocal from '../../assets/images/kapac_made_1.png';
import './SitioCerrado.css';

// Pantalla "Próximamente": lo que ve cualquier visitante cuando la tienda
// está cerrada desde el admin. El admin entra normal con su cuenta (/login).
export default function SitioCerrado() {
  const { logo, logoListo } = useTema();
  const { idioma } = useIdioma();
  const es = idioma === 'es';

  return (
    <div className="cerrado-page">
      <img
        src={logo || logoLocal}
        alt="Kapac Made"
        className="cerrado-logo"
        style={logoListo ? undefined : { opacity: 0 }}
      />
      <p className="cerrado-txt">{es ? 'Próximamente' : 'Coming soon'}</p>
      <a
        className="cerrado-ig"
        href="https://www.instagram.com/kapac.made/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Instagram
      </a>
      <Link to="/login" className="cerrado-admin" aria-label="Admin">·</Link>
    </div>
  );
}
