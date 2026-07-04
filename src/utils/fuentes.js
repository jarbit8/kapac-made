// Fuentes dinámicas: el admin escribe el nombre de la que quiera.
// Si no está instalada, se intenta cargar de Google Fonts (una vez por nombre);
// si tampoco existe ahí, el navegador cae al fallback del stack.
const cargadas = new Set();

export function asegurarFuente(nombre) {
  const n = (nombre || '').trim();
  if (!n || n.includes(',') || cargadas.has(n.toLowerCase())) return;
  cargadas.add(n.toLowerCase());
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(n).replace(/%20/g, '+') +
    ':ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap';
  document.head.appendChild(link);
}

// Convierte el nombre escrito en un valor válido de font-family.
export function cssFuente(nombre) {
  const n = (nombre || '').trim();
  if (!n) return '';
  if (n.includes(',')) return n; // ya es un stack completo (valores guardados antes)
  return `'${n.replace(/['"]/g, '')}', sans-serif`;
}

// Nombre "limpio" para mostrar en el campo de fuente.
export function nombreFuente(valor) {
  const n = (valor || '').split(',')[0].replace(/['"]/g, '').trim();
  return n;
}
