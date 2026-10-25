import { nombreProducto, descripcionProducto } from './producto';

const p = { nombre: 'Mochila Andina', nombreEn: 'Andean Backpack', descripcion: 'Hecha a mano', descripcionEn: 'Handmade' };

describe('nombreProducto', () => {
  test('en cada idioma', () => {
    expect(nombreProducto(p, 'es')).toBe('Mochila Andina');
    expect(nombreProducto(p, 'en')).toBe('Andean Backpack');
    expect(nombreProducto(p)).toBe('Mochila Andina');
  });

  test('sin versión en inglés (o en blanco) usa el español', () => {
    expect(nombreProducto({ nombre: 'Mochila' }, 'en')).toBe('Mochila');
    expect(nombreProducto({ nombre: 'Mochila', nombreEn: '' }, 'en')).toBe('Mochila');
    expect(nombreProducto({ nombre: 'Mochila', nombreEn: '   ' }, 'en')).toBe('Mochila');
  });

  test('sin producto o sin nombre da texto vacío', () => {
    expect(nombreProducto(null, 'en')).toBe('');
    expect(nombreProducto(undefined)).toBe('');
    expect(nombreProducto({}, 'es')).toBe('');
  });
});

describe('descripcionProducto', () => {
  test('en cada idioma', () => {
    expect(descripcionProducto(p, 'es')).toBe('Hecha a mano');
    expect(descripcionProducto(p, 'en')).toBe('Handmade');
  });

  test('sin versión en inglés usa el español', () => {
    expect(descripcionProducto({ descripcion: 'Hecha a mano', descripcionEn: ' ' }, 'en')).toBe('Hecha a mano');
    expect(descripcionProducto({ descripcion: 'Hecha a mano' }, 'en')).toBe('Hecha a mano');
  });

  test('sin producto da texto vacío', () => {
    expect(descripcionProducto(null, 'en')).toBe('');
    expect(descripcionProducto({}, 'es')).toBe('');
  });
});
