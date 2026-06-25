import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Modal from '../components/Modal/Modal';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { cerrarSesion } from '../firebase/auth';
import { obtenerPerfil, guardarPerfil } from '../firebase/perfil';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Perfil.css';

export default function Perfil() {
  const { usuario, cargando } = useAuth();
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '', telefono: '', direccion: '', distrito: '', referencia: '',
  });
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [modalCerrarSesion, setModalCerrarSesion] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    const cargar = async () => {
      const data = await obtenerPerfil(usuario.uid);
      if (data) {
        setForm({
          nombre:    data.nombre || usuario.displayName || '',
          telefono:  data.telefono || '',
          direccion: data.direccion || '',
          distrito:  data.distrito || '',
          referencia: data.referencia || '',
        });
      } else {
        setForm(prev => ({ ...prev, nombre: usuario.displayName || '' }));
      }
      setCargandoDatos(false);
    };
    cargar();
  }, [usuario]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      await guardarPerfil(usuario.uid, {
        ...form,
        email: usuario.email,
        actualizadoEn: new Date().toISOString(),
      });
      setMensaje(t('perfil.guardado'));
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setMensaje(t('perfil.error'));
    }
    setGuardando(false);
  };

  const handleCerrarSesion = async () => {
    await cerrarSesion();
    navigate('/');
  };

  if (cargando || cargandoDatos) {
    return (
      <>
        <Header />
        <main className="perfil-page">
          <Cargando />
        </main>
        <Footer />
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <Header />
        <main className="perfil-page" style={{ textAlign: 'center', padding: 60 }}>
          <h2>{t('perfil.iniciar_msg')}</h2>
          <button className="perfil-btn-principal" onClick={() => navigate('/login')}>
            {t('perfil.iniciar')}
          </button>
        </main>
        <Footer />
      </>
    );
  }

  const inicial = (form.nombre || usuario.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <Header />
      <main className="perfil-page">

        {/* Header del perfil */}
        <div className="perfil-header">
          <div className="perfil-avatar">{inicial}</div>
          <div className="perfil-info">
            <h1>{form.nombre || t('perfil.sin_nombre')}</h1>
            <p>{usuario.email}</p>
          </div>
        </div>

        {/* Formulario */}
        <form className="perfil-form" onSubmit={guardar}>
          <h2>{t('perfil.info')}</h2>
          <p className="perfil-sub">{t('perfil.info_sub')}</p>

          <div className="perfil-grid">
            <label className="full">
              {t('perfil.nombre')}
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
              />
            </label>
            <label>
              {t('perfil.telefono')}
              <input
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                placeholder="987 654 321"
              />
            </label>
            <label>
              {t('perfil.distrito')}
              <input
                value={form.distrito}
                onChange={e => setForm({ ...form, distrito: e.target.value })}
              />
            </label>
            <label className="full">
              {t('perfil.direccion')}
              <input
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
              />
            </label>
            <label className="full">
              {t('perfil.referencia')}
              <input
                value={form.referencia}
                onChange={e => setForm({ ...form, referencia: e.target.value })}
              />
            </label>
          </div>

          {mensaje && <p className="perfil-mensaje">{mensaje}</p>}

          <div className="perfil-acciones">
            <button type="submit" className="perfil-btn-principal" disabled={guardando}>
              {guardando ? t('perfil.guardando') : t('perfil.guardar')}
            </button>
          </div>
        </form>

        {/* Accesos rápidos */}
        <div className="perfil-accesos">
          <button onClick={() => navigate('/pedidos')} className="perfil-acceso-btn">
            <span className="acceso-icono">📦</span>
            <div>
              <strong>{t('perfil.mis_pedidos')}</strong>
              <span>{t('perfil.mis_pedidos_sub')}</span>
            </div>
            <span className="acceso-flecha">→</span>
          </button>

          <button onClick={() => setModalCerrarSesion(true)} className="perfil-acceso-btn cerrar-sesion">
            <span className="acceso-icono">🚪</span>
            <div>
              <strong>{t('menu.cerrar_sesion')}</strong>
              <span>{usuario.email}</span>
            </div>
            <span className="acceso-flecha">→</span>
          </button>
        </div>

      </main>
      <Footer />

      {/* Modal cerrar sesión */}
      <Modal
        abierto={modalCerrarSesion}
        onClose={() => setModalCerrarSesion(false)}
        titulo={t('perfil.cerrar_sesion_titulo')}
        mensaje={`${t('perfil.cerrar_sesion_msg')} ${usuario.email}. ${t('perfil.cerrar_sesion_sub')}`}
        confirmar={t('menu.cerrar_sesion')}
        cancelar={t('modal.cerrar')}
        onConfirmar={handleCerrarSesion}
        tipo="peligro"
        icono="🚪"
      />
    </>
  );
}
