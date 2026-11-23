import { nombreRuta } from './visitas';

jest.mock('./config', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), addDoc: jest.fn(), getDocs: jest.fn(), query: jest.fn(),
  orderBy: jest.fn(), limit: jest.fn(), serverTimestamp: jest.fn(),
}));

test('cada ruta del sitio tiene su nombre en el panel', () => {
  const rutas = ['home', 'proximamente', 'shop', 'kapac-made', 'info', 'zone', 'b2b', 'legal', 'libro-reclamaciones',
    'producto', 'carrito', 'checkout', 'metodo-pago', 'pago', 'confirmacion', 'perfil', 'pedidos', 'login', 'admin'];
  rutas.forEach((r) => {
    const n = nombreRuta(r);
    expect(n).toBeTruthy();
    expect(n[0]).toBe(n[0].toUpperCase());
  });
  expect(nombreRuta('proximamente')).toContain('Próximamente');
});

test('rutas desconocidas se capitalizan y la vacía es Inicio', () => {
  expect(nombreRuta('rara')).toBe('Rara');
  expect(nombreRuta('')).toBe('Inicio');
  expect(nombreRuta(undefined)).toBe('Inicio');
});
