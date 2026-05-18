import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { registrar, iniciarSesion, iniciarSesionGoogle } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

export default function Login() {
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { usuario } = useAuth();

  // Si ya está logueado, lo mandamos al inicio
  if (usuario) {
    navigate('/');
  }

  const traducirError = (code) => {
    const mapa = {
      'auth/invalid-email': 'El correo no es válido.',
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    };
    return mapa[code] || 'Ocurrió un error. Intenta de nuevo.';
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
      navigate('/');
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
      navigate('/');
    } catch (err) {
      setError('No se pudo iniciar con Google.');
    }
    setCargando(false);
  };

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
              Iniciar sesión
            </button>
            <button
              className={modo === 'registro' ? 'activo' : ''}
              onClick={() => { setModo('registro'); setError(''); }}
            >
              Crear cuenta
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={cargando}>
              {cargando ? 'Cargando...' : (modo === 'login' ? 'Entrar' : 'Registrarme')}
            </button>
          </form>

          <div className="login-divider"><span>o</span></div>

          <button className="login-google" onClick={handleGoogle} disabled={cargando}>
            Continuar con Google
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
