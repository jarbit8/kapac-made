import { cssFuente } from '../../utils/fuentes';

// Dónde aplica cada zona de estilo del producto (definidas al crear/editar en el admin).
// Selectores con 2+ clases para ganarles a las reglas !important del CSS base.
const SELECTOR_ZONA = {
  nombre: '.producto-page .producto-info h1',
  precio: '.producto-page .producto-precio, .producto-page .producto-precio-original',
  descripcion: '.producto-page .producto-descripcion',
  features: '.producto-page .producto-feature strong, .producto-page .producto-feature span',
  specs: '.producto-page .producto-tabla td, .producto-page .producto-tabla td:first-child',
  stock: '.producto-page .producto-stock, .producto-page .producto-stock.stock-bajo',
};

export function cssEstilosProducto(estilos) {
  return Object.entries(estilos || {})
    .map(([zona, e]) => {
      const sel = SELECTOR_ZONA[zona];
      if (!sel || (!e?.color && !e?.fuente)) return '';
      const reglas = [
        e.color ? `color: ${e.color} !important;` : '',
        e.fuente ? `font-family: ${cssFuente(e.fuente)} !important;` : '',
      ].filter(Boolean).join(' ');
      return `${sel} { ${reglas} }`;
    })
    .filter(Boolean)
    .join('\n');
}

export function textoStock(producto, t, idioma) {
  if (!producto) return '';
  if (producto.stock <= 0) return `${t('productos.sin_stock')}`;
  if (producto.stock <= 3) {
    return producto.stock === 1
      ? (idioma === 'en' ? 'Last one left!' : '¡Última unidad!')
      : (idioma === 'en' ? `Only ${producto.stock} left!` : `¡Últimas ${producto.stock} unidades!`);
  }
  return idioma === 'en'
    ? `In stock — ${producto.stock} available`
    : `Disponible — ${producto.stock} en stock`;
}
