import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { registrar, iniciarSesion, iniciarSesionGoogle, enviarRecuperacion, cerrarSesion } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { useTema } from '../context/TemaContext';
import { esCorreoAdmin } from '../config/admins';
import '../styles/Login.css';

export default function Login() {
  const location = useLocation();
  // Detectar si vienen desde "Regístrate" (?modo=registro)
  const params = new URLSearchParams(location.search);
  const modoInicial = params.get('modo') === 'registro' ? 'registro' : 'login';
  const [modo, setModo] = useState(modoInicial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);
  const [redirigir, setRedirigir] = useState(false);
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const { cerrado } = useTema();
  // Con la tienda cerrada solo entra el admin: cualquier otra cuenta se cierra al instante
  const bloqueado = cerrado && usuario && !esCorreoAdmin(usuario.email);
  const modoActual = cerrado ? 'login' : modo;

  useEffect(() => {
    if (!bloqueado) return;
    cerrarSesion();
    setRedirigir(false);
    setError(idioma === 'en' ? 'For now only the administrator can sign in.' : 'Por ahora solo el administrador puede entrar.');
  }, [bloqueado, idioma]);

  // No navegar apenas resuelve el login: hay que esperar a que el contexto
  // de auth (usuario) se actualice de verdad. Si navegamos antes, la pantalla
  // "Próximamente" alcanza a renderizar con el usuario todavía en null y
  // el admin ve el sitio cerrado por una fracción de segundo (o hasta que
  // recarga, si no nota que se autocorrige).
  useEffect(() => {
    if (redirigir && usuario && !bloqueado) navigate('/');
  }, [redirigir, usuario, bloqueado, navigate]);

  const handleLogout = async () => {
    await cerrarSesion();
  };

  const traducirError = (code) => {
    const mapaES = {
      'auth/invalid-email': 'El correo no es válido.',
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    };
    const mapaEN = {
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-not-found': 'No account exists with that email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/email-already-in-use': 'An account with that email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
    };
    const mapa = idioma === 'en' ? mapaEN : mapaES;
    const fallback = idioma === 'en' ? 'An error occurred. Please try again.' : 'Ocurrió un error. Intenta de nuevo.';
    return mapa[code] || fallback;
  };

  // Siempre el mismo aviso, exista o no la cuenta
  const handleOlvide = async () => {
    setError('');
    setAviso('');
    const correo = email.trim();
    if (!correo) {
      setError(t('login.olvide_escribe'));
      return;
    }
    setCargando(true);
    try {
      await enviarRecuperacion(correo);
      setAviso(t('login.olvide_enviado'));
    } catch (err) {
      if (err.code === 'auth/user-not-found') setAviso(t('login.olvide_enviado'));
      else setError(traducirError(err.code));
    }
    setCargando(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAviso('');
    setCargando(true);
    try {
      if (modoActual === 'login') {
        await iniciarSesion(email, password);
      } else {
        await registrar(email, password);
      }
      setRedirigir(true);
    } catch (err) {
      setError(traducirError(err.code));
    }
    setCargando(false);
  };

  const handleGoogle = async () => {
    setError('');
    setCargando(true);
    try {
      await iniciarSesionGoogle();
      setRedirigir(true);
    } catch (err) {
      setError(idioma === 'en' ? 'Could not sign in with Google.' : 'No se pudo iniciar con Google.');
    }
    setCargando(false);
  };

  // Si ya está logueado, mostrar info de la cuenta en vez del form
  if (usuario && !bloqueado) {
    return (
      <>
        <Header />
        <main className="login-page">
          <h1 className="solo-lector">{t('menu.mi_cuenta')}</h1>
          <div className="login-card login-logueado">
            <div className="login-avatar-grande">
              {(usuario.displayName || usuario.email || '?').charAt(0).toUpperCase()}
            </div>
            <h2><span>{idioma === 'es' ? '¡Ya estás dentro!' : 'You\'re signed in!'}</span></h2>
            <p className="login-email-mostrar">{usuario.email}</p>
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
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="login-page">
        <h1 className="solo-lector">{t('menu.iniciar_sesion')}</h1>
        <div className="login-card">
          <div className="login-tabs">
            <button
              className={modoActual === 'login' ? 'activo' : ''}
              onClick={() => { setModo('login'); setError(''); setAviso(''); }}
            >
              <span>{t('menu.iniciar_sesion')}</span>
            </button>
            {!cerrado && (
              <button
                className={modoActual === 'registro' ? 'activo' : ''}
                onClick={() => { setModo('registro'); setError(''); setAviso(''); }}
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
            <svg className="google-icon" viewBox="0 0 48 48" width="20" height="20">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 36.1 44 30.5 44 24c0-1.34-.14-2.65-.4-3.5z"/>
            </svg>
            <span><span>{t('login.google')}</span></span>
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
