import { CATEGORIAS, categoriaLabel } from './categorias';

describe('categoriaLabel', () => {
  test('la clave en inglés se muestra en el idioma pedido', () => {
    expect(categoriaLabel('Mountaineering', 'es')).toBe('Alpinismo');
    expect(categoriaLabel('Mountaineering', 'en')).toBe('Mountaineering');
    expect(categoriaLabel('Climbing', 'es')).toBe('Climbing');
    expect(categoriaLabel('Trekking', 'en')).toBe('Trekking');
  });

  test('también entiende el nombre en español', () => {
    expect(categoriaLabel('Alpinismo', 'en')).toBe('Mountaineering');
    expect(categoriaLabel('Alpinismo', 'es')).toBe('Alpinismo');
  });

  test('el idioma por defecto es el español', () => {
    expect(categoriaLabel('Mountaineering')).toBe('Alpinismo');
  });

  test('una categoría desconocida se devuelve tal cual', () => {
    expect(categoriaLabel('Surf', 'es')).toBe('Surf');
    expect(categoriaLabel('Daypack', 'es')).toBe('Daypack');
    expect(categoriaLabel('Senderismo', 'en')).toBe('Senderismo');
  });

  test('sin categoría da texto vacío', () => {
    expect(categoriaLabel('', 'es')).toBe('');
    expect(categoriaLabel(null, 'en')).toBe('');
    expect(categoriaLabel(undefined)).toBe('');
  });

  test('las tres categorías de la tienda no se repiten', () => {
    expect(CATEGORIAS.map((c) => c.key)).toEqual(['Mountaineering', 'Trekking', 'Climbing']);
    expect(CATEGORIAS.map((c) => c.es)).toEqual(['Alpinismo', 'Trekking', 'Climbing']);
    expect(new Set(CATEGORIAS.map((c) => c.es)).size).toBe(3);
  });
});
