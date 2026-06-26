// Contenido editable del sitio (fotos de la home y galería de producto).
// Vive en un único doc: contenido/sitio. Si no existe, se usan los defaults.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const REF = () => doc(db, 'contenido', 'sitio');

// Defaults = lo que estaba hardcodeado, para que el sitio se vea bien sin tocar nada.
export const HOME_FOTOS_DEFAULT = [
  { url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&q=80&fit=crop', titulo: 'Explorar',   desc: 'Desde la ciudad hasta los 5,000 metros.\nDiseñada para no detenerte.' },
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80&fit=crop', titulo: 'Los Andes',  desc: 'Arequipa, Perú.' },
  { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80&fit=crop', titulo: 'Naturaleza', desc: 'Cada diseño nace de un paisaje real.\nNinguna mochila es igual a otra.' },
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80&fit=crop', titulo: 'Artesanía',  desc: 'Hecho a mano, uno a uno.' },
];

export const GALERIA_PRODUCTO_DEFAULT = [
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=900&q=80&auto=format&fit=crop',
];

// Fondo del footer: imagen (default = la montaña) o video.
export const FOOTER_FONDO_DEFAULT = {
  tipo: 'imagen',
  url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600&q=80&auto=format&fit=crop',
};

// Foto épica que abre "in the zone" en una pestaña nueva.
export const IN_THE_ZONE_DEFAULT =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop';

// Identidad visual editable por el admin.
export const ACENTO_DEFAULT = '#b0532e'; // terracota de la marca
export const LOGO_DEFAULT = '';          // '' = usa el logo del proyecto
export const FONDO_DEFAULT = '#ffffff';  // fondo del sitio
export const TEXTO_DEFAULT = '#111111';  // color del texto principal

// Medio principal (Hero) por dispositivo: { tipo:'imagen'|'video', url }.
// null = usa los videos por defecto del proyecto.
export const HERO_VIDEO_DEFAULT = { pc: null, mobile: null };

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
  if (typeof cfg === 'string' || cfg.url) return normalizarMedio(cfg);
  const pick = esMobile ? (cfg.mobile || cfg.pc) : (cfg.pc || cfg.mobile);
  return normalizarMedio(pick);
}

// Igual pero solo devuelve la URL (para cosas que siempre son imagen, como "in the zone").
export function urlDispositivo(cfg, esMobile) {
  if (!cfg) return '';
  if (typeof cfg === 'string') return cfg;
  // Si tiene slots pc/mobile, los usa con preferencia sobre url directo (formato viejo)
  if (cfg.pc || cfg.mobile) {
    const pick = esMobile ? (cfg.mobile || cfg.pc) : (cfg.pc || cfg.mobile);
    return typeof pick === 'string' ? pick : (pick?.url || '');
  }
  if (cfg.url) return cfg.url;
  return '';
}

// Lee el slot pc|mobile para el panel admin (maneja formatos viejos).
export function slotMedio(cfg, slot) {
  if (!cfg) return null;
  if (typeof cfg === 'string') return slot === 'pc' ? { tipo: 'imagen', url: cfg } : null;
  if (cfg.url) return slot === 'pc' ? normalizarMedio(cfg) : null;
  return normalizarMedio(cfg[slot]);
}

export async function obtenerContenido() {
  try {
    const snap = await getDoc(REF());
    const data = snap.exists() ? snap.data() : {};
    return {
      homeFotos: Array.isArray(data.homeFotos) && data.homeFotos.length ? data.homeFotos : HOME_FOTOS_DEFAULT,
      galeriaProducto: Array.isArray(data.galeriaProducto) && data.galeriaProducto.length ? data.galeriaProducto : GALERIA_PRODUCTO_DEFAULT,
      footerFondo: data.footerFondo?.url ? data.footerFondo : FOOTER_FONDO_DEFAULT,
      inTheZoneFoto: data.inTheZoneFoto || IN_THE_ZONE_DEFAULT,
      heroVideo: data.heroVideo || HERO_VIDEO_DEFAULT,
      acento: data.acento || ACENTO_DEFAULT,
      logo: data.logo || LOGO_DEFAULT,
      fondo: data.fondo || FONDO_DEFAULT,
      texto: data.texto || TEXTO_DEFAULT,
    };
  } catch (e) {
    return { homeFotos: HOME_FOTOS_DEFAULT, galeriaProducto: GALERIA_PRODUCTO_DEFAULT, footerFondo: FOOTER_FONDO_DEFAULT, inTheZoneFoto: IN_THE_ZONE_DEFAULT, heroVideo: HERO_VIDEO_DEFAULT, acento: ACENTO_DEFAULT, logo: LOGO_DEFAULT, fondo: FONDO_DEFAULT, texto: TEXTO_DEFAULT };
  }
}

export async function guardarContenido(datos) {
  await setDoc(REF(), datos, { merge: true });
}
