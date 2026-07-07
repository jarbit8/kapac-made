import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import { useAuth } from '../context/AuthContext';
import {
  obtenerProductos, agregarProducto, actualizarProducto, eliminarProducto,
} from '../firebase/productos';
import {
  obtenerTodosPedidos, actualizarEstadoPedido,
} from '../firebase/pedidos';
import { obtenerEstadisticas, obtenerVisitasRecientes, banderaPais, nombreRuta } from '../firebase/visitas';
import { imagen } from '../firebase/imagenesProductos';
import { subirImagen, subirMedia, borrarMedia } from '../firebase/almacenamiento';
import { HERO_CACHE_KEY } from '../components/Hero/Hero';
import {
  obtenerContenido, guardarContenido,
  HOME_FOTOS_DEFAULT, GALERIA_PRODUCTO_DEFAULT, FOOTER_FONDO_DEFAULT, IN_THE_ZONE_DEFAULT, HERO_VIDEO_DEFAULT,
  ACENTO_DEFAULT, LOGO_DEFAULT, FONDO_DEFAULT, TEXTO_DEFAULT, ALMA_FOTOS_DEFAULT, B2B_BENEFICIOS_DEFAULT, normalizarMedio, slotMedio,
} from '../firebase/contenido';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import { useTema, LOGO_CACHE_KEY } from '../context/TemaContext';
import Cargando from '../components/Cargando/Cargando';
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

// Control para fondos: acepta imagen O video. Reporta { tipo, url }.
function SubirMedia({ valor, onSubido }) {
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [noPrev, setNoPrev] = useState(false); // el navegador no puede previsualizar el video
  const onArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setOk(false); setNoPrev(false); setSubiendo(true);
    const urlAnterior = valor?.url || '';
    try {
      const media = await subirMedia(file, 'fondos');
      await onSubido(media);
      borrarMedia(urlAnterior); // borra el archivo viejo de Storage (fire-and-forget)
      setOk(true);
    } catch (ex) {
      setErr(ex?.message || 'No se pudo subir');
    }
    setSubiendo(false);
  };
  return (
    <div className="subir-foto">
      {valor?.url
        ? (valor.tipo === 'video'
            ? (noPrev
                ? <div className="subir-foto-vacio" style={{ color: '#155724' }}>✓ Video guardado<br/>(no se previsualiza)</div>
                : <video src={valor.url} className="subir-foto-prev" muted loop autoPlay playsInline controls
                    onError={() => setNoPrev(true)} />)
            : <img src={valor.url} alt="" className="subir-foto-prev" />)
        : <div className="subir-foto-vacio">Sin fondo</div>}
      <label className="subir-foto-btn">
        {subiendo ? 'Subiendo…' : (valor?.url ? 'Cambiar' : 'Subir imagen o video')}
        <input type="file" accept="image/*,video/*" onChange={onArchivo} disabled={subiendo} hidden />
      </label>
      {ok && <span style={{ color: '#155724', fontSize: 12, fontWeight: 600 }}>✓ Guardado en la base de datos</span>}
      {err && <span className="subir-foto-err">⚠️ {err}</span>}
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

const ESTADOS_PEDIDO = ['procesando_pago', 'verificando_pago', 'pendiente_envio', 'enviado', 'entregado', 'cancelado'];

const ESTADO_LABELS = {
  procesando_pago:  '🔄 Procesando pago',
  verificando_pago: '🔍 Verificando pago',
  pendiente_envio:  '📦 Pendiente de envío',
  enviado:         '🚚 Enviado',
  entregado:       '🎉 Entregado',
  cancelado:       '❌ Cancelado',
  // viejos
  pendiente:   '🕐 Pendiente',
  verificando: '🔄 Procesando pago',
  pagado:      '📦 Pendiente de envío',
};

const METODO_PAGO_LABELS = {
  yape:         '📱 Yape (QR)',
  'yape-codigo': '📱 Yape (código)',
  tarjeta:      '💳 Tarjeta',
  efectivo:     '💵 PagoEfectivo',
};

const ESTADO_COLORES = {
  procesando_pago: { bg: '#fff3cd', color: '#856404' },
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
  const { setTema, setCerrado } = useTema();
  const { textos, guardar: guardarTextoGlobal } = useTextos();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [stats, setStats] = useState({ total: 0, logueados: 0, porRuta: {}, porDia: {}, porPais: {} });
  const [visitasRecientes, setVisitasRecientes] = useState([]);
  const [visitasLimite, setVisitasLimite] = useState(10);
  const [pestana, setPestana] = useState('productos'); // 'productos' | 'pedidos' | 'visitas'
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [msg, setMsg] = useState('');

  // Contenido editable (fotos de home + galería de producto)
  const [contenido, setContenido] = useState({ homeFotos: HOME_FOTOS_DEFAULT, galeriaProducto: GALERIA_PRODUCTO_DEFAULT, footerFondo: FOOTER_FONDO_DEFAULT, inTheZoneFoto: IN_THE_ZONE_DEFAULT, heroVideo: HERO_VIDEO_DEFAULT, almaFotos: ALMA_FOTOS_DEFAULT, acento: ACENTO_DEFAULT, logo: LOGO_DEFAULT, fondo: FONDO_DEFAULT, texto: TEXTO_DEFAULT, b2bBeneficios: B2B_BENEFICIOS_DEFAULT, cerrado: false });
  const [guardandoContenido, setGuardandoContenido] = useState(false);
  const [msgContenido, setMsgContenido] = useState('');

  const cargarContenido = () => {
    obtenerContenido().then(setContenido).catch(() => {});
  };

  // Guarda un objeto de contenido en Firestore y refleja el estado.
  const persistirContenido = async (nuevo) => {
    setContenido(nuevo);
    setGuardandoContenido(true); setMsgContenido('');
    try {
      await guardarContenido(nuevo);
      try { localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(nuevo.heroVideo || null)); } catch (_) {}
      try {
        if (nuevo.logo) localStorage.setItem(LOGO_CACHE_KEY, nuevo.logo);
        setTema((prev) => ({
          ...prev,
          logo: nuevo.logo || prev.logo,
          fondo: nuevo.fondo || prev.fondo,
          texto: nuevo.texto || prev.texto,
        }));
      } catch (_) {}
      setMsgContenido('✓ Guardado');
    } catch (e) {
      setMsgContenido('No se pudo guardar: ' + (e?.message || ''));
      throw e;
    } finally {
      setGuardandoContenido(false);
    }
  };


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

  useEffect(() => { cargar(); cargarPedidos(); cargarStats(); }, []);

  const cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    await actualizarEstadoPedido(pedidoId, nuevoEstado);
    setMsg(`✅ Pedido actualizado a "${nuevoEstado}"`);
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
        setMsg('✅ Producto actualizado');
      } else {
        await agregarProducto(datos);
        setMsg('✅ Producto agregado');
      }
      setForm(VACIO);
      setEditandoId(null);
      cargar();
    } catch (err) {
      setMsg('❌ ' + err.message);
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
    setMsg('🗑️ Producto eliminado');
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

  if (!usuario || usuario.email !== 'jarb2299@gmail.com') {
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
            className={pestana === 'fotos' ? 'activa' : ''}
            onClick={() => { setPestana('fotos'); cargarContenido(); }}
          >
            📸 Fotos
          </button>
          <button
            className={pestana === 'visitas' ? 'activa' : ''}
            onClick={() => { setPestana('visitas'); cargarStats(); }}
          >
            {t('admin.tab_visitas')}
          </button>
        </div>

        {/* ====== SECCIÓN FOTOS (home + galería de producto) ====== */}
        {pestana === 'fotos' && (
          <div className="admin-fotos">
            <p className="admin-fotos-intro">
              Sube las fotos del sitio. Cada cambio se <b>guarda solo</b> al subir, quitar o salir de un campo de texto.
            </p>

            <h3 className="admin-fotos-titulo">Diseño (fondo, navegación y botones)</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16, marginTop: -8 }}>El color de cada texto se cambia con la pastilla 🎨 al lado de su lápiz ✏️, directo en la página. El logo se cambia pasando el mouse por encima, en la página de inicio. El menú y los botones usan un único color, acá abajo.</p>
            <div className="admin-fotos-grid">
              <div className="admin-foto-card">
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Fondo del sitio</label>
                <input
                  type="color"
                  value={contenido.fondo || FONDO_DEFAULT}
                  onChange={(e) => {
                    const color = e.target.value;
                    document.documentElement.style.setProperty('--fondo', color);
                    persistirContenido({ ...contenido, fondo: color });
                  }}
                  style={{ width: 64, height: 44, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                />
                <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0' }}>
                  Color de fondo de todas las páginas.
                </p>
              </div>

              <div className="admin-foto-card">
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Navegación y botones</label>
                <input
                  type="color"
                  value={contenido.acento || ACENTO_DEFAULT}
                  onChange={(e) => {
                    const color = e.target.value;
                    document.documentElement.style.setProperty('--clay', color);
                    persistirContenido({ ...contenido, acento: color });
                  }}
                  style={{ width: 64, height: 44, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                />
                <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0' }}>
                  Un solo color para el menú (Shop, Kapac Made, B2B, Info, Admin) y todos los botones del sitio.
                </p>
              </div>

              <div className="admin-foto-card">
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Tienda pública</label>
                <button
                  type="button"
                  onClick={() => {
                    const cerrado = !contenido.cerrado;
                    persistirContenido({ ...contenido, cerrado });
                    setCerrado(cerrado);
                    try { localStorage.setItem('kapac_cerrado_v1', cerrado ? '1' : '0'); } catch (_) {}
                  }}
                  style={{
                    padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: contenido.cerrado ? '#f8d7da' : '#d4edda',
                    color: contenido.cerrado ? '#842029' : '#155724',
                  }}
                >
                  {contenido.cerrado ? '🔴 Cerrada — solo tú la ves' : '🟢 Abierta a todo el mundo'}
                </button>
                <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0' }}>
                  Cerrada: los visitantes ven una pantalla "Próximamente". Tú entras normal con tu cuenta (el candado de abajo a la derecha lleva al login).
                </p>
              </div>
            </div>

            <h3 className="admin-fotos-titulo">Imagen o video principal (Hero — pantalla de inicio)</h3>
            <div className="admin-fotos-grid">
              <div className="admin-foto-card">
                <SubirMedia
                  valor={normalizarMedio(contenido.heroVideo?.pc)}
                  onSubido={(media) => persistirContenido({ ...contenido, heroVideo: { ...(contenido.heroVideo || {}), pc: media } })} />
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>🖥️ Para computadora (horizontal).</p>
              </div>
              <div className="admin-foto-card">
                <SubirMedia
                  valor={normalizarMedio(contenido.heroVideo?.mobile)}
                  onSubido={(media) => persistirContenido({ ...contenido, heroVideo: { ...(contenido.heroVideo || {}), mobile: media } })} />
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>📱 Para celular (vertical).</p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#888', marginTop: -8, marginBottom: 16 }}>Las fotos, títulos y descripciones de "estilo de vida" del home se editan directo en la página de inicio (imagen, lápiz ✏️ y +/− ahí mismo).</p>

            <h3 className="admin-fotos-titulo">Foto épica de "in the zone" (se abre en pestaña nueva)</h3>
            <div className="admin-fotos-grid">
              <div className="admin-foto-card">
                <SubirFoto valor={slotMedio(contenido.inTheZoneFoto, 'pc')?.url || ''} carpeta="zone"
                  onSubido={(url) => persistirContenido({ ...contenido, inTheZoneFoto: { ...(typeof contenido.inTheZoneFoto === 'object' && (contenido.inTheZoneFoto?.pc || contenido.inTheZoneFoto?.mobile) ? contenido.inTheZoneFoto : {}), pc: { tipo: 'imagen', url } } })} />
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>🖥️ Para computadora.</p>
              </div>
              <div className="admin-foto-card">
                <SubirFoto valor={slotMedio(contenido.inTheZoneFoto, 'mobile')?.url || ''} carpeta="zone"
                  onSubido={(url) => persistirContenido({ ...contenido, inTheZoneFoto: { ...(typeof contenido.inTheZoneFoto === 'object' && (contenido.inTheZoneFoto?.pc || contenido.inTheZoneFoto?.mobile) ? contenido.inTheZoneFoto : {}), mobile: { tipo: 'imagen', url } } })} />
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>📱 Para celular (vertical).</p>
              </div>
            </div>

            <h3 className="admin-fotos-titulo">Fondo del pie de página (imagen o video)</h3>
            <div className="admin-fotos-grid">
              <div className="admin-foto-card">
                <SubirMedia valor={slotMedio(contenido.footerFondo, 'pc')}
                  onSubido={(media) => persistirContenido({ ...contenido, footerFondo: { ...(typeof contenido.footerFondo === 'object' && (contenido.footerFondo?.pc || contenido.footerFondo?.mobile) ? contenido.footerFondo : {}), pc: media } })} />
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>🖥️ Para computadora. Se ve al fondo del pie de página.</p>
              </div>
              <div className="admin-foto-card">
                <SubirMedia valor={slotMedio(contenido.footerFondo, 'mobile')}
                  onSubido={(media) => persistirContenido({ ...contenido, footerFondo: { ...(typeof contenido.footerFondo === 'object' && (contenido.footerFondo?.pc || contenido.footerFondo?.mobile) ? contenido.footerFondo : {}), mobile: media } })} />
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>📱 Para celular.</p>
              </div>
            </div>

          </div>
        )}

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
                <span className="contador-sub">entraron con su cuenta</span>
              </div>
              <div className="contador-card" style={{ borderTop: '4px solid #f57c00' }}>
                <span className="contador-num">{Object.keys(stats.porPais).length}</span>
                <span className="contador-label">Países distintos</span>
              </div>
            </div>

            <h3 style={{ marginTop: 32, marginBottom: 4 }}>🕐 Actividad reciente</h3>
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
                const bandera = banderaPais(v.pais);
                const rutaNombre = nombreRuta(v.ruta);
                return (
                  <div key={v.id} className="visita-row">
                    <div className="visita-bandera">{bandera}</div>
                    <div className="visita-info">
                      <div className="visita-quien">
                        {v.email ? (
                          <strong>{v.email}</strong>
                        ) : (
                          <span style={{ color:'#888' }}>👤 Visitante anónimo</span>
                        )}
                      </div>
                      <div className="visita-meta">
                        {v.ciudad && v.ciudad !== 'Desconocida' ? `${v.ciudad}, ` : ''}{v.pais || '—'} · {v.dispositivo} · {v.navegador}
                      </div>
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

            <h3 style={{ marginTop: 32, marginBottom: 4 }}>📅 Visitas por día</h3>
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

            <h3 style={{ marginTop: 32, marginBottom: 4 }}>📄 A dónde navegan (rutas)</h3>
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

            <h3 style={{ marginTop: 32, marginBottom: 16 }}>🌎 Visitantes por país</h3>
            <div className="admin-tabla-stats">
              {Object.entries(stats.porPais)
                .sort((a, b) => b[1] - a[1])
                .map(([pais, n]) => {
                  const max = Math.max(...Object.values(stats.porPais), 1);
                  const ancho = Math.max(8, (n / max) * 100);
                  return (
                    <div key={pais} className="stat-row">
                      <span className="stat-fecha">{banderaPais(pais)} {pais}</span>
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
                <h3 style={{ marginTop: 32, marginBottom: 16 }}>📱 Dispositivos</h3>
                <div className="admin-tabla-stats">
                  {Object.entries(stats.porDispositivo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([disp, n]) => {
                      const max = Math.max(...Object.values(stats.porDispositivo), 1);
                      const ancho = Math.max(8, (n / max) * 100);
                      const icono = disp.includes('iPhone') ? '📱' :
                                    disp.includes('iPad') ? '📱' :
                                    disp.includes('Android') ? '📱' :
                                    disp.includes('Móvil') ? '📱' :
                                    disp.includes('Mac') ? '💻' :
                                    disp.includes('Windows') ? '💻' :
                                    disp.includes('Linux') ? '💻' : '🖥️';
                      return (
                        <div key={disp} className="stat-row">
                          <span className="stat-fecha">{icono} {disp}</span>
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
              🔒 <strong>100% legal en Perú (Ley 29733)</strong> — sin cookies. Los visitantes logueados se identifican
              por su correo (al cual nos dieron consentimiento al loguearse). Los anónimos quedan como "Desconocido".
              La ubicación (país/ciudad) se obtiene vía servicio externo sin guardar la IP cruda. Esto está informado
              en la página <a href="#/legal">/legal</a>.
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
                  <span className="admin-resumen-alerta">⚠️ {pedidosVerificando.length} {t('admin.verificar')}</span>
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
                { key: 'pendientes',  label: `🕐 ${t('admin.filtro_pendientes')} (${pedidosPendientes.length})` },
                { key: 'completados', label: `🎉 ${t('admin.filtro_completados')} (${pedidosCompletados.length})` },
                { key: 'cancelados',  label: `❌ ${t('admin.filtro_cancelados')} (${pedidosCancelados.length})` },
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
                        <span className="admin-pedido-id">#{p.id.slice(0, 8)}</span>
                        <span className="admin-pedido-email">{p.email}</span>
                      </div>
                      <span
                        className="admin-pedido-estado"
                        style={{ background: col.bg, color: col.color }}
                      >
                        {ESTADO_LABELS[p.estado] || p.estado}
                      </span>
                    </div>
                    <p className="admin-pedido-fecha">{formatoFecha(p.fecha)}</p>
                    <p className="admin-pedido-metodo">
                      {METODO_PAGO_LABELS[p.metodoPago] || `❔ ${p.metodoPago || 'Sin método'}`}
                    </p>
                    <ul className="admin-pedido-items">
                      {p.items?.map((it, i) => (
                        <li key={i}>{it.cantidad}× {it.nombre} — S/{it.precio * it.cantidad}.00</li>
                      ))}
                    </ul>
                    {p.envio && (
                      <p className="admin-pedido-envio">
                        {p.envio.tipo === 'envio'
                          ? `📦 ${t('admin.dominio_envio')}: ${p.envio.direccion}, ${p.envio.distrito} · ${p.envio.telefono}`
                          : `🏠 ${t('admin.recojo')} · ${p.envio.telefono || ''}`}
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
                        onChange={(e) => cambiarEstadoPedido(p.id, e.target.value)}
                        className="admin-pedido-select"
                      >
                        {ESTADOS_PEDIDO.map((est) => (
                          <option key={est} value={est}>{est}</option>
                        ))}
                      </select>
                    </div>
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
