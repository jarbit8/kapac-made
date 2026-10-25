const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/kapac-made.firebasestorage.app/o/';
const BUCKET = 'https://storage.googleapis.com/kapac-made.firebasestorage.app/';

// El mapa de copias se lee al cargar el módulo: cada prueba lo carga con el suyo
function cargar(copias) {
  jest.resetModules();
  if (copias) window.__FOTOS__ = copias; else delete window.__FOTOS__;
  return require('./fotos').fotoRapida;
}

afterEach(() => { delete window.__FOTOS__; });

describe('fotoRapida', () => {
  test('una foto con copia en la página sale de la copia', () => {
    const fotoRapida = cargar({ 'home/123-abc.webp': '/f/home-123-abc.webp' });
    expect(fotoRapida(`${STORAGE}home%2F123-abc.webp?alt=media&token=xyz`)).toBe('/f/home-123-abc.webp');
  });

  test('una foto nueva, sin copia, sale directo de Cloud Storage', () => {
    const fotoRapida = cargar({});
    expect(fotoRapida(`${STORAGE}productos%2F999-zzz.webp?alt=media&token=xyz`)).toBe(`${BUCKET}productos/999-zzz.webp`);
  });

  test('sin mapa de copias también sale de Cloud Storage', () => {
    const fotoRapida = cargar(null);
    expect(fotoRapida(`${STORAGE}home%2Ffoto.webp?alt=media`)).toBe(`${BUCKET}home/foto.webp`);
  });

  test('los espacios de la ruta se codifican', () => {
    const fotoRapida = cargar({});
    expect(fotoRapida(`${STORAGE}home%2Fmi%20foto.webp?alt=media`)).toBe(`${BUCKET}home/mi%20foto.webp`);
  });

  test('lo que no es de Firebase Storage no se toca', () => {
    const fotoRapida = cargar({});
    ['https://images.unsplash.com/photo-1.jpg', '/assets/logo.png', 'data:image/png;base64,AAA'].forEach((u) => {
      expect(fotoRapida(u)).toBe(u);
    });
  });

  test('valores que no son texto se devuelven igual', () => {
    const fotoRapida = cargar({});
    expect(fotoRapida('')).toBe('');
    expect(fotoRapida(null)).toBeNull();
    expect(fotoRapida(undefined)).toBeUndefined();
    const objeto = { url: 'x' };
    expect(fotoRapida(objeto)).toBe(objeto);
  });

  test('una URL de Storage sin ruta se deja como está', () => {
    const fotoRapida = cargar({});
    const sinRuta = 'https://firebasestorage.googleapis.com/v0/b/kapac-made.firebasestorage.app';
    expect(fotoRapida(sinRuta)).toBe(sinRuta);
  });
});
