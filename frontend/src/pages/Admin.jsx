import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/TemaContext';
import { cambiarContenido } from '../firebase/contenido';
import { esCorreoAdmin } from '../config/admins';
import { useIdioma } from '../context/LanguageContext';
import Cargando from '../components/Cargando/Cargando';
import PestanaPedidos from './admin/PestanaPedidos';
import PestanaVisitas from './admin/PestanaVisitas';
import PestanaReclamos from './admin/PestanaReclamos';
import usePedidos from './admin/usePedidos';
import useVisitas from './admin/useVisitas';
import useReclamos from './admin/useReclamos';
import '../styles/Admin.css';

export default function Admin() {
  const { usuario, cargando } = useAuth();
  const { cerrado, setCerrado } = useTema();
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [pestana, setPestana] = useState('pedidos'); // 'pedidos' | 'visitas' | 'reclamos'
  const [msg, setMsg] = useState('');
  const pedidos = usePedidos();
  const visitas = useVisitas(cerrado);
  const reclamos = useReclamos(setMsg);

  const [cambiandoTienda, setCambiandoTienda] = useState(false);
  const cambiarTienda = async () => {
    const abrir = cerrado;
    const pregunta = abrir
      ? '¿Seguro que quieres ABRIR la tienda? Todos podrán ver la página y comprar.'
      : '¿Seguro que quieres CERRAR la tienda? Los visitantes verán la pantalla «Próximamente».';
    if (!window.confirm(pregunta)) return;
    setCambiandoTienda(true);
    try {
      await cambiarContenido(() => ({ cerrado: !abrir }));
      setCerrado(!abrir);
      try { localStorage.setItem('kapac_cerrado_v1', abrir ? '0' : '1'); } catch (_) {}
    } catch (_) {
      window.alert('No se pudo cambiar. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
    setCambiandoTienda(false);
  };

  // Sin sesión de admin las reglas niegan la lectura: no se intenta
  const autorizado = !cargando && !!usuario && esCorreoAdmin(usuario.email);
  useEffect(() => {
    if (autorizado) { pedidos.cargarPedidos(); visitas.cargarStats(); reclamos.cargarReclamos(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizado]);

  // Protección: solo usuarios logueados pueden acceder
  if (cargando) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '60vh' }}>
          <Cargando />
        </main>
      </>
    );
  }

  if (!usuario || !esCorreoAdmin(usuario.email)) {
    return (
      <>
        <Header />
        <main style={{ textAlign: 'center', padding: '4rem' }}>
          <h2>Acceso restringido</h2>
          <p>No tienes permiso para acceder al panel de administración.</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '1.5rem', padding: '0.8rem 2rem',
              background: '#1a1a1a', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
            }}
          >
            Volver al inicio
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="admin-page">
        <div className="admin-cabecera">
          <h1>{t('admin.titulo')}</h1>
          <button type="button" className={`admin-tienda${cerrado ? ' cerrada' : ''}`} onClick={cambiarTienda} disabled={cambiandoTienda}
            title={cerrado ? 'Abrir la tienda al público' : 'Cerrar la tienda al público'}>
            <span className="admin-tienda-punto" />
            {cambiandoTienda ? 'Guardando…' : (cerrado ? 'Tienda cerrada' : 'Tienda abierta')}
          </button>
        </div>
        <p className="admin-sub">{t('admin.sub')}</p>
        {msg && <div className="admin-msg">{msg}</div>}

        {/* Pestañas */}
        <div className="admin-pestanas">
          <button
            className={pestana === 'pedidos' ? 'activa' : ''}
            onClick={() => setPestana('pedidos')}
          >
            {t('admin.tab_pedidos')}
            {pedidos.pedidosVerificando.length > 0 && (
              <span className="admin-badge">{pedidos.pedidosVerificando.length}</span>
            )}
          </button>
          <button
            className={pestana === 'visitas' ? 'activa' : ''}
            onClick={() => { setPestana('visitas'); visitas.cargarStats(); }}
          >
            {t('admin.tab_visitas')}
          </button>
          <button
            className={pestana === 'reclamos' ? 'activa' : ''}
            onClick={() => { setPestana('reclamos'); reclamos.cargarReclamos(); }}
          >
            {t('admin.tab_reclamos')}
            {reclamos.reclamosPendientes.length > 0 && (
              <span className="admin-badge">{reclamos.reclamosPendientes.length}</span>
            )}
          </button>
        </div>

        {pestana === 'visitas' && <PestanaVisitas {...visitas} />}
        {pestana === 'pedidos' && <PestanaPedidos {...pedidos} setMsg={setMsg} />}
        {pestana === 'reclamos' && <PestanaReclamos {...reclamos} />}
      </div>
    </>
  );
}
