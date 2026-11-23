import React from 'react';
import { Link } from 'react-router-dom';
import { cerrarSesion } from '../../firebase/auth';
import { useIdioma } from '../../context/LanguageContext';

// Si ya está logueado, mostrar info de la cuenta en vez del form
export default function CuentaActiva({ cuenta }) {
  const { t, idioma } = useIdioma();

  const handleLogout = async () => {
    await cerrarSesion();
  };

  return (
    <>
      <h1 className="solo-lector">{t('menu.mi_cuenta')}</h1>
      <div className="login-card login-logueado">
        <div className="login-avatar-grande">
          {(cuenta.displayName || cuenta.email || '?').charAt(0).toUpperCase()}
        </div>
        <h2><span>{idioma === 'es' ? '¡Ya estás dentro!' : 'You\'re signed in!'}</span></h2>
        <p className="login-email-mostrar">{cuenta.email}</p>
        <p className="login-nota">
          <span>{idioma === 'es'
            ? 'Tienes sesión iniciada con esta cuenta.'
            : 'You\'re signed in with this account.'}</span>
        </p>

        <div className="login-acciones">
          <Link to="/perfil" className="login-btn">
            <span>{idioma === 'es' ? 'Mi cuenta' : 'My account'}</span>
          </Link>
          <Link to="/pedidos" className="login-btn login-btn-secundario">
            <span>{idioma === 'es' ? 'Mis pedidos' : 'My orders'}</span>
          </Link>
          <button onClick={handleLogout} className="login-btn login-btn-cerrar">
            <span>{idioma === 'es' ? 'Cerrar sesión' : 'Sign out'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
