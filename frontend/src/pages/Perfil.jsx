import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Modal from '../components/Modal/Modal';
import Icono from '../components/Icono';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { cerrarSesion } from '../firebase/auth';
import { cuentaDe } from '../utils/compra';
import { obtenerPerfil, guardarPerfil } from '../firebase/perfil';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Perfil.css';

export default function Perfil() {
  const { usuario, cargando } = useAuth();
  // La sesión anónima de una compra de invitado no es una cuenta: no tiene perfil
  const cuenta = cuentaDe(usuario);
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
    if (!cuenta) return;
    const cargar = async () => {
      const data = await obtenerPerfil(cuenta.uid);
      if (data) {
        setForm({
          nombre:    data.nombre || cuenta.displayName || '',
          telefono:  data.telefono || '',
          direccion: data.direccion || '',
          distrito:  data.distrito || '',
          referencia: data.referencia || '',
        });
      } else {
        setForm(prev => ({ ...prev, nombre: cuenta.displayName || '' }));
      }
      setCargandoDatos(false);
    };
    cargar();
  }, [cuenta]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      await guardarPerfil(cuenta.uid, {
        ...form,
        email: cuenta.email,
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

  if (cargando || (cuenta && cargandoDatos)) {
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

  if (!cuenta) {
    return (
      <>
        <Header />
        <main className="perfil-page" style={{ textAlign: 'center', padding: 60 }}>
          <h1 className="solo-lector">{t('menu.mi_perfil')}</h1>
          <h2><span>{t('perfil.iniciar_msg')}</span></h2>
          <button className="perfil-btn-principal" onClick={() => navigate('/login')}>
            <span>{t('perfil.iniciar')}</span>
          </button>
        </main>
        <Footer />
      </>
    );
  }

  const inicial = (form.nombre || cuenta.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <Header />
      <main className="perfil-page">

        {/* Header del perfil */}
        <div className="perfil-header">
          <div className="perfil-avatar">{inicial}</div>
          <div className="perfil-info">
            <h1>{form.nombre || <span>{t('perfil.sin_nombre')}</span>}</h1>
            <p>{cuenta.email}</p>
          </div>
        </div>

        {/* Formulario */}
        <form className="perfil-form" onSubmit={guardar}>
          <h2><span>{t('perfil.info')}</span></h2>
          <p className="perfil-sub"><span>{t('perfil.info_sub')}</span></p>

          <div className="perfil-grid">
            <label className="full">
              <span>{t('perfil.nombre')}</span>
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
              />
            </label>
            <label>
              <span>{t('perfil.telefono')}</span>
              <input
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                placeholder="987 654 321"
              />
            </label>
            <label>
              <span>{t('perfil.distrito')}</span>
              <input
                value={form.distrito}
                onChange={e => setForm({ ...form, distrito: e.target.value })}
              />
            </label>
            <label className="full">
              <span>{t('perfil.direccion')}</span>
              <input
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
              />
            </label>
            <label className="full">
              <span>{t('perfil.referencia')}</span>
              <input
                value={form.referencia}
                onChange={e => setForm({ ...form, referencia: e.target.value })}
              />
            </label>
          </div>

          {mensaje && <p className="perfil-mensaje">{mensaje}</p>}

          <div className="perfil-acciones">
            <button type="submit" className="perfil-btn-principal" disabled={guardando}>
              <span>{guardando ? t('perfil.guardando') : t('perfil.guardar')}</span>
            </button>
          </div>
        </form>

        {/* Accesos rápidos */}
        <div className="perfil-accesos">
          <button onClick={() => navigate('/pedidos')} className="perfil-acceso-btn">
            <span className="acceso-icono"><Icono nombre="paquete" tam={26} /></span>
            <div>
              <strong><span>{t('perfil.mis_pedidos')}</span></strong>
              <span><span>{t('perfil.mis_pedidos_sub')}</span></span>
            </div>
            <span className="acceso-flecha"><Icono nombre="flechaDer" /></span>
          </button>

          <button onClick={() => setModalCerrarSesion(true)} className="perfil-acceso-btn cerrar-sesion">
            <span className="acceso-icono"><Icono nombre="salir" tam={26} /></span>
            <div>
              <strong><span>{t('menu.cerrar_sesion')}</span></strong>
              <span>{cuenta.email}</span>
            </div>
            <span className="acceso-flecha"><Icono nombre="flechaDer" /></span>
          </button>
        </div>

      </main>
      <Footer />

      {/* Modal cerrar sesión */}
      <Modal
        abierto={modalCerrarSesion}
        onClose={() => setModalCerrarSesion(false)}
        titulo={t('perfil.cerrar_sesion_titulo')}
        mensaje={`${t('perfil.cerrar_sesion_msg')} ${cuenta.email}. ${t('perfil.cerrar_sesion_sub')}`}
        confirmar={t('menu.cerrar_sesion')}
        cancelar={t('modal.cerrar')}
        onConfirmar={handleCerrarSesion}
        tipo="peligro"
        icono={<Icono nombre="salir" tam={36} />}
      />
    </>
  );
}
