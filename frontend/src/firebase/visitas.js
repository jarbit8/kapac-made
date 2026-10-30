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

// Con la tienda cerrada el visitante solo ve el video: eso se cuenta en su propia zona
const esProximamente = (v) => v.ruta === 'proximamente';

/* ── Helpers ──────────────────────────────────────────────────────────── */

function detectarDispositivo(ua = navigator.userAgent) {
  if (/iPad/i.test(ua)) return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android' : 'Tablet Android';
  if (/Mobi/i.test(ua)) return 'Móvil';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'PC Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Otro';
}

function detectarNavegador(ua = navigator.userAgent) {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  return 'Otro';
}

const aleatorio = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

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
      parse: (d) => (d.success ? { pais: d.country, ciudad: d.city } : null),
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (d) => (d.country_name ? { pais: d.country_name, ciudad: d.city } : null),
    },
    {
      url: 'https://get.geojs.io/v1/ip/geo.json',
      parse: (d) => (d.country ? { pais: d.country, ciudad: d.city } : null),
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
          pais:   info.pais || 'Desconocido',
          ciudad: info.ciudad || 'Desconocida',
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
export async function registrarVisita(ruta = '/', usuario = null) {
  try {
    const segmento = ruta.split('/').filter(Boolean)[0] || 'home';

    // 1 visita por ruta por sesión (no duplicar refrescos)
    const clave = `visita_${segmento}`;
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, '1');

    const { id: sesionId, esNueva } = obtenerSesionId();

    const { pais, ciudad } = await obtenerUbicacion();

    const visitaDoc = {
      fecha: serverTimestamp(),
      dia:   new Date().toISOString().slice(0, 10),
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
    };

    await addDoc(collection(db, COLECCION), visitaDoc);
  } catch (e) {
    console.warn('No se pudo registrar visita:', e?.message);
  }
}

/** Obtener las últimas N entradas al sitio (no cada página que recorren) para la lista del admin */
export async function obtenerVisitasRecientes(n = 10, proximamente = false) {
  try {
    // Traemos más para luego filtrar al admin y quedarnos solo con entradas, sin perder cantidad
    const snap = await getDocs(
      query(collection(db, COLECCION), orderBy('fecha', 'desc'), limit(Math.max(n * 6, 120)))
    );
    const visitas = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((v) => !esDueno(v.email));
    // Páginas que vio en esa misma visita, en orden (llegan de la más nueva a la más vieja)
    const recorridos = {};
    visitas.forEach((v) => {
      if (v.sesionId) (recorridos[v.sesionId] = recorridos[v.sesionId] || []).unshift(v.ruta);
    });
    return visitas
      .filter((v) => v.entrada && esProximamente(v) === proximamente)
      .slice(0, n)
      .map((v) => ({ ...v, recorrido: recorridos[v.sesionId] || [v.ruta] }));
  } catch (e) {
    console.error('Error obteniendo visitas recientes:', e);
    return [];
  }
}

const SIN_VISITAS = { total: 0, logueados: 0, visitasHoy: 0, visitantesUnicos: 0, porRuta: {}, porDia: {}, porPais: {}, porDispositivo: {} };

// Cuenta entradas reales y personas distintas (no cada página que recorren)
function resumir(visitas) {
  const porRuta = {};
  const personasPorPais = {};
  const personasPorDispositivo = {};
  const visitantesUnicos = new Set();
  const sesionesPorDia = {}; // dia -> Set(sesionId): cuenta accesos reales, no cada página vista
  const sesionesTotal = new Set();
  const identificados = new Set();

  const hoy = new Date().toISOString().slice(0, 10);

  visitas.forEach((v) => {
    porRuta[v.ruta]  = (porRuta[v.ruta]  || 0) + 1;

    if (v.email) identificados.add(v.email);

    // Sesión = 1 entrada real al sitio. Las visitas viejas (sin sesionId) se agrupan
    // por persona+día como aproximación, para no contar cada página que recorrieron.
    // Persona: su correo, o el número de su navegador; las visitas viejas (sin ese
    // número) se aproximan por país, ciudad, dispositivo y navegador
    const identidad = v.email || (v.sesionId?.includes('.') ? v.sesionId.split('.')[0] : `${v.pais}|${v.ciudad}|${v.dispositivo}|${v.navegador}`);
    (personasPorPais[v.pais || 'Desconocido'] ||= new Set()).add(identidad);
    (personasPorDispositivo[v.dispositivo || 'Otro'] ||= new Set()).add(identidad);
    const sid = v.sesionId || `${v.dia}_${identidad}`;
    sesionesTotal.add(sid);
    if (!sesionesPorDia[v.dia]) sesionesPorDia[v.dia] = new Set();
    sesionesPorDia[v.dia].add(sid);

    visitantesUnicos.add(identidad);
  });

  const porDia = {};
  Object.entries(sesionesPorDia).forEach(([dia, set]) => { porDia[dia] = set.size; });

  return {
    total: sesionesTotal.size,
    logueados: identificados.size,
    visitasHoy: sesionesPorDia[hoy] ? sesionesPorDia[hoy].size : 0,
    visitantesUnicos: visitantesUnicos.size,
    porRuta,
    porDia,
    porPais: Object.fromEntries(Object.entries(personasPorPais).map(([k, s]) => [k, s.size])),
    porDispositivo: Object.fromEntries(Object.entries(personasPorDispositivo).map(([k, s]) => [k, s.size])),
  };
}

/** Obtener estadísticas agregadas (para gráficos) — excluye al admin.
 *  Las de la tienda van arriba y las de "Próximamente" en `proximamente`. */
export async function obtenerEstadisticas(diasAtras = 30) {
  try {
    const snap = await getDocs(
      query(collection(db, COLECCION), orderBy('fecha', 'desc'), limit(2000))
    );

    const limite = new Date();
    limite.setDate(limite.getDate() - diasAtras);
    const limiteStr = limite.toISOString().slice(0, 10);

    const visitas = snap.docs
      .map((d) => d.data())
      .filter((v) => (v.dia || '') >= limiteStr)
      .filter((v) => !esDueno(v.email)); // excluir al dueño

    return {
      ...resumir(visitas.filter((v) => !esProximamente(v))),
      proximamente: resumir(visitas.filter(esProximamente)),
    };
  } catch (e) {
    console.error('Error obteniendo estadísticas:', e);
    return { ...SIN_VISITAS, proximamente: SIN_VISITAS };
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
