// Helpers para mostrar nombre/descripción de producto según idioma.
// Si la versión en inglés existe → la usa. Si no → fallback al español.

export function nombreProducto(producto, idioma = 'es') {
  if (!producto) return '';
  if (idioma === 'en' && producto.nombreEn && producto.nombreEn.trim()) {
    return producto.nombreEn;
  }
  return producto.nombre || '';
}

export function descripcionProducto(producto, idioma = 'es') {
  if (!producto) return '';
  if (idioma === 'en' && producto.descripcionEn && producto.descripcionEn.trim()) {
    return producto.descripcionEn;
  }
  return producto.descripcion || '';
}
