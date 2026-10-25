import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useIdioma } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Icono from '../Icono';
import IconoInstagram from '../IconoInstagram';
import { INSTAGRAM } from '../../config/redes';
import './NavBar.css';

export default function NavBar() {
  const { totalItems } = useCart();
  const { idioma, setIdioma } = useIdioma();
  const { esAdmin, modoEdicion, setModoEdicion } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  const links = [
    { id: 'nav_shop',       label: 'Shop',       to: '/shop' },
    { id: 'nav_kapac_made', label: 'Kapac Made', to: '/kapac-made' },
    { id: 'nav_b2b',        label: 'B2B',        to: '/b2b'      },
    { id: 'nav_info',       label: 'Info',       to: '/info' },
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
          aria-label={idioma === 'en' ? 'Menu' : 'Menú'}
        >
          <span></span><span></span><span></span>
        </button>
      )}

      {/* Links + idioma — inline en desktop, dropdown en móvil */}
      <div className={`navbar-left ${menu ? 'abierto' : ''}`}>
        {/* X dentro del dropdown, arriba a la derecha */}
        {menu && (
          <button className="navbar-cerrar" onClick={cerrar} aria-label={idioma === 'en' ? 'Close' : 'Cerrar'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="navbar-link" onClick={cerrar}>
            <span>{l.label}</span>
          </Link>
        ))}

        {/* Idioma — después de Contacto */}
        <span className="navbar-langs">
          <button className={`navbar-lang ${idioma === 'es' ? 'activo' : ''}`} onClick={() => setIdioma('es')}>ES</button>
          <span className="navbar-lang-sep">/</span>
          <button className={`navbar-lang ${idioma === 'en' ? 'activo' : ''}`} onClick={() => setIdioma('en')} disabled={modoEdicion && esAdmin}
            title={modoEdicion && esAdmin ? 'Para ver el inglés sal del modo edición' : undefined}>EN</button>
        </span>

        {/* Admin — solo para el admin, al final. La página se ve como la ve un visitante
            hasta que se activa la edición */}
        {esAdmin && (
          <>
            <Link to="/admin" className="navbar-link navbar-admin" onClick={cerrar}><Icono nombre="candado" tam={13} /> Admin</Link>
            <button type="button" className={`navbar-link navbar-admin navbar-modo${modoEdicion ? ' activo' : ''}`}
              onClick={() => { setModoEdicion(!modoEdicion); cerrar(); }}
              title={modoEdicion ? 'Ver la página como un visitante' : 'Activar los lápices para editar'}>
              {modoEdicion
                ? <><Icono nombre="ojo" tam={13} /> Modo visita</>
                : <><Icono nombre="lapiz" tam={13} /> Editar</>}
            </button>
          </>
        )}
      </div>

      {/* Derecha — Instagram + carrito */}
      <div className="navbar-right">
        <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="navbar-ig" aria-label="Instagram"><IconoInstagram grosor={1.7} /></a>

        <button className="icon-btn cart-btn navbar-cart" aria-label={idioma === 'en' ? 'Cart' : 'Carrito'} onClick={() => navigate('/carrito')}>
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
