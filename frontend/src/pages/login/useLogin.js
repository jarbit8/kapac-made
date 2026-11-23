import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registrar, iniciarSesion, iniciarSesionGoogle, enviarRecuperacion, cerrarSesion } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useIdioma } from '../../context/LanguageContext';
import { useTema } from '../../context/TemaContext';
import { esCorreoAdmin } from '../../config/admins';
import { cuentaDe } from '../../utils/compra';
import { traducirError } from './errores';

export default function useLogin() {
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
  // La sesión anónima de una compra de invitado cuenta como visitante: ve el formulario normal
  const cuenta = cuentaDe(usuario);
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
    if (redirigir && cuenta && !bloqueado) navigate('/');
  }, [redirigir, cuenta, bloqueado, navigate]);

  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    setError('');
    setAviso('');
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
      else setError(traducirError(err.code, idioma));
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
      setError(traducirError(err.code, idioma));
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

  return {
    cuenta, bloqueado, cerrado, modoActual, cambiarModo,
    email, setEmail, password, setPassword, error, aviso, cargando,
    handleOlvide, handleSubmit, handleGoogle,
  };
}
