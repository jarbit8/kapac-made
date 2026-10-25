import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import PanelVisitas from '../components/Admin/PanelVisitas';
import PanelPedidos, { porVerificar, etiquetaEstado } from '../components/Admin/PanelPedidos';
import PanelReclamos from '../components/Admin/PanelReclamos';
import { useAuth } from '../context/AuthContext';
import { esCorreoAdmin } from '../config/admins';
import { obtenerTodosPedidos, actualizarEstadoPedido } from '../firebase/pedidos';
import { obtenerEstadisticas, obtenerVisitasRecientes } from '../firebase/visitas';
import { obtenerReclamos, responderReclamo } from '../firebase/reclamos';
import { numeroPedido } from '../utils/formato';
import { useIdioma } from '../context/LanguageContext';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Admin.css';

export default function Admin() {
  const { usuario, cargando } = useAuth();
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [stats, setStats] = useState({ total: 0, logueados: 0, porRuta: {}, porDia: {}, porPais: {} });
  const [visitasRecientes, setVisitasRecientes] = useState([]);
  const [visitasLimite, setVisitasLimite] = useState(10);
  const [pestana, setPestana] = useState('pedidos'); // 'pedidos' | 'visitas' | 'reclamos'
  const [msg, setMsg] = useState('');
  const [reclamos, setReclamos] = useState([]);
  const [reclamosError, setReclamosError] = useState('');
  const [filtroReclamos, setFiltroReclamos] = useState('pendientes'); // 'pendientes' | 'respondidos'
  const [reclamoAbierto, setReclamoAbierto] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [respondiendo, setRespondiendo] = useState(false);
  const [filtroPedidos, setFiltroPedidos] = useState('pendientes'); // 'pendientes' | 'completados' | 'cancelados'

  const cargarPedidos = async () => {
    setPedidos(await obtenerTodosPedidos());
  };

  const cargarStats = async () => {
    setStats(await obtenerEstadisticas(30));
    setVisitasLimite(10);
    setVisitasRecientes(await obtenerVisitasRecientes(10));
  };

  const verMasVisitas = async () => {
    const nuevoLimite = visitasLimite + 10;
    setVisitasLimite(nuevoLimite);
    setVisitasRecientes(await obtenerVisitasRecientes(nuevoLimite));
  };

  const cargarReclamos = async () => {
    try {
      setReclamos(await obtenerReclamos());
      setReclamosError('');
    } catch (e) {
      console.error(e);
      setReclamosError(`No se pudieron cargar los reclamos: ${e?.message || ''}`);
    }
  };

  // Sin sesión de admin las reglas niegan la lectura: no se intenta
  const autorizado = !cargando && !!usuario && esCorreoAdmin(usuario.email);
  useEffect(() => {
    if (autorizado) { cargarPedidos(); cargarStats(); cargarReclamos(); }
  }, [autorizado]);

  const abrirReclamo = (id) => {
    setReclamoAbierto(reclamoAbierto === id ? null : id);
    setRespuesta('');
  };

  const enviarRespuesta = async (r) => {
    const texto = respuesta.trim();
    if (texto.length < 10) {
      setMsg('Escribe la respuesta al consumidor (mínimo 10 caracteres).');
      return;
    }
    if (!window.confirm(`Se enviará por correo a ${r.email} y no se podrá editar.`)) return;
    setRespondiendo(true);
    try {
      await responderReclamo(r.id, texto);
      setMsg(`Reclamo ${r.codigo} respondido`);
      setRespuesta('');
      await cargarReclamos();
    } catch (e) {
      setMsg(`No se pudo guardar la respuesta: ${e?.message || ''}`);
    }
    setRespondiendo(false);
  };

  const cambiarEstadoPedido = async (p, nuevoEstado) => {
    const numero = `#${numeroPedido(p.id)}`;
    const etiqueta = etiquetaEstado(nuevoEstado, p);
    const correo = p.canalNotificacion === 'email' && p.email ? '\n\nSe le avisará al cliente por correo.' : '';
    const stock = nuevoEstado === 'cancelado' && p.stockDescontado ? '\nEl stock de este pedido vuelve a la tienda.' : '';
    if (!window.confirm(`¿Cambiar el pedido ${numero} a «${etiqueta}»?${correo}${stock}`)) return;
    try {
      await actualizarEstadoPedido(p.id, nuevoEstado);
    } catch (e) {
      setMsg(`No se pudo actualizar el pedido: ${e?.message || ''}`);
      return;
    }
    setMsg(`Pedido ${numero} actualizado: ${etiqueta}`);
    cargarPedidos();
  };

  const pedidosPorVerificar = porVerificar(pedidos).length;
  const reclamosPendientes = reclamos.filter((r) => r.estado !== 'respondido').length;

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
        <h1>{t('admin.titulo')}</h1>
        <p className="admin-sub">{t('admin.sub')}</p>
        {msg && <div className="admin-msg">{msg}</div>}

        {/* Pestañas */}
        <div className="admin-pestanas">
          <button
            className={pestana === 'pedidos' ? 'activa' : ''}
            onClick={() => setPestana('pedidos')}
          >
            {t('admin.tab_pedidos')}
            {pedidosPorVerificar > 0 && (
              <span className="admin-badge">{pedidosPorVerificar}</span>
            )}
          </button>
          <button
            className={pestana === 'visitas' ? 'activa' : ''}
            onClick={() => { setPestana('visitas'); cargarStats(); }}
          >
            {t('admin.tab_visitas')}
          </button>
          <button
            className={pestana === 'reclamos' ? 'activa' : ''}
            onClick={() => { setPestana('reclamos'); cargarReclamos(); }}
          >
            {t('admin.tab_reclamos')}
            {reclamosPendientes > 0 && (
              <span className="admin-badge">{reclamosPendientes}</span>
            )}
          </button>
        </div>

        {pestana === 'visitas' && (
          <PanelVisitas stats={stats} recientes={visitasRecientes} limite={visitasLimite} onVerMas={verMasVisitas} />
        )}

        {pestana === 'pedidos' && (
          <PanelPedidos pedidos={pedidos} filtro={filtroPedidos} onFiltro={setFiltroPedidos} onCambiarEstado={cambiarEstadoPedido} />
        )}

        {pestana === 'reclamos' && (
          <PanelReclamos
            reclamos={reclamos} error={reclamosError} filtro={filtroReclamos} onFiltro={setFiltroReclamos}
            abierto={reclamoAbierto} onAbrir={abrirReclamo}
            respuesta={respuesta} onRespuesta={setRespuesta} respondiendo={respondiendo} onEnviar={enviarRespuesta}
          />
        )}
      </div>
    </>
  );
}
