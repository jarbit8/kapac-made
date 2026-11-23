import React from 'react';
import { useIdioma } from '../../context/LanguageContext';
import IconoGoogle from './IconoGoogle';

export default function FormularioLogin({ login }) {
  const { t, idioma } = useIdioma();
  const {
    cerrado, modoActual, cambiarModo, email, setEmail, password, setPassword,
    error, aviso, cargando, handleSubmit, handleOlvide, handleGoogle,
  } = login;

  return (
    <>
      <h1 className="solo-lector">{t('menu.iniciar_sesion')}</h1>
      <div className="login-card">
        <div className="login-tabs">
          <button
            className={modoActual === 'login' ? 'activo' : ''}
            onClick={() => cambiarModo('login')}
          >
            <span>{t('menu.iniciar_sesion')}</span>
          </button>
          {!cerrado && (
            <button
              className={modoActual === 'registro' ? 'activo' : ''}
              onClick={() => cambiarModo('registro')}
            >
              <span>{t('login.crear_cuenta')}</span>
            </button>
          )}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            autoComplete="email"
            aria-label={t('login.email')}
            placeholder={t('login.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            name="password"
            autoComplete={modoActual === 'login' ? 'current-password' : 'new-password'}
            aria-label={t('login.password')}
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          {aviso && <p className="login-aviso">{aviso}</p>}
          <button type="submit" className="login-btn" disabled={cargando}>
            <span>{cargando ? (idioma === 'en' ? 'Loading...' : 'Cargando...') : (modoActual === 'login' ? t('login.entrar') : t('login.crear_cuenta'))}</span>
          </button>
          {modoActual === 'login' && (
            <button type="button" className="login-olvide" onClick={handleOlvide} disabled={cargando}>
              {t('login.olvide')}
            </button>
          )}
        </form>

        <div className="login-divider"><span><span>{t('login.o')}</span></span></div>

        <button className="login-google" onClick={handleGoogle} disabled={cargando}>
          <IconoGoogle />
          <span><span>{t('login.google')}</span></span>
        </button>
      </div>
    </>
  );
}
