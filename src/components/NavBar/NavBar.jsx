import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useIdioma } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { esCorreoAdmin } from '../../config/admins';
import Editable from '../Editable';
import './NavBar.css';

const IconIg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

export default function NavBar() {
  const { totalItems } = useCart();
  const { idioma, setIdioma, t } = useIdioma();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = esCorreoAdmin(usuario?.email);
  const [menu, setMenu] = useState(false);

  const links = [
    { id: 'nav_shop',       label: 'Shop',       to: '/catalogo' },
    { id: 'nav_kapac_made', label: 'Kapac Made', to: '/alma'     },
    { id: 'nav_b2b',        label: 'B2B',        to: '/b2b'      },
    { id: 'nav_info',       label: 'Info',       to: '/contacto' },
  ];

  const cerrar = () => setMenu(false);

  return (
    <>
    <nav className="navbar-sticky">

      {/* Hamburguesa (solo móvil) — se oculta cuando el menú está abierto */}
      {!menu && (
        <button
          className="navbar-burger"
          onClick={() => setMenu(true)}
          aria-label="Menú"
        >
          <span></span><span></span><span></span>
        </button>
      )}

      {/* Links + idioma — inline en desktop, dropdown en móvil */}
      <div className={`navbar-left ${menu ? 'abierto' : ''}`}>
        {/* X dentro del dropdown, arriba a la derecha */}
        {menu && (
          <button className="navbar-cerrar" onClick={cerrar} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="navbar-link" onClick={cerrar}>
            <Editable id={l.id} as="span" sinColor>{l.label}</Editable>
          </Link>
        ))}

        {/* Idioma — después de Contacto */}
        <span className="navbar-langs">
          <button className={`navbar-lang ${idioma === 'es' ? 'activo' : ''}`} onClick={() => setIdioma('es')}>ES</button>
          <span className="navbar-lang-sep">/</span>
          <button className={`navbar-lang ${idioma === 'en' ? 'activo' : ''}`} onClick={() => setIdioma('en')}>EN</button>
        </span>

        {/* Admin — solo para el admin, al final */}
        {esAdmin && (
          <Link to="/admin" className="navbar-link navbar-admin" onClick={cerrar}>🔒 Admin</Link>
        )}
      </div>

      {/* Derecha — Instagram + carrito */}
      <div className="navbar-right">
        <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer" className="navbar-ig" aria-label="Instagram"><IconIg /></a>

        <button className="icon-btn cart-btn navbar-cart" aria-label="Carrito" onClick={() => navigate('/carrito')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
        </button>
      </div>

      {/* Fondo para cerrar el menú (móvil) */}
      {menu && <div className="navbar-backdrop" onClick={cerrar} />}
    </nav>
    </>
  );
}
