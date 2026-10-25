// Contenido editable del sitio (fotos, bloques y tema).
// Vive en un único doc: contenido/sitio. Si no existe, se usan los defaults.
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

const REF = () => doc(db, 'contenido', 'sitio');

// Claves de las fotos de "estilo de vida" del home (el texto y la imagen viven en
// contenido/textos vía Editable/EditableImage, editable directo en la página).
const HOME_FOTOS_DEFAULT = ['foto1', 'foto2', 'foto3', 'foto4'];

// Fondo del footer: imagen (default = la montaña) o video.
const FOOTER_FONDO_DEFAULT = {
  tipo: 'imagen',
  url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600&q=80&auto=format&fit=crop',
};

// Galería de fotos al final de la página Kapac Made (Alma).
const ALMA_FOTOS_DEFAULT = [];

// Foto épica que abre "in the zone" en una pestaña nueva.
export const IN_THE_ZONE_DEFAULT =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop';

// Claves de las tarjetas de "beneficios" en B2B (el texto vive en contenido/textos vía Editable).
const B2B_BENEFICIOS_DEFAULT = ['beneficio1', 'beneficio2', 'beneficio3', 'beneficio4'];

// Claves de los bloques de filosofía en Kapac Made / Alma (texto vía Editable).
const ALMA_BLOQUES_DEFAULT = ['bloque1', 'bloque2', 'bloque3'];

// Claves de "Info" adicional al final de Contacto (bloques extra que agregue el admin).
const INFO_EXTRA_DEFAULT = [];

// Identidad visual editable por el admin.
export const ACENTO_DEFAULT = '#b0532e'; // terracota de la marca
export const LOGO_DEFAULT = '';          // '' = usa el logo del proyecto
export const FONDO_DEFAULT = '#ffffff';  // fondo del sitio
export const TEXTO_DEFAULT = '#111111';  // color del texto principal

// Medio principal (Hero) por dispositivo: { tipo:'imagen'|'video', url }.
// null = usa los videos por defecto del proyecto.
const HERO_VIDEO_DEFAULT = { pc: null, mobile: null };

// Clave de una foto de la lista: las nuevas ya son una clave; las viejas ({url, ...}) usan su posición
export const claveFoto = (foto, i) => ((typeof foto === 'object' && foto !== null) ? `legacy${i}` : foto);

// Normaliza: acepta string (formato viejo = video) u objeto { tipo, url }.
export function normalizarMedio(v) {
  if (!v) return null;
  if (typeof v === 'string') return { tipo: 'video', url: v };
  return v.url ? v : null;
}

// Devuelve el medio { tipo, url } para el dispositivo.
// Soporta: formato viejo único ({tipo,url} o string) y nuevo ({ pc, mobile }).
export function medioDispositivo(cfg, esMobile) {
  if (!cfg) return null;
  if (typeof cfg === 'string') return normalizarMedio(cfg);
  // Slots pc/mobile tienen prioridad sobre url directo (formato viejo, puede quedar pegado por el merge)
  if (cfg.pc || cfg.mobile) {
    const pick = esMobile ? (cfg.mobile || cfg.pc) : (cfg.pc || cfg.mobile);
    return normalizarMedio(pick);
  }
  if (cfg.url) return normalizarMedio(cfg);
  return null;
}

// Igual pero solo devuelve la URL (para cosas que siempre son imagen, como "in the zone").
export const urlDispositivo = (cfg, esMobile) => medioDispositivo(cfg, esMobile)?.url || '';

// Lee el slot pc|mobile para el panel admin (maneja formatos viejos).
export function slotMedio(cfg, slot) {
  if (!cfg) return null;
  if (typeof cfg === 'string') return slot === 'pc' ? { tipo: 'imagen', url: cfg } : null;
  if (cfg.pc || cfg.mobile) return normalizarMedio(cfg[slot]);
  if (cfg.url) return slot === 'pc' ? normalizarMedio(cfg) : null;
  return null;
}

function completar(data) {
  return {
    homeFotos: Array.isArray(data.homeFotos) && data.homeFotos.length ? data.homeFotos : HOME_FOTOS_DEFAULT,
    footerFondo: (data.footerFondo?.pc || data.footerFondo?.mobile || data.footerFondo?.url) ? data.footerFondo : FOOTER_FONDO_DEFAULT,
    inTheZoneFoto: data.inTheZoneFoto || IN_THE_ZONE_DEFAULT,
    almaFotos: Array.isArray(data.almaFotos) ? data.almaFotos : ALMA_FOTOS_DEFAULT,
    heroVideo: data.heroVideo || HERO_VIDEO_DEFAULT,
    acento: data.acento || ACENTO_DEFAULT,
    logo: data.logo || LOGO_DEFAULT,
    fondo: data.fondo || FONDO_DEFAULT,
    b2bBeneficios: Array.isArray(data.b2bBeneficios) && data.b2bBeneficios.length ? data.b2bBeneficios : B2B_BENEFICIOS_DEFAULT,
    almaBloques: Array.isArray(data.almaBloques) && data.almaBloques.length ? data.almaBloques : ALMA_BLOQUES_DEFAULT,
    infoExtra: Array.isArray(data.infoExtra) ? data.infoExtra : INFO_EXTRA_DEFAULT,
    cerrado: data.cerrado === true, // tienda cerrada al público (pantalla "Próximamente")
  };
}

// Lo último que llegó de Firestore (en esta sesión o en la visita anterior) o, en la
// primera visita, lo que había al publicar (scripts/fotos.js): la página se pinta al
// instante con eso y se actualiza cuando responde Firestore.
const CACHE_KEY = 'kapac_contenido_v1';
let contenidoSesion = (() => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c) return c;
  } catch (_) {}
  return window.__CONTENIDO__?.sitio ? completar(window.__CONTENIDO__.sitio) : null;
})();
export const contenidoGuardado = () => contenidoSesion;

function recordar(c) {
  contenidoSesion = c;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (_) {}
}

// Si Firestore no responde, falla: cada página se queda como estaba en vez de
// mostrar fotos de fábrica o abrir la tienda cerrada.
export async function obtenerContenido() {
  const snap = await getDoc(REF());
  recordar(completar(snap.exists() ? snap.data() : {}));
  return contenidoSesion;
}

// Solo escribe los campos que cambiaron respecto de "anterior": una página abierta
// hace rato no debe pisar con su copia vieja lo que se cambió desde otra.
// updateDoc reemplaza cada campo entero, así no quedan claves viejas pegadas.
export async function guardarContenido(nuevo, anterior = {}) {
  const cambios = {};
  Object.keys(nuevo).forEach((k) => {
    if (JSON.stringify(nuevo[k]) !== JSON.stringify(anterior[k])) cambios[k] = nuevo[k];
  });
  if (!Object.keys(cambios).length) return;
  await updateDoc(REF(), cambios);
  recordar({ ...(contenidoSesion || nuevo), ...cambios });
}

// Cambia campos sobre lo último de Firestore y no sobre la copia de la página
export async function cambiarContenido(cambiar) {
  const base = await obtenerContenido();
  await guardarContenido({ ...base, ...cambiar(base) }, base);
  return contenidoSesion;
}
