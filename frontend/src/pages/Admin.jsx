import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import { useAuth } from '../context/AuthContext';
import { esCorreoAdmin, NOMBRES } from '../config/admins';
import {
  obtenerProductos, agregarProducto, actualizarProducto, eliminarProducto,
} from '../firebase/productos';
import {
  obtenerTodosPedidos, actualizarEstadoPedido,
} from '../firebase/pedidos';
import { obtenerEstadisticas, obtenerVisitasRecientes, nombreRuta } from '../firebase/visitas';
import { obtenerReclamos, responderReclamo } from '../firebase/reclamos';
import { diasHabilesHasta } from '../utils/diasHabiles';
import { imagen } from '../firebase/imagenesProductos';
import { subirImagen } from '../firebase/almacenamiento';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import Cargando from '../components/Cargando/Cargando';
import Icono from '../components/Icono';
import '../styles/Admin.css';

// Control reutilizable: muestra la foto actual y un botón para subir otra a Storage.
function SubirFoto({ valor, onSubido, carpeta = 'varios', prevStyle, vaciStyle }) {
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState('');
  const onArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setSubiendo(true);
    try {
      const url = await subirImagen(file, carpeta);
      onSubido(url);
    } catch (ex) {
      setErr(ex?.message || 'No se pudo subir');
    }
    setSubiendo(false);
  };
  return (
    <div className="subir-foto">
      {valor
        ? <img src={imagen(valor)} alt="" className="subir-foto-prev" style={prevStyle} />
        : <div className="subir-foto-vacio" style={vaciStyle}>Sin foto</div>}
      <label className="subir-foto-btn">
        {subiendo ? 'Subiendo…' : (valor ? 'Cambiar foto' : 'Subir foto')}
        <input type="file" accept="image/*" onChange={onArchivo} disabled={subiendo} hidden />
      </label>
      {err && <span className="subir-foto-err">{err}</span>}
    </div>
  );
}

const CATEGORIAS = ['Climbing', 'Mountaineering', 'Trekking', 'Daypack'];
const CAT_ES = { Climbing: 'Escalada', Mountaineering: 'Montañismo', Trekking: 'Senderismo', Daypack: 'Mochila de día' };

const FEATURES_DEFAULT = [
  { titulo: '', desc: '' },
];

const SPECS_DEFAULT = [
  { label: '', valor: '' },
];

// Zonas de texto del producto con color y tipografía propios (se guardan con el producto).
const ESTILO_ZONAS = [
  ['nombre', 'Nombre'],
  ['precio', 'Precio'],
  ['descripcion', 'Descripción'],
  ['features', 'Características'],
  ['specs', 'Especificaciones'],
  ['stock', 'Aviso de stock'],
];

const VACIO = {
  nombre: '', nombreEn: '',
  precio: '', precioOriginal: '', moneda: 'S/',
  imagenMochila: '', imagenContexto: '',
  fotos: [],
  descripcion: '', descripcionEn: '',
  stock: '', activo: true, categoria: 'Climbing',
  galeria: [],
  features: FEATURES_DEFAULT,
  specs: SPECS_DEFAULT,
  estilos: {},
};

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

const etiquetaEstado = (estado, pedido) =>
  estado === 'enviado' && pedido.envio?.tipo !== 'envio' ? 'Listo para recoger' : (ESTADO_LABELS[estado] || estado);

const ESTADO_LABELS = {
  procesando_pago:  'Procesando pago',
  verificando_pago: 'Verificando pago',
  pendiente_envio:  'Pagado, por enviar',
  enviado:         'Enviado',
  entregado:       'Entregado',
  cancelado:       'Cancelado',
  // viejos
  pendiente:   'Pendiente',
  verificando: 'Procesando pago',
  pagado:      'Pagado, por enviar',
};

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
  const { t } = useIdioma();
  const { textos, guardar: guardarTextoGlobal } = useTextos();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [stats, setStats] = useState({ total: 0, logueados: 0, porRuta: {}, porDia: {}, porPais: {} });
  const [visitasRecientes, setVisitasRecientes] = useState([]);
  const [visitasLimite, setVisitasLimite] = useState(10);
  const [pestana, setPestana] = useState('productos'); // 'productos' | 'pedidos' | 'visitas' | 'reclamos'
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [msg, setMsg] = useState('');
  const [reclamos, setReclamos] = useState([]);
  const [reclamosError, setReclamosError] = useState('');
  const [filtroReclamos, setFiltroReclamos] = useState('pendientes'); // 'pendientes' | 'respondidos'
  const [reclamoAbierto, setReclamoAbierto] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [respondiendo, setRespondiendo] = useState(false);

  const cargar = async () => {
    setProductos(await obtenerProductos());
  };

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

  useEffect(() => { cargar(); cargarPedidos(); cargarStats(); cargarReclamos(); }, []);

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

  const pedidosVerificando = pedidos.filter(p => ['verificando_pago', 'verificando'].includes(p.estado));
  const reclamosPendientes = reclamos.filter((r) => r.estado !== 'respondido');
  const reclamosRespondidos = reclamos.filter((r) => r.estado === 'respondido');

  const ESTADOS_PENDIENTE = ['verificando_pago', 'pendiente_envio', 'enviado', 'pendiente', 'verificando', 'pagado'];
  const pedidosPendientes  = pedidos.filter(p => ESTADOS_PENDIENTE.includes(p.estado));
  const pedidosCompletados = pedidos.filter(p => p.estado === 'entregado');
  const pedidosCancelados  = pedidos.filter(p => p.estado === 'cancelado');

  const [filtroPedidos, setFiltroPedidos] = useState('pendientes'); // 'pendientes' | 'completados' | 'cancelados'

  const guardar = async (e) => {
    e.preventDefault();
    const fotos = (form.fotos || []).filter(Boolean);
    const datos = {
      ...form,
      fotos,
      imagenMochila: fotos[0] || form.imagenMochila || '', // portada para el catálogo
      precio: Number(form.precio),
      precioOriginal: Number(form.precioOriginal) || null,
      stock: Number(form.stock) || 0,
    };
    try {
      if (editandoId) {
        await actualizarProducto(editandoId, datos);
        setMsg('Producto actualizado');
      } else {
        await agregarProducto(datos);
        setMsg('Producto agregado');
      }
      setForm(VACIO);
      setEditandoId(null);
      cargar();
    } catch (err) {
      setMsg('No se pudo guardar: ' + err.message);
    }
  };

  const editar = (p) => {
    setForm({
      nombre: p.nombre, nombreEn: p.nombreEn || '', precio: p.precio, precioOriginal: p.precioOriginal || '',
      moneda: p.moneda || 'S/', imagenMochila: p.imagenMochila,
      imagenContexto: p.imagenContexto, descripcion: p.descripcion || '',
      descripcionEn: p.descripcionEn || '',
      stock: p.stock || '', activo: p.activo !== false,
      categoria: p.categoria || 'Climbing',
      fotos: Array.isArray(p.fotos) && p.fotos.length
        ? p.fotos
        : [p.imagenMochila, p.imagenContexto].filter(Boolean),
      galeria: Array.isArray(p.galeria) ? p.galeria : [],
      features: Array.isArray(p.features) && p.features.length ? p.features : FEATURES_DEFAULT,
      specs: Array.isArray(p.specs) && p.specs.length ? p.specs : SPECS_DEFAULT,
      estilos: p.estilos || {},
    });
    setEditandoId(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const borrar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    await eliminarProducto(id);
    setMsg('Producto eliminado');
    cargar();
  };

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
            className={pestana === 'productos' ? 'activa' : ''}
            onClick={() => setPestana('productos')}
          >
            {t('admin.tab_productos')}
          </button>
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
            <div className="admin-contadores">
              <div className="contador-card" style={{ borderTop: '4px solid #ff6b35' }}>
                <span className="contador-num">{stats.visitasHoy || 0}</span>
                <span className="contador-label">Hoy</span>
                <span className="contador-sub">veces que entraron al sitio hoy</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #5f0a87' }}>
                <span className="contador-num">{stats.total}</span>
                <span className="contador-label">Últimos 30 días</span>
                <span className="contador-sub">veces que entraron en el mes</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #2196f3' }}>
                <span className="contador-num">{stats.visitantesUnicos || 0}</span>
                <span className="contador-label">Visitantes únicos</span>
                <span className="contador-sub">personas distintas (una que vuelve no se cuenta 2 veces)</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #4caf50' }}>
                <span className="contador-num">{stats.logueados}</span>
                <span className="contador-label">Identificados</span>
                <span className="contador-sub">personas que entraron con su cuenta</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #f57c00' }}>
                <span className="contador-num">{Object.keys(stats.porPais).length}</span>
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
                        {v.email ? (
                          <strong>{NOMBRES[v.email] ? `${NOMBRES[v.email]} · ${v.email}` : v.email}</strong>
                        ) : (
                          <span style={{ color:'#888' }}>Visitante anónimo</span>
                        )}
                      </div>
                      <div className="visita-meta">
                        {v.ciudad && v.ciudad !== 'Desconocida' ? `${v.ciudad}, ` : ''}{v.pais || '—'} · {v.dispositivo} · {v.navegador}
                      </div>
                      <div className="visita-recorrido">Vio: {v.recorrido.map(nombreRuta).join(' → ')}</div>
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
              {Object.entries(stats.porDia)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 30)
                .map(([fecha, n]) => {
                  const max = Math.max(...Object.values(stats.porDia), 1);
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
              {Object.keys(stats.porDia).length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>
                  {t('admin.sin_visitas')}
                </p>
              )}
            </div>

            <h3 style={{ marginTop: 32, marginBottom: 4 }}>Páginas más visitadas</h3>
            <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Qué páginas recorren dentro de una misma visita.</p>
            <div className="admin-tabla-stats">
              {Object.entries(stats.porRuta)
                .sort((a, b) => b[1] - a[1])
                .map(([ruta, n]) => {
                  const max = Math.max(...Object.values(stats.porRuta), 1);
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

            <h3 style={{ marginTop: 32, marginBottom: 16 }}>Visitantes por país</h3>
            <div className="admin-tabla-stats">
              {Object.entries(stats.porPais)
                .sort((a, b) => b[1] - a[1])
                .map(([pais, n]) => {
                  const max = Math.max(...Object.values(stats.porPais), 1);
                  const ancho = Math.max(8, (n / max) * 100);
                  return (
                    <div key={pais} className="stat-row">
                      <span className="stat-fecha">{pais}</span>
                      <div className="stat-bar-wrap">
                        <div className="stat-bar" style={{ width: `${ancho}%`, background: '#4caf50' }} />
                      </div>
                      <span className="stat-num">{n}</span>
                    </div>
                  );
                })}
            </div>

            {/* Dispositivos */}
            {stats.porDispositivo && Object.keys(stats.porDispositivo).length > 0 && (
              <>
                <h3 style={{ marginTop: 32, marginBottom: 16 }}>Dispositivos</h3>
                <div className="admin-tabla-stats">
                  {Object.entries(stats.porDispositivo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([disp, n]) => {
                      const max = Math.max(...Object.values(stats.porDispositivo), 1);
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
                        <span className="admin-pedido-email">{p.email}</span>
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
                    <ul className="admin-pedido-items">
                      {p.items?.map((it, i) => (
                        <li key={i}>{it.cantidad}× {it.nombre} — S/{it.precio * it.cantidad}.00</li>
                      ))}
                    </ul>
                    {p.envio && (
                      <p className="admin-pedido-envio">
                        <Icono nombre={p.envio.tipo === 'envio' ? 'camion' : 'tienda'} tam={16} />
                        {p.envio.tipo === 'envio'
                          ? `${t('admin.dominio_envio')}: ${p.envio.direccion}, ${p.envio.distrito}`
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

        {/* ====== SECCIÓN PRODUCTOS ====== */}
        {pestana === 'productos' && (<>
        <form className="admin-form" onSubmit={guardar}>
          <h2>{editandoId ? t('admin.editar_producto') : t('admin.agregar_producto')}</h2>
          <div className="admin-grid">
            <label>{t('admin.nombre_es')}
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label>{t('admin.precio')}
              <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            </label>
            <label>{t('admin.precio_original')}
              <input type="number" value={form.precioOriginal} onChange={(e) => setForm({ ...form, precioOriginal: e.target.value })} />
            </label>
            <label>{t('admin.stock')}
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </label>
            <label>{t('admin.categoria')}
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c} — {CAT_ES[c]}</option>)}
              </select>
            </label>
          </div>

          {/* Fotos de la mochila — carrusel que se desliza arriba del producto */}
          <label>Fotos de la mochila <span style={{ color: '#999', fontSize: '12px' }}>(se deslizan arriba; la 1ª es la portada del catálogo)</span></label>
          <div className="admin-fotos-grid" style={{ marginBottom: 18 }}>
            {(form.fotos || []).map((url, i) => (
              <div key={i} className="admin-foto-card">
                <SubirFoto valor={url} carpeta="productos"
                  onSubido={(nueva) => {
                    const arr = [...form.fotos];
                    arr[i] = nueva;
                    setForm({ ...form, fotos: arr });
                  }} />
                {url && (
                  <button type="button" className="admin-foto-quitar"
                    onClick={() => setForm({ ...form, fotos: form.fotos.filter((_, j) => j !== i) })}>
                    Quitar
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="admin-foto-agregar"
              onClick={() => setForm({ ...form, fotos: [...(form.fotos || []), ''] })}>
              + Agregar foto
            </button>
          </div>

          {/* Galería propia del producto — se muestra debajo del producto */}
          <label>Galería de abajo <span style={{ color: '#999', fontSize: '12px' }}>(las otras fotos que salen debajo del producto)</span></label>
          <div className="admin-fotos-grid" style={{ marginBottom: 18 }}>
            {(form.galeria || []).map((url, i) => (
              <div key={i} className="admin-foto-card">
                <SubirFoto valor={url} carpeta="productos"
                  onSubido={(nueva) => {
                    const arr = [...form.galeria];
                    arr[i] = nueva;
                    setForm({ ...form, galeria: arr });
                  }} />
                {url && (
                  <button type="button" className="admin-foto-quitar"
                    onClick={() => setForm({ ...form, galeria: form.galeria.filter((_, j) => j !== i) })}>
                    Quitar
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="admin-foto-agregar"
              onClick={() => setForm({ ...form, galeria: [...(form.galeria || []), ''] })}>
              + Agregar foto
            </button>
          </div>
          {/* Características destacadas */}
          <label style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            Características <span style={{ color: '#999', fontSize: '12px' }}>(propiedades que se muestran bajo la descripción)</span>
            <input
              type="color"
              value={textos['producto_specs_color'] || '#1d1b15'}
              onChange={(e) => guardarTextoGlobal('producto_specs_color', e.target.value)}
              title="Color de Características y Especificaciones en TODOS los productos"
              style={{ width: 26, height: 26, border: '1px solid #ddd', borderRadius: '50%', cursor: 'pointer', padding: 0, background: 'none' }}
            />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {(form.features || []).map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 28px', gap: 6, alignItems: 'center' }}>
                <input
                  className="admin-foto-input"
                  placeholder={`Título ${i + 1}`}
                  value={f.titulo}
                  onChange={(e) => {
                    const arr = [...form.features];
                    arr[i] = { ...arr[i], titulo: e.target.value };
                    setForm({ ...form, features: arr });
                  }}
                />
                <input
                  className="admin-foto-input"
                  placeholder="Descripción corta"
                  value={f.desc}
                  onChange={(e) => {
                    const arr = [...form.features];
                    arr[i] = { ...arr[i], desc: e.target.value };
                    setForm({ ...form, features: arr });
                  }}
                />
                <button type="button" onClick={() => setForm({ ...form, features: form.features.filter((_, j) => j !== i) })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 16, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="admin-fila-agregar" style={{ marginBottom: 18 }}
            onClick={() => setForm({ ...form, features: [...(form.features || []), { titulo: '', desc: '' }] })}>
            + Agregar fila
          </button>

          {/* Especificaciones */}
          <label style={{ marginBottom: 6 }}>Especificaciones <span style={{ color: '#999', fontSize: '12px' }}>(tabla de la ficha técnica — usa el mismo color de arriba)</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {(form.specs || SPECS_DEFAULT).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 28px', gap: 6, alignItems: 'center' }}>
                <input
                  className="admin-foto-input"
                  placeholder={`Título ${i + 1}`}
                  value={s.label}
                  onChange={(e) => {
                    const arr = [...form.specs];
                    arr[i] = { ...arr[i], label: e.target.value };
                    setForm({ ...form, specs: arr });
                  }}
                />
                <input
                  className="admin-foto-input"
                  placeholder="Descripción corta"
                  value={s.valor}
                  onChange={(e) => {
                    const arr = [...form.specs];
                    arr[i] = { ...arr[i], valor: e.target.value };
                    setForm({ ...form, specs: arr });
                  }}
                />
                <button type="button" onClick={() => setForm({ ...form, specs: form.specs.filter((_, j) => j !== i) })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 16, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="admin-fila-agregar" style={{ marginBottom: 18 }}
            onClick={() => setForm({ ...form, specs: [...(form.specs || []), { label: '', valor: '' }] })}>
            + Agregar fila
          </button>

          <label>{t('admin.descripcion_es')} <span style={{ color: '#999', fontSize: '12px' }}>(el inglés se traduce solo)</span>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows="3" />
          </label>

          {/* Color y tipografía de cada texto del producto */}
          <label style={{ marginBottom: 6 }}>Color y tipo de letra <span style={{ color: '#999', fontSize: '12px' }}>(cómo se ve cada texto en la página del producto; la fuente se escribe, ej. IBM Plex Mono, Georgia, Roboto)</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {ESTILO_ZONAS.map(([zona, nombreZona]) => {
              const est = (form.estilos || {})[zona] || {};
              const setEstilo = (campo, valor) => setForm({
                ...form,
                estilos: { ...(form.estilos || {}), [zona]: { ...est, [campo]: valor } },
              });
              return (
                <div key={zona} style={{ display: 'grid', gridTemplateColumns: '150px 44px 1fr 28px', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{nombreZona}</span>
                  <input
                    type="color"
                    value={est.color || '#111111'}
                    onChange={(e) => setEstilo('color', e.target.value)}
                    title={`Color de ${nombreZona}`}
                    style={{ width: 36, height: 28, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }}
                  />
                  <input
                    className="admin-foto-input"
                    placeholder="IBM Plex Mono"
                    value={est.fuente || ''}
                    onChange={(e) => setEstilo('fuente', e.target.value)}
                    spellCheck={false}
                    title={`Tipo de letra de ${nombreZona}`}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, estilos: { ...(form.estilos || {}), [zona]: {} } })}
                    title="Volver al estilo por defecto"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 16, padding: 0 }}
                  >×</button>
                </div>
              );
            })}
          </div>

          <label className="admin-check">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            {t('admin.activo')}
          </label>
          <div className="admin-acciones">
            <button type="submit">{editandoId ? t('admin.guardar') : t('admin.agregar_producto')}</button>
            {editandoId && (
              <button type="button" className="admin-cancelar" onClick={() => { setForm(VACIO); setEditandoId(null); }}>
                {t('admin.cancelar')}
              </button>
            )}
          </div>
        </form>

        <h2 className="admin-lista-titulo">{t('admin.lista_productos')} ({productos.length})</h2>
        <div className="admin-lista">
          {productos.length === 0 && (
            <p style={{ color: '#888' }}>{t('admin.sin_productos')}</p>
          )}
          {productos.map((p) => (
            <div key={p.id} className="admin-card">
              <img src={imagen(p.imagenMochila)} alt={p.nombre} />
              <div className="admin-card-info">
                <strong>{p.nombre}</strong>
                <span>{p.moneda}{p.precio}.00 · stock: {p.stock} · {p.activo !== false ? (t('productos.coleccion') === 'Collection' ? 'active' : 'activo') : (t('productos.coleccion') === 'Collection' ? 'hidden' : 'oculto')}</span>
              </div>
              <div className="admin-card-btns">
                <button onClick={() => editar(p)}>{t('admin.editar')}</button>
                <button className="del" onClick={() => borrar(p.id)}>{t('admin.eliminar')}</button>
              </div>
            </div>
          ))}
        </div>
        </>)}
      </div>
    </>
  );
}
