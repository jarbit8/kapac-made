// Registro de visitas — legal en Perú (Ley 29733), sin cookies
// - Si el visitante está logueado: guardamos su email
// - Si no: queda como "Desconocido"
// - Ubicación: obtenida vía ipwho.is (NO guardamos IP cruda, solo país/ciudad)
// - Navegador/dispositivo: obtenido del userAgent (info pública)
import {
  collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { esDueno } from '../config/admins';

const COLECCION = 'visitas';

// Zonas del panel, cada una por separado: la pantalla "Próximamente" (con la tienda
// cerrada el visitante solo ve el video), el inicio de sesión y la página por dentro
const ZONAS = ['proximamente', 'login', 'pagina'];
const zonaDe = (v) => (v.ruta === 'proximamente' || v.ruta === 'login' ? v.ruta : 'pagina');

// Los días van con la hora de Perú (UTC-5, sin horario de verano): con la hora
// universal, lo que entraba después de las 7 de la noche caía al día siguiente
const diaPeru = (fecha = new Date()) => new Date(fecha.getTime() - 5 * 3600000).toISOString().slice(0, 10);

// Buscadores, vistas previas de enlaces y navegadores automáticos: se cuentan, marcados como robot
const esRobot = () => !!navigator.webdriver || /bot\/|crawler|spider|headless|lighthouse|facebookexternalhit/i.test(navigator.userAgent);

// Conexión desde un servidor (casi siempre un robot que se hace pasar por navegador).
// Sin Cloudflare ni Akamai: por ahí salen los iPhone con el relay privado de iCloud.
const SERVIDORES = /amazon|aws|google cloud|google llc|microsoft|azure|digitalocean|ovh|hetzner|linode|vultr|oracle|alibaba|tencent|contabo|leaseweb|scaleway/i;

/* ── Helpers ──────────────────────────────────────────────────────────── */

function detectarDispositivo(ua = navigator.userAgent, toques = navigator.maxTouchPoints || 0) {
  // El iPad nuevo se presenta como Mac: se le reconoce porque tiene pantalla táctil
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && toques > 1)) return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android' : 'Tablet Android';
  if (/Mobi/i.test(ua)) return 'Móvil';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'PC Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Otro';
}

function detectarNavegador(ua = navigator.userAgent) {
  // Los que abren el enlace desde Instagram o Facebook usan el navegador de la app
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  return 'Otro';
}

// Algunos servicios dan el código ("PE") y otros el nombre ("Peru"): todo queda como nombre
let regiones = null;
function nombrePais(pais) {
  if (!/^[A-Z]{2}$/.test(pais || '')) return pais;
  try {
    regiones ||= new Intl.DisplayNames(['en'], { type: 'region' });
    return regiones.of(pais) || pais;
  } catch (_) {
    return pais;
  }
}

const aleatorio = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Número al azar que se queda en este navegador: distingue a una persona de otra
// sin saber quién es (la misma persona en otra pestaña u otro día cuenta una vez)
function obtenerVisitanteId() {
  try {
    let id = localStorage.getItem('kapac_visitante');
    if (!id) { id = aleatorio().slice(0, 36); localStorage.setItem('kapac_visitante', id); }
    return id;
  } catch (_) {
    return '';
  }
}

// Id de sesión: 1 por pestaña/sesión de navegador. Sirve para saber cuántas
// veces entraron realmente al sitio, sin que cada página que recorren cuente aparte.
// Empieza con el id del visitante ("visitante.sesión") para contar personas distintas.
// esNueva = true solo la primera vez (recién entró), false en el resto de páginas que recorra.
function obtenerSesionId() {
  let id = sessionStorage.getItem('kapac_sesion_id');
  if (id) return { id, esNueva: false };
  const visitante = obtenerVisitanteId();
  id = `${visitante ? `${visitante}.` : ''}${aleatorio().slice(0, 36)}`;
  sessionStorage.setItem('kapac_sesion_id', id);
  return { id, esNueva: true };
}

// Obtener ubicación vía servicios externos gratuitos (NO guardamos IP cruda).
// Intentamos varios en cascada por si uno falla / rate-limita / CORS.
async function obtenerUbicacion() {
  // Cachear por sesión para no spamear los servicios
  const cache = sessionStorage.getItem('kapac_ubicacion');
  if (cache) {
    try { return JSON.parse(cache); } catch {}
  }

  const servicios = [
    {
      url: 'https://ipwho.is/',
      parse: (d) => (d.success ? { pais: d.country, ciudad: d.city, red: `${d.connection?.org || ''} ${d.connection?.isp || ''}` } : null),
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (d) => (d.country_name ? { pais: d.country_name, ciudad: d.city, red: d.org } : null),
    },
    {
      url: 'https://get.geojs.io/v1/ip/geo.json',
      parse: (d) => (d.country ? { pais: d.country, ciudad: d.city, red: d.organization_name } : null),
    },
    {
      url: 'https://api.country.is/',
      parse: (d) => (d.country ? { pais: d.country, ciudad: '' } : null),
    },
  ];

  for (const svc of servicios) {
    try {
      const res = await fetch(svc.url);
      if (!res.ok) continue;
      const data = await res.json();
      const info = svc.parse(data);
      if (info && info.pais) {
        const limpio = {
          pais:   nombrePais(info.pais) || 'Desconocido',
          ciudad: info.ciudad || 'Desconocida',
          servidor: SERVIDORES.test(info.red || ''),
        };
        sessionStorage.setItem('kapac_ubicacion', JSON.stringify(limpio));
        return limpio;
      }
    } catch (e) {
      // Probar siguiente servicio
      continue;
    }
  }

  return { pais: 'Desconocido', ciudad: 'Desconocida' };
}

/* ── API pública ──────────────────────────────────────────────────────── */

/**
 * Registra una visita. Antiduplicación por sesión.
 */
export { detectarDispositivo, detectarNavegador };

export async function registrarVisita(ruta = '/', usuario = null, pidio = '') {
  try {
    const segmento = ruta.split('/').filter(Boolean)[0] || 'home';

    // 1 visita por ruta por sesión (no duplicar refrescos)
    const clave = `visita_${segmento}`;
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, '1');

    const { id: sesionId, esNueva } = obtenerSesionId();

    const { pais, ciudad, servidor } = await obtenerUbicacion();

    const visitaDoc = {
      fecha: serverTimestamp(),
      dia:   diaPeru(),
      ruta:  segmento,
      sesionId,
      entrada: esNueva, // true solo la primera página de la sesión (recién entró al sitio)
      // Identidad
      email: usuario?.email || null,
      uid:   usuario?.uid || null,
      // Ubicación derivada (NO guardamos IP)
      pais,
      ciudad,
      // Info pública del navegador
      dispositivo: detectarDispositivo(),
      navegador:   detectarNavegador(),
      robot:       esRobot() || !!servidor,
      pidio:       pidio && pidio !== '/' ? pidio.slice(0, 200) : null, // con la tienda cerrada: la dirección que quiso abrir
    };

    try {
      await addDoc(collection(db, COLECCION), visitaDoc);
    } catch (e) {
      // Si las reglas publicadas aún no conocen los campos nuevos, se guarda sin ellos
      if (e?.code !== 'permission-denied') throw e;
      const { robot, pidio, ...basica } = visitaDoc;
      await addDoc(collection(db, COLECCION), basica);
    }
  } catch (e) {
    console.warn('No se pudo registrar visita:', e?.message);
  }
}

// El número del navegador va al inicio del sesionId ("visitante.sesión")
const visitanteDe = (v) => (v.sesionId?.includes('.') ? v.sesionId.split('.')[0] : '');

// A cada visita le pone su persona: su correo si alguna vez entró con su cuenta desde
// ese navegador (así no cuenta como dos personas antes y después del login), o el número
// del navegador; las visitas viejas, sin ese número, se aproximan por país, ciudad,
// dispositivo y navegador.
function agrupar(visitas) {
  const correoDe = {};
  visitas.forEach((v) => {
    const visitante = visitanteDe(v);
    if (v.email && visitante) correoDe[visitante] = v.email;
  });
  return visitas.map((v) => {
    const visitante = visitanteDe(v);
    const correo = v.email || correoDe[visitante] || null;
    return { ...v, correo, persona: correo || visitante || `${v.pais}|${v.ciudad}|${v.dispositivo}|${v.navegador}` };
  });
}

/** Obtener las últimas N entradas a una zona (no cada página que recorren) para la lista del admin.
 *  Quien vio "Próximamente", fue al login y entró aparece en las tres zonas. */
export async function obtenerVisitasRecientes(n = 10, zona = 'pagina') {
  try {
    // Traemos más para luego filtrar al admin y quedarnos solo con entradas, sin perder cantidad
    const snap = await getDocs(
      query(collection(db, COLECCION), orderBy('fecha', 'desc'), limit(Math.max(n * 6, 120)))
    );
    const todas = agrupar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      .filter((v) => !esDueno(v.correo));
    // Si en esa visita después anduvo con su cuenta, el login le funcionó
    const entraron = new Set(todas.filter((v) => v.email && v.sesionId).map((v) => v.sesionId));
    const visitas = todas.filter((v) => zonaDe(v) === zona);
    // Páginas que vio en esa misma visita, en orden (llegan de la más nueva a la más vieja)
    const recorridos = {};
    visitas.forEach((v) => {
      if (v.sesionId) (recorridos[v.sesionId] = recorridos[v.sesionId] || []).unshift(v);
    });
    return visitas
      .filter((v) => (v.sesionId ? recorridos[v.sesionId][0] === v : v.entrada))
      .slice(0, n)
      .map((v) => ({ ...v, recorrido: (recorridos[v.sesionId] || [v]).map((x) => x.ruta), entro: entraron.has(v.sesionId) }));
  } catch (e) {
    console.error('Error obteniendo visitas recientes:', e);
    return [];
  }
}

export const SIN_VISITAS = { total: 0, logueados: 0, visitasHoy: 0, visitantesUnicos: 0, robots: 0, porRuta: {}, porDia: {}, porPais: {}, ciudadesPorPais: {}, porDispositivo: {} };
const contar = (grupos) => Object.fromEntries(Object.entries(grupos).map(([k, s]) => [k, s.size]));

// Cuenta entradas reales y personas distintas (no cada página que recorren)
function resumir(visitas) {
  const porRuta = {};
  const personasPorPais = {};
  const personasPorCiudad = {}; // pais -> ciudad -> Set(persona)
  const personasPorDispositivo = {};
  const visitantesUnicos = new Set();
  const robots = new Set();
  const sesionesPorDia = {}; // dia -> Set(sesionId): cuenta accesos reales, no cada página vista
  const sesionesTotal = new Set();
  const identificados = new Set();

  const hoy = diaPeru();

  visitas.forEach((v) => {
    porRuta[v.ruta]  = (porRuta[v.ruta]  || 0) + 1;

    if (v.correo) identificados.add(v.correo);

    // Sesión = 1 entrada real al sitio. Las visitas viejas (sin sesionId) se agrupan
    // por persona+día como aproximación, para no contar cada página que recorrieron.
    const identidad = v.persona;
    const pais = nombrePais(v.pais) || 'Desconocido';
    (personasPorPais[pais] ||= new Set()).add(identidad);
    ((personasPorCiudad[pais] ||= {})[v.ciudad || 'Desconocida'] ||= new Set()).add(identidad);
    (personasPorDispositivo[v.dispositivo || 'Otro'] ||= new Set()).add(identidad);
    const sid = v.sesionId || `${v.dia}_${identidad}`;
    sesionesTotal.add(sid);
    if (!sesionesPorDia[v.dia]) sesionesPorDia[v.dia] = new Set();
    sesionesPorDia[v.dia].add(sid);

    visitantesUnicos.add(identidad);
    if (v.robot) robots.add(identidad);
  });

  const porDia = {};
  Object.entries(sesionesPorDia).forEach(([dia, set]) => { porDia[dia] = set.size; });

  return {
    total: sesionesTotal.size,
    logueados: identificados.size,
    visitasHoy: sesionesPorDia[hoy] ? sesionesPorDia[hoy].size : 0,
    visitantesUnicos: visitantesUnicos.size,
    robots: robots.size,
    porRuta,
    porDia,
    porPais: contar(personasPorPais),
    ciudadesPorPais: Object.fromEntries(Object.entries(personasPorCiudad).map(([pais, ciudades]) => [pais, contar(ciudades)])),
    porDispositivo: contar(personasPorDispositivo),
  };
}

/** Obtener estadísticas agregadas (para gráficos) — excluye al admin. Una por zona. */
export async function obtenerEstadisticas(diasAtras = 30) {
  try {
    const snap = await getDocs(
      query(collection(db, COLECCION), orderBy('fecha', 'desc'), limit(2000))
    );

    const limite = new Date();
    limite.setDate(limite.getDate() - diasAtras);
    const limiteStr = diaPeru(limite);

    const visitas = agrupar(snap.docs.map((d) => d.data()))
      .filter((v) => (v.dia || '') >= limiteStr)
      .filter((v) => !esDueno(v.correo)); // excluir al dueño, también lo que vio antes de entrar con su cuenta

    return Object.fromEntries(ZONAS.map((z) => [z, resumir(visitas.filter((v) => zonaDe(v) === z))]));
  } catch (e) {
    console.error('Error obteniendo estadísticas:', e);
    return Object.fromEntries(ZONAS.map((z) => [z, SIN_VISITAS]));
  }
}

/** Mapa de ruta → nombre legible para mostrar al admin */
export function nombreRuta(ruta) {
  const mapa = {
    'home':         'Inicio',
    'proximamente': 'Próximamente (tienda cerrada)',
    'shop':         'Tienda',
    'kapac-made':   'Kapac Made (historia)',
    'info':         'Info y contacto',
    'zone':         'In the zone',
    'catalogo':     'Catálogo',
    'b2b':          'B2B (empresas)',
    'alma':         'Kapac Made (historia)',
    'contacto':     'Contacto',
    'legal':        'Información legal',
    'libro-reclamaciones': 'Libro de Reclamaciones',
    'producto':     'Detalle de producto',
    'carrito':      'Carrito',
    'checkout':     'Datos de envío',
    'metodo-pago':  'Elección de pago',
    'pago':         'Pasarela de pago',
    'confirmacion': 'Pedido confirmado',
    'perfil':       'Mi perfil',
    'pedidos':      'Mis pedidos',
    'login':        'Inicio de sesión',
    'admin':        'Panel admin',
  };
  if (mapa[ruta]) return mapa[ruta];
  // Fallback: capitalizar la primera letra
  if (!ruta) return 'Inicio';
  return ruta.charAt(0).toUpperCase() + ruta.slice(1);
}

/** Mapa de país → emoji bandera. Soporta nombres en ES y EN */
export function banderaPais(pais) {
  if (!pais || pais === 'Desconocido') return '🌍';
  const mapa = {
    'Peru': '🇵🇪', 'Perú': '🇵🇪',
    'Mexico': '🇲🇽', 'México': '🇲🇽',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Bolivia': '🇧🇴',
    'Ecuador': '🇪🇨',
    'Venezuela': '🇻🇪',
    'Uruguay': '🇺🇾',
    'Paraguay': '🇵🇾',
    'Brazil': '🇧🇷', 'Brasil': '🇧🇷',
    'United States': '🇺🇸', 'Estados Unidos': '🇺🇸', 'USA': '🇺🇸',
    'Canada': '🇨🇦', 'Canadá': '🇨🇦',
    'Spain': '🇪🇸', 'España': '🇪🇸',
    'France': '🇫🇷', 'Francia': '🇫🇷',
    'Germany': '🇩🇪', 'Alemania': '🇩🇪',
    'Italy': '🇮🇹', 'Italia': '🇮🇹',
    'United Kingdom': '🇬🇧', 'Reino Unido': '🇬🇧',
    'Portugal': '🇵🇹',
    'Netherlands': '🇳🇱', 'Países Bajos': '🇳🇱',
    'China': '🇨🇳',
    'Japan': '🇯🇵', 'Japón': '🇯🇵',
    'India': '🇮🇳',
    'Australia': '🇦🇺',
    'Russia': '🇷🇺', 'Rusia': '🇷🇺',
  };
  return mapa[pais] || '🌎';
}
