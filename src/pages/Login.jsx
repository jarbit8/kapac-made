import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ET from '../components/ET';
import Editable from '../components/Editable';
import { registrar, iniciarSesion, iniciarSesionGoogle, cerrarSesion } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
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
  const [cargando, setCargando] = useState(false);
  const [redirigir, setRedirigir] = useState(false);
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { t, idioma } = useIdioma();

  // No navegar apenas resuelve el login: hay que esperar a que el contexto
  // de auth (usuario) se actualice de verdad. Si navegamos antes, la pantalla
  // "Próximamente" alcanza a renderizar con el usuario todavía en null y
  // el admin ve el sitio cerrado por una fracción de segundo (o hasta que
  // recarga, si no nota que se autocorrige).
  useEffect(() => {
    if (redirigir && usuario) navigate('/');
  }, [redirigir, usuario, navigate]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (modo === 'login') {
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
  if (usuario) {
    return (
      <>
        <Header />
        <main className="login-page">
          <div className="login-card login-logueado">
            <div className="login-avatar-grande">
              {(usuario.displayName || usuario.email || '?').charAt(0).toUpperCase()}
            </div>
            <h2><Editable id="login_ya_dentro" as="span">{idioma === 'es' ? '¡Ya estás dentro!' : 'You\'re signed in!'}</Editable></h2>
            <p className="login-email-mostrar">{usuario.email}</p>
            <p className="login-nota">
              <Editable id="login_nota_sesion" as="span">{idioma === 'es'
                ? 'Tienes sesión iniciada con esta cuenta.'
                : 'You\'re signed in with this account.'}</Editable>
            </p>

            <div className="login-acciones">
              <Link to="/perfil" className="login-btn">
                <Editable id="login_mi_cuenta" as="span" sinColor>{idioma === 'es' ? 'Mi cuenta' : 'My account'}</Editable>
              </Link>
              <Link to="/pedidos" className="login-btn login-btn-secundario">
                <Editable id="login_mis_pedidos" as="span" sinColor>{idioma === 'es' ? 'Mis pedidos' : 'My orders'}</Editable>
              </Link>
              <button onClick={handleLogout} className="login-btn login-btn-cerrar">
                <Editable id="login_cerrar_sesion" as="span" sinColor>{idioma === 'es' ? 'Cerrar sesión' : 'Sign out'}</Editable>
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
        <div className="login-card">
          <div className="login-tabs">
            <button
              className={modo === 'login' ? 'activo' : ''}
              onClick={() => { setModo('login'); setError(''); }}
            >
              <ET k="menu.iniciar_sesion" sinColor />
            </button>
            <button
              className={modo === 'registro' ? 'activo' : ''}
              onClick={() => { setModo('registro'); setError(''); }}
            >
              <ET k="login.crear_cuenta" sinColor />
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder={t('login.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={cargando}>
              {cargando ? <Editable id="login_cargando" as="span" sinColor>{idioma === 'en' ? 'Loading...' : 'Cargando...'}</Editable> : (modo === 'login' ? <ET k="login.entrar" sinColor /> : <ET k="login.crear_cuenta" sinColor />)}
            </button>
          </form>

          <div className="login-divider"><span><ET k="login.o" /></span></div>

          <button className="login-google" onClick={handleGoogle} disabled={cargando}>
            <svg className="google-icon" viewBox="0 0 48 48" width="20" height="20">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 36.1 44 30.5 44 24c0-1.34-.14-2.65-.4-3.5z"/>
            </svg>
            <span><ET k="login.google" sinColor /></span>
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
