import fs from 'fs';
import path from 'path';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { borrarMedia, subirImagen, subirMedia } from './almacenamiento';

jest.mock('./config', () => ({ storage: { nombre: 'storage' } }));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn(), deleteObject: jest.fn(),
}));

const MB = 1024 * 1024;
const REGLAS = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'storage.rules'), 'utf8');

// Un archivo con el tamaño que se diga, sin gastar memoria
function archivo(nombre, tipo, tamano = 1000) {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: tamano });
  return f;
}

beforeEach(() => {
  ref.mockImplementation((storage, ruta) => ({ ruta }));
  uploadBytes.mockResolvedValue({});
  getDownloadURL.mockImplementation(async (r) => `https://cdn.ejemplo/${r.ruta}`);
  deleteObject.mockResolvedValue();
});
afterEach(() => { delete global.createImageBitmap; });

describe('borrarMedia', () => {
  const url = 'https://firebasestorage.googleapis.com/v0/b/kapac-made.appspot.com/o/productos%2F1700-ab12.webp?alt=media&token=t0k3n';

  test('borra el archivo de Storage a partir de su URL de descarga (ruta decodificada)', async () => {
    await borrarMedia(url);
    expect(ref).toHaveBeenCalledWith({ nombre: 'storage' }, 'productos/1700-ab12.webp');
    expect(deleteObject).toHaveBeenCalledWith({ ruta: 'productos/1700-ab12.webp' });
  });

  test('una URL externa (Unsplash, otro sitio) o vacía no toca Storage', async () => {
    await borrarMedia('https://images.unsplash.com/photo-1.jpg');
    await borrarMedia('');
    await borrarMedia(null);
    await borrarMedia(undefined);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  test('una URL de Storage sin ruta no borra nada', async () => {
    await borrarMedia('https://firebasestorage.googleapis.com/v0/b/kapac-made.appspot.com');
    expect(deleteObject).not.toHaveBeenCalled();
  });

  test('si el borrado falla (ya no existe, sin permiso) no lanza: no debe frenar el guardado del admin', async () => {
    deleteObject.mockRejectedValue(new Error('object-not-found'));
    await expect(borrarMedia(url)).resolves.toBeUndefined();
  });
});

describe('subirImagen: validaciones', () => {
  test('sin archivo lanza error', async () => {
    await expect(subirImagen(null)).rejects.toThrow('Sin archivo');
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  test('solo imágenes: un video, un PDF o un archivo sin tipo se rechazan', async () => {
    for (const tipo of ['video/mp4', 'application/pdf', 'text/html', '']) {
      await expect(subirImagen(archivo('a.bin', tipo))).rejects.toThrow('El archivo debe ser una imagen');
    }
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  test('más de 20 MB se rechaza; justo 20 MB pasa', async () => {
    await expect(subirImagen(archivo('a.gif', 'image/gif', 20 * MB + 1))).rejects.toThrow('20 MB');
    expect(uploadBytes).not.toHaveBeenCalled();
    await expect(subirImagen(archivo('a.gif', 'image/gif', 20 * MB))).resolves.toBeTruthy();
  });
});

describe('subirImagen: subida', () => {
  test('sube a <carpeta>/<fecha>-<azar>.<extensión en minúsculas> y devuelve la URL pública', async () => {
    const url = await subirImagen(archivo('FOTO.PNG', 'image/gif'), 'home');
    const ruta = ref.mock.calls[0][1];
    expect(ruta).toMatch(/^home\/\d+-[a-z0-9]{1,6}\.png$/);
    expect(url).toBe(`https://cdn.ejemplo/${ruta}`);
  });

  test('sin carpeta usa "varios"; dos subidas seguidas no chocan de nombre', async () => {
    await subirImagen(archivo('a.gif', 'image/gif'));
    await subirImagen(archivo('a.gif', 'image/gif'));
    const [r1, r2] = ref.mock.calls.map((c) => c[1]);
    expect(r1.startsWith('varios/')).toBe(true);
    expect(r1).not.toBe(r2);
  });

  test('sube con caché de un año e inmutable y el tipo del archivo', async () => {
    const f = archivo('a.gif', 'image/gif');
    await subirImagen(f, 'galeria');
    const [, subido, metadatos] = uploadBytes.mock.calls[0];
    expect(subido).toBe(f);
    expect(metadatos).toEqual({ contentType: 'image/gif', cacheControl: 'public, max-age=31536000, immutable' });
  });

  test('si Storage rechaza la subida el error llega a quien llama', async () => {
    uploadBytes.mockRejectedValue(new Error('unauthorized'));
    await expect(subirImagen(archivo('a.gif', 'image/gif'))).rejects.toThrow('unauthorized');
  });
});

describe('subirImagen: optimización a WebP', () => {
  // Un lienzo falso que "pesa" lo que se le diga
  function simularNavegador({ ancho, alto, pesoWebp }) {
    global.createImageBitmap = jest.fn(async () => ({ width: ancho, height: alto }));
    const lienzo = { getContext: () => ({ drawImage: jest.fn() }), toBlob: (cb, tipo, calidad) => { lienzo.pedido = { tipo, calidad }; cb(new Blob([new Uint8Array(pesoWebp)], { type: 'image/webp' })); } };
    const crear = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'canvas' ? lienzo : crear(tag)));
    return lienzo;
  }
  afterEach(() => { jest.restoreAllMocks(); });

  test('una foto grande se reduce a 1600 px de lado mayor y se sube como WebP', async () => {
    const lienzo = simularNavegador({ ancho: 4000, alto: 3000, pesoWebp: 200 * 1024 });
    await subirImagen(archivo('casa.jpg', 'image/jpeg', 3 * MB), 'productos');
    expect([lienzo.width, lienzo.height]).toEqual([1600, 1200]);
    expect(lienzo.pedido).toEqual({ tipo: 'image/webp', calidad: 0.82 });
    const [, subido, metadatos] = uploadBytes.mock.calls[0];
    expect(subido.name).toBe('casa.webp');
    expect(subido.type).toBe('image/webp');
    expect(metadatos.contentType).toBe('image/webp');
    expect(ref.mock.calls[0][1]).toMatch(/\.webp$/);
  });

  test('las de pantalla completa (fondos y zone) conservan hasta 3072 px y más calidad', async () => {
    for (const carpeta of ['fondos', 'zone']) {
      uploadBytes.mockClear();
      const lienzo = simularNavegador({ ancho: 6000, alto: 3000, pesoWebp: 500 * 1024 });
      await subirImagen(archivo('f.png', 'image/png', 6 * MB), carpeta);
      expect([lienzo.width, lienzo.height]).toEqual([3072, 1536]);
      expect(lienzo.pedido.calidad).toBe(0.9);
      jest.restoreAllMocks();
    }
  });

  test('una foto chica y liviana se sube tal cual', async () => {
    simularNavegador({ ancho: 800, alto: 600, pesoWebp: 10 });
    const f = archivo('chica.jpg', 'image/jpeg', 100 * 1024);
    await subirImagen(f, 'productos');
    expect(uploadBytes.mock.calls[0][1]).toBe(f);
  });

  test('una foto chica pero pesada (más de 400 KB) sí se comprime', async () => {
    simularNavegador({ ancho: 1200, alto: 900, pesoWebp: 100 * 1024 });
    await subirImagen(archivo('pesada.jpg', 'image/jpeg', 2 * MB), 'productos');
    expect(uploadBytes.mock.calls[0][1].type).toBe('image/webp');
  });

  test('si el WebP pesa igual o más que el original, se sube el original', async () => {
    simularNavegador({ ancho: 4000, alto: 3000, pesoWebp: 3 * MB });
    const f = archivo('casa.jpg', 'image/jpeg', 3 * MB);
    await subirImagen(f, 'productos');
    expect(uploadBytes.mock.calls[0][1]).toBe(f);
  });

  test('si el navegador no puede leer la imagen o no sabe WebP, se sube el original', async () => {
    global.createImageBitmap = jest.fn().mockRejectedValue(new Error('imagen rota'));
    const f = archivo('rota.jpg', 'image/jpeg', 3 * MB);
    await subirImagen(f, 'productos');
    expect(uploadBytes.mock.calls[0][1]).toBe(f);
  });

  test('GIF y SVG no se tocan', async () => {
    simularNavegador({ ancho: 4000, alto: 3000, pesoWebp: 10 });
    const gif = archivo('a.gif', 'image/gif', 3 * MB);
    await subirImagen(gif);
    expect(uploadBytes.mock.calls[0][1]).toBe(gif);
    expect(global.createImageBitmap).not.toHaveBeenCalled();
  });
});

describe('subirMedia', () => {
  test('sin archivo o con un tipo que no es imagen ni video lanza error', async () => {
    await expect(subirMedia(null)).rejects.toThrow('Sin archivo');
    await expect(subirMedia(archivo('a.pdf', 'application/pdf'))).rejects.toThrow('imagen o un video');
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  test('más de 50 MB se rechaza', async () => {
    await expect(subirMedia(archivo('v.mp4', 'video/mp4', 50 * MB + 1))).rejects.toThrow('50 MB');
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  test('un video se sube a fondos/ y devuelve { tipo: "video", url }', async () => {
    const r = await subirMedia(archivo('Intro.MP4', 'video/mp4', 5 * MB));
    const ruta = ref.mock.calls[0][1];
    expect(ruta).toMatch(/^fondos\/\d+-[a-z0-9]{1,6}\.mp4$/);
    expect(r).toEqual({ tipo: 'video', url: `https://cdn.ejemplo/${ruta}` });
    expect(uploadBytes.mock.calls[0][2].contentType).toBe('video/mp4');
  });

  test('una imagen devuelve tipo "imagen"', async () => {
    const r = await subirMedia(archivo('a.gif', 'image/gif'), 'zone');
    expect(r.tipo).toBe('imagen');
    expect(ref.mock.calls[0][1].startsWith('zone/')).toBe(true);
  });

  test('el límite de la página parte del mismo tope que las reglas de Storage (menos de 50 MB)', () => {
    expect(REGLAS).toContain('request.resource.size < 50 * 1024 * 1024');
  });

  // BUG: almacenamiento.js:126 usa "> 50 * 1024 * 1024": un archivo de exactamente 50 MB pasa la validación
  // de la página y storage.rules (size < 50 MB) lo rechaza al subir.
  test.todo('un archivo de exactamente 50 MB se rechaza en la página con mensaje claro (hoy pasa y falla en Storage)');
});
