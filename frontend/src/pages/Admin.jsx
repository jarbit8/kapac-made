import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/TemaContext';
import { cambiarContenido } from '../firebase/contenido';
import { esCorreoAdmin, NOMBRES } from '../config/admins';
import {
  obtenerTodosPedidos, actualizarEstadoPedido,
} from '../firebase/pedidos';
import { obtenerEstadisticas, obtenerVisitasRecientes, nombreRuta, SIN_VISITAS } from '../firebase/visitas';
import { obtenerReclamos, responderReclamo } from '../firebase/reclamos';
import { diasHabilesHasta } from '../utils/diasHabiles';
import { nombreEstado } from '../i18n/estadosPedido';
import { useIdioma } from '../context/LanguageContext';
import Cargando from '../components/Cargando/Cargando';
import Icono from '../components/Icono';
import '../styles/Admin.css';

const ESTADOS_PEDIDO = ['procesando_pago', 'verificando_pago', 'pendiente_envio', 'enviado', 'entregado'];
// Estados viejos → su equivalente, para saber desde dónde puede avanzar
const ESTADO_EQUIVALENTE = { pendiente: 'verificando_pago', verificando: 'procesando_pago', pagado: 'pendiente_envio' };

// Solo se avanza o se cancela: volver atrás le mandaría otra vez el correo al cliente.
// "Procesando pago" lo pone el sistema mientras el cliente paga.
const estadosPosibles = (estado) => {
  if (estado === 'cancelado') return ['cancelado'];
  const i = ESTADOS_PEDIDO.indexOf(ESTADO_EQUIVALENTE[estado] || estado);
  const siguientes = ESTADOS_PEDIDO.slice(Math.max(i + 1, 1));
  return [estado, ...siguientes, ...(estado === 'entregado' ? [] : ['cancelado'])];
};

// Los mismos nombres que ve el cliente (descripcion/textos-pedidos.json)
const etiquetaEstado = (estado, pedido) => nombreEstado(pedido, 'es', estado);

const METODO_PAGO = {
  yape:          { texto: 'Yape (QR)', icono: 'celular' },
  'yape-codigo': { texto: 'Yape (código de aprobación)', icono: 'celular' },
  tarjeta:       { texto: 'Tarjeta', icono: 'tarjeta' },
  efectivo:      { texto: 'PagoEfectivo', icono: 'billete' },
};

const ESTADO_COLORES = {
  procesando_pago: { bg: '#fff3cd', color: '#856404' },
  verificando_pago: { bg: '#fff3cd', color: '#856404' },
  pendiente_envio: { bg: '#d4edda', color: '#155724' },
  enviado:         { bg: '#cce5ff', color: '#004085' },
  entregado:       { bg: '#d1e7dd', color: '#0f5132' },
  cancelado:       { bg: '#f8d7da', color: '#842029' },
  // viejos
  pendiente:   { bg: '#fff3cd', color: '#856404' },
  verificando: { bg: '#fff3cd', color: '#856404' },
  pagado:      { bg: '#d4edda', color: '#155724' },
};

export default function Admin() {
  const { usuario, cargando } = useAuth();
  const { cerrado, setCerrado } = useTema();
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [stats, setStats] = useState({});
  const [visitasRecientes, setVisitasRecientes] = useState([]);
  const [visitasLimite, setVisitasLimite] = useState(10);
  // Visitas de la pantalla "Próximamente" (mientras está cerrada), del login o de la página
  const [zona, setZona] = useState(cerrado ? 'proximamente' : 'pagina');
  const [paisAbierto, setPaisAbierto] = useState(null);
  const [pestana, setPestana] = useState('pedidos'); // 'pedidos' | 'visitas' | 'reclamos'
  const [msg, setMsg] = useState('');
  const [reclamos, setReclamos] = useState([]);
  const [reclamosError, setReclamosError] = useState('');
  const [filtroReclamos, setFiltroReclamos] = useState('pendientes'); // 'pendientes' | 'respondidos'
  const [reclamoAbierto, setReclamoAbierto] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [respondiendo, setRespondiendo] = useState(false);

  const cargarPedidos = async () => {
    setPedidos(await obtenerTodosPedidos());
  };

  const cargarStats = async (z = zona) => {
    setStats(await obtenerEstadisticas(30));
    setVisitasLimite(10);
    setVisitasRecientes(await obtenerVisitasRecientes(10, z));
  };

  const cambiarZona = (z) => {
    setZona(z);
    cargarStats(z);
  };

  const verMasVisitas = async () => {
    const nuevoLimite = visitasLimite + 10;
    setVisitasLimite(nuevoLimite);
    setVisitasRecientes(await obtenerVisitasRecientes(nuevoLimite, zona));
  };

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

  // Días hábiles que quedan para responder; en rojo si son 3 o menos o ya venció
  const plazoReclamo = (r) => {
    if (r.estado === 'respondido' || !r.fechaLimite?.toDate) return null;
    const n = diasHabilesHasta(r.fechaLimite.toDate());
    const dias = (v) => `${v} día${v === 1 ? '' : 's'} hábil${v === 1 ? '' : 'es'}`;
    const texto = n < 0 ? `Vencido hace ${dias(-n)}` : n === 0 ? 'Vence hoy' : `Quedan ${dias(n)}`;
    return { texto, urgente: n <= 3 };
  };

  const cambiarEstadoPedido = async (p, nuevoEstado) => {
    const numero = `#${p.id.slice(0, 8).toUpperCase()}`;
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

  const formatoFecha = (ts) => {
    if (!ts?.toDate) return 'Recién creado';
    return ts.toDate().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const datos = stats[zona] || SIN_VISITAS;

  // PagoEfectivo se confirma solo: solo el Yape con QR lo revisa el admin
  const pedidosVerificando = pedidos.filter(p => ['verificando_pago', 'verificando'].includes(p.estado) && p.metodoPago !== 'efectivo');
  const reclamosPendientes = reclamos.filter((r) => r.estado !== 'respondido');
  const reclamosRespondidos = reclamos.filter((r) => r.estado === 'respondido');

  const ESTADOS_PENDIENTE = ['verificando_pago', 'pendiente_envio', 'enviado', 'pendiente', 'verificando', 'pagado'];
  const pedidosPendientes  = pedidos.filter(p => ESTADOS_PENDIENTE.includes(p.estado));
  const pedidosCompletados = pedidos.filter(p => p.estado === 'entregado');
  const pedidosCancelados  = pedidos.filter(p => p.estado === 'cancelado');

  const [filtroPedidos, setFiltroPedidos] = useState('pendientes'); // 'pendientes' | 'completados' | 'cancelados'

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
            {pedidosVerificando.length > 0 && (
              <span className="admin-badge">{pedidosVerificando.length}</span>
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
            {reclamosPendientes.length > 0 && (
              <span className="admin-badge">{reclamosPendientes.length}</span>
            )}
          </button>
        </div>

        {/* ====== SECCIÓN VISITAS ====== */}
        {pestana === 'visitas' && (
          <div className="admin-visitas">
            <div className="admin-pedidos-filtros">
              {[
                { key: 'proximamente', label: 'Próximamente' },
                { key: 'login', label: 'Login' },
                { key: 'pagina', label: 'Página' },
              ].map((z) => (
                <button
                  key={z.key}
                  className={`admin-filtro-btn ${zona === z.key ? 'activo' : ''}`}
                  onClick={() => cambiarZona(z.key)}
                >
                  {z.label} ({stats[z.key]?.total || 0})
                </button>
              ))}
            </div>
            <p style={{ color: '#999', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              {{
                proximamente: 'Gente que entró mientras la tienda estaba cerrada: solo vio el video de «Coming soon». Si escribió otra dirección, sale cuál quiso abrir.',
                login: 'Quienes abrieron el inicio de sesión y si lograron entrar con su cuenta.',
                pagina: 'Quienes vieron la página por dentro (con la tienda cerrada, solo los admins).',
              }[zona]}
            </p>

            <div className="admin-contadores">
              <div className="contador-card" style={{ borderTop: '4px solid #ff6b35' }}>
                <span className="contador-num">{datos.visitasHoy || 0}</span>
                <span className="contador-label">Hoy</span>
                <span className="contador-sub">veces que entraron al sitio hoy</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #5f0a87' }}>
                <span className="contador-num">{datos.total}</span>
                <span className="contador-label">Últimos 30 días</span>
                <span className="contador-sub">veces que entraron en el mes</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #2196f3' }}>
                <span className="contador-num">{datos.visitantesUnicos || 0}</span>
                <span className="contador-label">Visitantes únicos</span>
                <span className="contador-sub">
                  personas distintas (una que vuelve no se cuenta 2 veces)
                  {datos.robots > 0 && ` · ${datos.robots} ${datos.robots === 1 ? 'es robot' : 'son robots'}`}
                </span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #4caf50' }}>
                <span className="contador-num">{datos.logueados}</span>
                <span className="contador-label">Identificados</span>
                <span className="contador-sub">personas que entraron con su cuenta</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #f57c00' }}>
                <span className="contador-num">{Object.keys(datos.porPais).length}</span>
                <span className="contador-label">Países distintos</span>
              </div>
            </div>

            <h3 style={{ marginTop: 32, marginBottom: 4 }}>Actividad reciente</h3>
            <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Cada vez que alguien entró al sitio (no cada página que recorrió después).</p>
            <div className="admin-visitas-lista">
              {visitasRecientes.length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>
                  {t('admin.sin_visitas')}
                </p>
              )}
              {visitasRecientes.map((v) => {
                const fechaObj = v.fecha?.toDate ? v.fecha.toDate() : null;
                const fechaTxt = fechaObj
                  ? fechaObj.toLocaleString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                  : '—';
                // Tiempo relativo (hace X minutos)
                let tiempoRelativo = '';
                if (fechaObj) {
                  const diff = (Date.now() - fechaObj.getTime()) / 1000;
                  if (diff < 60) tiempoRelativo = 'hace un momento';
                  else if (diff < 3600) tiempoRelativo = `hace ${Math.floor(diff/60)} min`;
                  else if (diff < 86400) tiempoRelativo = `hace ${Math.floor(diff/3600)} h`;
                  else tiempoRelativo = `hace ${Math.floor(diff/86400)} d`;
                }
                const rutaNombre = nombreRuta(v.ruta);
                return (
                  <div key={v.id} className="visita-row">
                    <div className="visita-bandera"><Icono nombre="ubicacion" tam={18} /></div>
                    <div className="visita-info">
                      <div className="visita-quien">
                        {v.correo ? (
                          <strong>{NOMBRES[v.correo] ? `${NOMBRES[v.correo]} · ${v.correo}` : v.correo}</strong>
                        ) : v.robot ? (
                          <span style={{ color:'#888' }}>🤖 Entró un robot (un programa, no una persona)</span>
                        ) : (
                          <span style={{ color:'#888' }}>Visitante anónimo</span>
                        )}
                      </div>
                      <div className="visita-meta">
                        {v.ciudad && v.ciudad !== 'Desconocida' ? `${v.ciudad}, ` : ''}{v.pais || '—'} · {v.dispositivo} · {v.navegador}
                      </div>
                      {zona === 'pagina' && <div className="visita-recorrido">Vio: {v.recorrido.map(nombreRuta).join(' → ')}</div>}
                      {zona === 'proximamente' && v.pidio && <div className="visita-recorrido">Quiso abrir: {v.pidio}</div>}
                      {zona === 'login' && <div className="visita-recorrido">{v.entro ? 'Entró con su cuenta' : 'No entró'}</div>}
                    </div>
                    <div className="visita-ruta">
                      <span className="visita-pagina">{rutaNombre}</span>
                      <span className="visita-fecha">{tiempoRelativo || fechaTxt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {visitasRecientes.length >= visitasLimite && (
              <button type="button" className="admin-fila-agregar" style={{ marginTop: 12 }} onClick={verMasVisitas}>
                Ver más
              </button>
            )}

            <h3 style={{ marginTop: 32, marginBottom: 4 }}>Visitas por día</h3>
            <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Cuántas veces entraron al sitio cada día.</p>
            <div className="admin-tabla-stats">
              {Object.entries(datos.porDia)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 30)
                .map(([fecha, n]) => {
                  const max = Math.max(...Object.values(datos.porDia), 1);
                  const ancho = Math.max(8, (n / max) * 100);
                  return (
                    <div key={fecha} className="stat-row">
                      <span className="stat-fecha">{fecha}</span>
                      <div className="stat-bar-wrap">
                        <div className="stat-bar" style={{ width: `${ancho}%` }} />
                      </div>
                      <span className="stat-num">{n}</span>
                    </div>
                  );
                })}
              {Object.keys(datos.porDia).length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>
                  {t('admin.sin_visitas')}
                </p>
              )}
            </div>

            {zona === 'pagina' && (<>
            <h3 style={{ marginTop: 32, marginBottom: 4 }}>Páginas más visitadas</h3>
            <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Qué páginas recorren dentro de una misma visita.</p>
            <div className="admin-tabla-stats">
              {Object.entries(datos.porRuta)
                .sort((a, b) => b[1] - a[1])
                .map(([ruta, n]) => {
                  const max = Math.max(...Object.values(datos.porRuta), 1);
                  const ancho = Math.max(8, (n / max) * 100);
                  return (
                    <div key={ruta} className="stat-row">
                      <span className="stat-fecha">{nombreRuta(ruta)}</span>
                      <div className="stat-bar-wrap">
                        <div className="stat-bar" style={{ width: `${ancho}%`, background: '#5f0a87' }} />
                      </div>
                      <span className="stat-num">{n}</span>
                    </div>
                  );
                })}
            </div>
            </>)}

            <h3 style={{ marginTop: 32, marginBottom: 4 }}>Visitantes por país</h3>
            <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Personas distintas. Toca un país para ver sus ciudades.</p>
            <div className="admin-tabla-stats">
              {Object.entries(datos.porPais)
                .sort((a, b) => b[1] - a[1])
                .map(([pais, n]) => {
                  const max = Math.max(...Object.values(datos.porPais), 1);
                  const ancho = Math.max(8, (n / max) * 100);
                  const abierto = paisAbierto === pais;
                  const ciudades = Object.entries(datos.ciudadesPorPais?.[pais] || {}).sort((a, b) => b[1] - a[1]);
                  return (
                    <div key={pais} className="stat-grupo">
                      <button type="button" className={`stat-row stat-pais${abierto ? ' abierto' : ''}`} aria-expanded={abierto}
                        onClick={() => setPaisAbierto(abierto ? null : pais)}>
                        <span className="stat-fecha"><span className="stat-flecha">›</span>{pais}</span>
                        <div className="stat-bar-wrap">
                          <div className="stat-bar" style={{ width: `${ancho}%`, background: '#4caf50' }} />
                        </div>
                        <span className="stat-num">{n}</span>
                      </button>
                      {abierto && ciudades.map(([ciudad, m]) => (
                        <div key={ciudad} className="stat-row stat-ciudad">
                          <span className="stat-fecha">{ciudad}</span>
                          <div className="stat-bar-wrap">
                            <div className="stat-bar" style={{ width: `${Math.max(8, (m / n) * 100)}%`, background: '#a5d6a7' }} />
                          </div>
                          <span className="stat-num">{m}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>

            {/* Dispositivos */}
            {datos.porDispositivo && Object.keys(datos.porDispositivo).length > 0 && (
              <>
                <h3 style={{ marginTop: 32, marginBottom: 16 }}>Dispositivos</h3>
                <div className="admin-tabla-stats">
                  {Object.entries(datos.porDispositivo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([disp, n]) => {
                      const max = Math.max(...Object.values(datos.porDispositivo), 1);
                      const ancho = Math.max(8, (n / max) * 100);
                      return (
                        <div key={disp} className="stat-row">
                          <span className="stat-fecha">{disp}</span>
                          <div className="stat-bar-wrap">
                            <div className="stat-bar" style={{ width: `${ancho}%`, background: '#2196f3' }} />
                          </div>
                          <span className="stat-num">{n}</span>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            <p style={{ marginTop: 30, fontSize: 13, color: '#888', lineHeight: 1.6, background: '#f5f5f5', padding: '14px 18px', borderRadius: 10 }}>
              <strong>Conforme a la Ley 29733 de Protección de Datos Personales</strong>: sin cookies. Los visitantes logueados se identifican
              por su correo (al cual nos dieron consentimiento al loguearse). Los anónimos quedan como "Desconocido".
              La ubicación (país/ciudad) se obtiene vía servicio externo sin guardar la IP cruda. Esto está informado
              en la página <a href="/legal">/legal</a>.
            </p>
          </div>
        )}

        {/* ====== SECCIÓN PEDIDOS ====== */}
        {pestana === 'pedidos' && (
          <div className="admin-pedidos">

            {/* Resumen de contadores */}
            <div className="admin-pedidos-resumen">
              <div className="admin-resumen-card pendientes" onClick={() => setFiltroPedidos('pendientes')}>
                <span className="admin-resumen-num">{pedidosPendientes.length}</span>
                <span className="admin-resumen-label">{t('admin.pendientes')}</span>
                {pedidosVerificando.length > 0 && (
                  <span className="admin-resumen-alerta"><Icono nombre="alerta" tam={14} /> {pedidosVerificando.length} {t(pedidosVerificando.length === 1 ? 'admin.verificar_uno' : 'admin.verificar')}</span>
                )}
              </div>
              <div className="admin-resumen-card completados" onClick={() => setFiltroPedidos('completados')}>
                <span className="admin-resumen-num">{pedidosCompletados.length}</span>
                <span className="admin-resumen-label">{t('admin.completados')}</span>
              </div>
              <div className="admin-resumen-card cancelados" onClick={() => setFiltroPedidos('cancelados')}>
                <span className="admin-resumen-num">{pedidosCancelados.length}</span>
                <span className="admin-resumen-label">{t('admin.cancelados')}</span>
              </div>
            </div>

            {/* Filtros */}
            <div className="admin-pedidos-filtros">
              {[
                { key: 'pendientes',  label: `${t('admin.filtro_pendientes')} (${pedidosPendientes.length})` },
                { key: 'completados', label: `${t('admin.filtro_completados')} (${pedidosCompletados.length})` },
                { key: 'cancelados',  label: `${t('admin.filtro_cancelados')} (${pedidosCancelados.length})` },
              ].map(f => (
                <button
                  key={f.key}
                  className={`admin-filtro-btn ${filtroPedidos === f.key ? 'activo' : ''}`}
                  onClick={() => setFiltroPedidos(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lista filtrada */}
            {(() => {
              const lista = filtroPedidos === 'pendientes' ? pedidosPendientes
                          : filtroPedidos === 'completados' ? pedidosCompletados
                          : pedidosCancelados;

              if (lista.length === 0) return (
                <p style={{ color: '#888', fontSize: 14, marginTop: 20 }}>
                  {t('admin.no_pedidos')}
                </p>
              );

              return lista.map((p) => {
                const col = ESTADO_COLORES[p.estado] || { bg: '#eee', color: '#333' };
                return (
                  <div key={p.id} className="admin-pedido-card">
                    <div className="admin-pedido-top">
                      <div>
                        <span className="admin-pedido-id">#{p.id.slice(0, 8).toUpperCase()}</span>
                        <span className="admin-pedido-email">{[p.envio?.nombre || p.nombre, p.email].filter(Boolean).join(' · ')}</span>
                      </div>
                      <span
                        className="admin-pedido-estado"
                        style={{ background: col.bg, color: col.color }}
                      >
                        {etiquetaEstado(p.estado, p)}
                      </span>
                    </div>
                    <p className="admin-pedido-fecha">{formatoFecha(p.fecha)}</p>
                    <p className="admin-pedido-metodo">
                      <Icono nombre={METODO_PAGO[p.metodoPago]?.icono || 'info'} tam={16} />
                      {METODO_PAGO[p.metodoPago]?.texto || p.metodoPago || 'Sin método de pago'}
                    </p>
                    {p.metodoPago === 'efectivo' && ['procesando_pago', 'verificando_pago'].includes(p.estado)
                      && p.codigoPagoVence && p.codigoPagoVence * 1000 < Date.now() && (
                      <p className="admin-pedido-vencido">
                        <Icono nombre="alerta" tam={14} /> El código de PagoEfectivo venció sin pagarse: cancela el pedido para devolver el stock.
                      </p>
                    )}
                    <ul className="admin-pedido-items">
                      {p.items?.map((it, i) => (
                        <li key={i}>{it.cantidad}× {it.nombre} — S/{it.precio * it.cantidad}.00</li>
                      ))}
                    </ul>
                    {p.envio && (
                      <p className="admin-pedido-envio">
                        <Icono nombre={p.envio.tipo === 'envio' ? 'camion' : 'tienda'} tam={16} />
                        {p.envio.tipo === 'envio'
                          ? `${t('admin.dominio_envio')}: ${p.envio.direccion}, ${p.envio.distrito}${p.envio.referencia ? ` (${p.envio.referencia})` : ''}`
                          : t('admin.recojo')}
                        {p.envio.telefono ? ` · Tel. ${p.envio.telefono}` : ''}
                      </p>
                    )}
                    {p.metodoPago === 'yape' && p.codigoAprobacion && (
                      <p className="admin-pedido-codigo-yape">
                        {t('admin.codigo_yape')} <strong>{p.codigoAprobacion}</strong>
                      </p>
                    )}
                    <div className="admin-pedido-footer">
                      <strong>Total: S/{p.total}.00</strong>
                      <select
                        value={p.estado}
                        onChange={(e) => cambiarEstadoPedido(p, e.target.value)}
                        className="admin-pedido-select"
                        disabled={p.estado === 'cancelado'}
                      >
                        {estadosPosibles(p.estado).map((est) => (
                          <option key={est} value={est}>{etiquetaEstado(est, p)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ====== SECCIÓN RECLAMOS ====== */}
        {pestana === 'reclamos' && (
          <div className="admin-pedidos">
            <div className="admin-pedidos-filtros">
              {[
                { key: 'pendientes', label: `Pendientes (${reclamosPendientes.length})` },
                { key: 'respondidos', label: `Respondidos (${reclamosRespondidos.length})` },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`admin-filtro-btn ${filtroReclamos === f.key ? 'activo' : ''}`}
                  onClick={() => setFiltroReclamos(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {reclamosError && <p className="admin-reclamo-error">{reclamosError}</p>}

            {(() => {
              const lista = filtroReclamos === 'pendientes' ? reclamosPendientes : reclamosRespondidos;
              if (!reclamosError && lista.length === 0) return (
                <p style={{ color: '#888', fontSize: 14, marginTop: 20 }}>
                  {filtroReclamos === 'pendientes' ? 'No hay reclamos pendientes.' : 'Aún no has respondido ningún reclamo.'}
                </p>
              );

              return lista.map((r) => {
                const pendiente = r.estado !== 'respondido';
                const col = pendiente ? { bg: '#fff3cd', color: '#856404' } : { bg: '#d4edda', color: '#155724' };
                const plazo = plazoReclamo(r);
                const abierto = reclamoAbierto === r.id;
                return (
                  <div key={r.id} className="admin-pedido-card">
                    <div className="admin-pedido-top">
                      <div>
                        <span className="admin-pedido-id">{r.codigo}</span>
                        <span className="admin-pedido-email">{r.tipo === 'queja' ? 'Queja' : 'Reclamo'}</span>
                      </div>
                      <span className="admin-pedido-estado" style={{ background: col.bg, color: col.color }}>
                        {pendiente ? 'Pendiente' : 'Respondido'}
                      </span>
                    </div>
                    <p className="admin-pedido-fecha">{formatoFecha(r.fecha)} · {r.nombre} · {r.email}</p>
                    {plazo && <p className={`admin-reclamo-plazo${plazo.urgente ? ' urgente' : ''}`}>{plazo.texto}</p>}
                    <button type="button" className="admin-filtro-btn" onClick={() => abrirReclamo(r.id)}>
                      {abierto ? 'Cerrar' : (pendiente ? 'Ver y responder' : 'Ver')}
                    </button>

                    {abierto && (
                      <div className="admin-reclamo-detalle">
                        <dl>
                          {[
                            ['Consumidor', r.nombre],
                            ['Documento', `${r.documentoTipo} ${r.documento}`],
                            ['Domicilio', r.domicilio],
                            ['Teléfono', r.telefono],
                            ['Correo', r.email],
                            ['Padre, madre o apoderado', r.menorDeEdad ? r.apoderado : ''],
                            ['Bien contratado', r.bienTipo === 'servicio' ? 'Servicio' : 'Producto'],
                            ['Descripción', r.bienDescripcion],
                            ['Monto reclamado', typeof r.monto === 'number' ? `S/ ${r.monto.toFixed(2)}` : ''],
                            ['N.º de pedido', r.pedidoId],
                            ['Tipo', r.tipo === 'queja' ? 'Queja' : 'Reclamo'],
                            ['Detalle', r.detalle],
                            ['Pedido del consumidor', r.pedido],
                            ['Idioma', r.idioma === 'en' ? 'Inglés' : 'Español'],
                            ['Fecha límite', r.fechaLimite?.toDate ? r.fechaLimite.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : ''],
                          ].filter(([, v]) => v).map(([k, v]) => (
                            <div className="admin-reclamo-fila" key={k}>
                              <dt>{k}</dt>
                              <dd>{v}</dd>
                            </div>
                          ))}
                        </dl>

                        {pendiente ? (
                          <div className="admin-reclamo-responder">
                            <label htmlFor={`respuesta-${r.id}`}>Respuesta al consumidor</label>
                            <textarea
                              id={`respuesta-${r.id}`}
                              rows={6}
                              maxLength={3000}
                              value={respuesta}
                              onChange={(e) => setRespuesta(e.target.value)}
                            />
                            <button
                              type="button"
                              className="admin-reclamo-enviar"
                              onClick={() => enviarRespuesta(r)}
                              disabled={respondiendo}
                            >
                              {respondiendo ? 'Enviando…' : 'Enviar respuesta'}
                            </button>
                          </div>
                        ) : (
                          <div className="admin-reclamo-responder">
                            <p className="admin-reclamo-respuesta-fecha">Respondido el {formatoFecha(r.fechaRespuesta)}</p>
                            <p className="admin-reclamo-respuesta">{r.respuesta}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </>
  );
}
