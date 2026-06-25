// Categorías del catálogo. Se guardan en inglés (key) y se muestran según idioma.
export const CATEGORIAS = [
  { key: 'Climbing',       es: 'Escalada' },
  { key: 'Mountaineering', es: 'Montañismo' },
  { key: 'Trekking',       es: 'Senderismo' },
  { key: 'Daypack',        es: 'Mochila de día' },
];

// Devuelve el nombre de la categoría en el idioma pedido.
export function categoriaLabel(cat, idioma = 'es') {
  const c = CATEGORIAS.find((x) => x.key === cat || x.es === cat);
  if (!c) return cat || '';
  return idioma === 'en' ? c.key : c.es;
}
