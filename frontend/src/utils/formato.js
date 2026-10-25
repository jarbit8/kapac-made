// Formatos que se repiten en varias pantallas

export const localeDe = (idioma) => (idioma === 'en' ? 'en-US' : 'es-PE');

// Los precios son enteros: S/90.00
export const soles = (valor, moneda) => `${moneda || 'S/'}${valor}.00`;

// Número corto con el que se nombra un pedido
export const numeroPedido = (id) => id.slice(0, 8).toUpperCase();

export function fechaHora(fecha, idioma = 'es', mes = 'long') {
  return fecha.toLocaleDateString(localeDe(idioma), {
    day: '2-digit', month: mes, year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Fecha de un documento de Firestore en el panel de administración
export const fechaPanel = (ts) => (ts?.toDate ? fechaHora(ts.toDate(), 'es', 'short') : 'Recién creado');

// Texto de un formulario: sin espacios de más
export const limpiar = (v) => v.trim().replace(/\s+/g, ' ');

export const letras = (v) => (v.match(/\p{L}/gu) || []).length;
