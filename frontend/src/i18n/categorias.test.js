import { CATEGORIAS, categoriaLabel } from './categorias';

describe('categoriaLabel', () => {
  test('la clave en inglés se muestra en el idioma pedido', () => {
    expect(categoriaLabel('Climbing', 'es')).toBe('Escalada');
    expect(categoriaLabel('Climbing', 'en')).toBe('Climbing');
    expect(categoriaLabel('Daypack', 'es')).toBe('Mochila de día');
  });

  test('también entiende el nombre en español', () => {
    expect(categoriaLabel('Senderismo', 'en')).toBe('Trekking');
    expect(categoriaLabel('Montañismo', 'es')).toBe('Montañismo');
  });

  test('el idioma por defecto es el español', () => {
    expect(categoriaLabel('Trekking')).toBe('Senderismo');
  });

  test('una categoría desconocida se devuelve tal cual', () => {
    expect(categoriaLabel('Surf', 'es')).toBe('Surf');
  });

  test('sin categoría da texto vacío', () => {
    expect(categoriaLabel('', 'es')).toBe('');
    expect(categoriaLabel(null, 'en')).toBe('');
    expect(categoriaLabel(undefined)).toBe('');
  });

  test('las cuatro categorías de la tienda no se repiten', () => {
    expect(CATEGORIAS.map((c) => c.key)).toEqual(['Climbing', 'Mountaineering', 'Trekking', 'Daypack']);
    expect(new Set(CATEGORIAS.map((c) => c.es)).size).toBe(4);
  });
});
