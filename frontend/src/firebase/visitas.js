// Registro de visitas — legal en Perú (Ley 29733), sin cookies
// - Si el visitante está logueado: guardamos su email
// - Si no: queda como "Desconocido"
// - Ubicación: obtenida vía ipwho.is (NO guardamos IP cruda, solo país/ciudad)
// - Navegador/dispositivo: obtenido del userAgent (info pública)
import {
  collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { esCorreoAdmin } from '../config/admins';

const COLECCION = 'visitas';

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

// Id de sesión: 1 por pestaña/sesión de navegador. Sirve para saber cuántas
// veces entraron realmente al sitio, sin que cada página que recorren cuente aparte.
// esNueva = true solo la primera vez (recién entró), false en el resto de páginas que recorra.
function obtenerSesionId() {
  let id = sessionStorage.getItem('kapac_sesion_id');
  if (id) return { id, esNueva: false };
  id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
export async function obtenerVisitasRecientes(n = 10) {
  try {
    // Traemos más para luego filtrar al admin y quedarnos solo con entradas, sin perder cantidad
    const snap = await getDocs(
      query(collection(db, COLECCION), orderBy('fecha', 'desc'), limit(Math.max(n * 6, 120)))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((v) => !esCorreoAdmin(v.email))
      .filter((v) => v.entrada)
      .slice(0, n);
  } catch (e) {
    console.error('Error obteniendo visitas recientes:', e);
    return [];
  }
}

/** Obtener estadísticas agregadas (para gráficos) — excluye al admin */
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
      .filter((v) => !esCorreoAdmin(v.email)); // excluir admin

    const porRuta = {};
    const porPais = {};
    const porDispositivo = {};
    const visitantesUnicos = new Set();
    const sesionesPorDia = {}; // dia -> Set(sesionId): cuenta accesos reales, no cada página vista
    const sesionesTotal = new Set();
    let logueados = 0;

    const hoy = new Date().toISOString().slice(0, 10);

    visitas.forEach((v) => {
      porRuta[v.ruta]  = (porRuta[v.ruta]  || 0) + 1;
      porPais[v.pais || 'Desconocido'] = (porPais[v.pais || 'Desconocido'] || 0) + 1;
      porDispositivo[v.dispositivo || 'Otro'] = (porDispositivo[v.dispositivo || 'Otro'] || 0) + 1;
      if (v.email) logueados++;

      // Sesión = 1 entrada real al sitio. Las visitas viejas (sin sesionId) se agrupan
      // por persona+día como aproximación, para no contar cada página que recorrieron.
      const identidad = v.email || `${v.pais}|${v.ciudad}|${v.dispositivo}|${v.navegador}`;
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
      logueados,
      visitasHoy: sesionesPorDia[hoy] ? sesionesPorDia[hoy].size : 0,
      visitantesUnicos: visitantesUnicos.size,
      porRuta,
      porDia,
      porPais,
      porDispositivo,
    };
  } catch (e) {
    console.error('Error obteniendo estadísticas:', e);
    return { total: 0, logueados: 0, visitasHoy: 0, visitantesUnicos: 0, porRuta: {}, porDia: {}, porPais: {}, porDispositivo: {} };
  }
}

/** Mapa de ruta → nombre legible para mostrar al admin */
export function nombreRuta(ruta) {
  const mapa = {
    'home':         'Inicio',
    'catalogo':     'Catálogo',
    'b2b':          'B2B (empresas)',
    'alma':         'Kapac Made (historia)',
    'contacto':     'Contacto',
    'legal':        'Información legal',
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
