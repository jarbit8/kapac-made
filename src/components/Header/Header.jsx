import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Header.css';
import LogoAnimado from './LogoAnimado';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const categories = [
    { label: 'Inicio',                to: '/' },
    { label: 'Catálogo',              to: '/catalogo' },
    { label: 'El alma de Kapac Made', to: '/alma' },
    { label: 'Contacto',              to: '/contacto' },
    { label: 'Legal',                 to: '/legal' },
    { label: '🎮 Marcador Bomber',    to: '/bomber' },
  ];

  return (
    <header className="header">
      <div className="header-container">

        <button
          className={`menu-toggle ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {menuOpen && (
          <nav className="sidebar-menu">
            <ul>
              {categories.map((cat, i) => (
                <li key={i}>
                  <Link to={cat.to} onClick={() => setMenuOpen(false)}>{cat.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <Link to="/" className="logo">
          <LogoAnimado />
        </Link>

        <div className="header-icons">
          <button className="icon-btn" aria-label="Buscar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          <button className="icon-btn" aria-label="Mi cuenta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
          <button className="icon-btn" aria-label="Carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
