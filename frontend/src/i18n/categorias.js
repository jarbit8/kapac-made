// Categorías del catálogo. Se guardan en inglés (key) y se muestran según idioma.
export const CATEGORIAS = [
  { key: 'Mountaineering', es: 'Alpinismo' },
  { key: 'Trekking',       es: 'Trekking' },
  { key: 'Climbing',       es: 'Climbing' },
];

// Devuelve el nombre de la categoría en el idioma pedido.
export function categoriaLabel(cat, idioma = 'es') {
  const c = CATEGORIAS.find((x) => x.key === cat || x.es === cat);
  if (!c) return cat || '';
  return idioma === 'en' ? c.key : c.es;
}
