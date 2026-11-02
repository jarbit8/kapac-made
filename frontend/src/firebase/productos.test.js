const CLAVE = 'kapac_productos_v1';

// El módulo recuerda los productos a nivel de módulo: cada prueba lo carga limpio
function cargar({ local, ventana } = {}) {
  localStorage.clear();
  delete window.__CONTENIDO__;
  if (local !== undefined) localStorage.setItem(CLAVE, typeof local === 'string' ? local : JSON.stringify(local));
  if (ventana) window.__CONTENIDO__ = ventana;
  let r;
  jest.isolateModules(() => {
    jest.doMock('./config', () => ({ db: {} }));
    jest.doMock('firebase/firestore', () => ({
      collection: jest.fn((db, nombre) => ({ coleccion: nombre })),
      doc: jest.fn((db, coleccion, id) => ({ coleccion, id })),
      getDocs: jest.fn(), getDoc: jest.fn(), addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(),
    }));
    r = { m: require('./productos'), fs: require('firebase/firestore') };
  });
  return r;
}

const instantanea = (lista) => ({ docs: lista.map(({ id, ...datos }) => ({ id, data: () => datos })) });
const guardadoLocal = () => JSON.parse(localStorage.getItem(CLAVE));

afterEach(() => { localStorage.clear(); delete window.__CONTENIDO__; });

describe('productos recordados de la visita anterior', () => {
  test('usa los del navegador si los hay', () => {
    const { m } = cargar({ local: [{ id: 'a' }] });
    expect(m.productosGuardados()).toEqual([{ id: 'a' }]);
  });

  test('en la primera visita usa los que había al publicar', () => {
    const { m } = cargar({ ventana: { productos: [{ id: 'pub', precio: 50 }] } });
    expect(m.productosGuardados()).toEqual([{ id: 'pub', precio: 50 }]);
  });

  test('un JSON roto en el navegador se ignora y se usan los publicados', () => {
    const { m } = cargar({ local: 'no-es-json', ventana: { productos: [{ id: 'pub' }] } });
    expect(m.productosGuardados()).toEqual([{ id: 'pub' }]);
  });

  test('sin nada guardado ni publicado es null', () => {
    expect(cargar().m.productosGuardados()).toBeNull();
  });
});

describe('obtenerProductos', () => {
  test('devuelve todos con su id, y los recuerda para la próxima visita', async () => {
    const { m, fs } = cargar();
    fs.getDocs.mockResolvedValue(instantanea([{ id: 'a', nombre: 'Daypack', precio: 100 }, { id: 'b', nombre: 'Trek', precio: 250 }]));
    const r = await m.obtenerProductos();
    expect(r).toEqual([{ id: 'a', nombre: 'Daypack', precio: 100 }, { id: 'b', nombre: 'Trek', precio: 250 }]);
    expect(m.productosGuardados()).toEqual(r);
    expect(guardadoLocal()).toEqual(r);
  });

  test('un catálogo vacío reemplaza la copia vieja (un producto borrado no reaparece)', async () => {
    const { m, fs } = cargar({ local: [{ id: 'viejo' }] });
    fs.getDocs.mockResolvedValue(instantanea([]));
    expect(await m.obtenerProductos()).toEqual([]);
    expect(guardadoLocal()).toEqual([]);
  });

  test('si Firestore falla lanza el error y deja la copia anterior', async () => {
    const { m, fs } = cargar({ local: [{ id: 'viejo' }] });
    fs.getDocs.mockRejectedValue(new Error('unavailable'));
    await expect(m.obtenerProductos()).rejects.toThrow('unavailable');
    expect(m.productosGuardados()).toEqual([{ id: 'viejo' }]);
  });
});

describe('obtenerProducto', () => {
  test('devuelve el producto con su id o null si no existe', async () => {
    const { m, fs } = cargar();
    fs.getDoc.mockResolvedValue({ exists: () => true, id: 'a', data: () => ({ nombre: 'Daypack' }) });
    expect(await m.obtenerProducto('a')).toEqual({ id: 'a', nombre: 'Daypack' });
    expect(fs.doc).toHaveBeenCalledWith({}, 'productos', 'a');
    fs.getDoc.mockResolvedValue({ exists: () => false });
    expect(await m.obtenerProducto('x')).toBeNull();
  });
});

describe('agregarProducto', () => {
  test('crea el documento, devuelve su id y suma el producto a la copia recordada', async () => {
    const { m, fs } = cargar({ local: [{ id: 'a', nombre: 'Daypack' }] });
    fs.addDoc.mockResolvedValue({ id: 'nuevo' });
    const id = await m.agregarProducto({ nombre: 'Trek', precio: 250, stock: 3 });
    expect(id).toBe('nuevo');
    expect(fs.addDoc).toHaveBeenCalledWith({ coleccion: 'productos' }, { nombre: 'Trek', precio: 250, stock: 3 });
    expect(m.productosGuardados()).toEqual([{ id: 'a', nombre: 'Daypack' }, { id: 'nuevo', nombre: 'Trek', precio: 250, stock: 3 }]);
    expect(guardadoLocal()).toHaveLength(2);
  });

  test('sin copia recordada no inventa una lista: la tienda se llena al leer Firestore', async () => {
    const { m, fs } = cargar();
    fs.addDoc.mockResolvedValue({ id: 'nuevo' });
    await m.agregarProducto({ nombre: 'Trek' });
    expect(m.productosGuardados()).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  test('si las reglas rechazan el alta (no es admin) la copia recordada no cambia', async () => {
    const { m, fs } = cargar({ local: [{ id: 'a' }] });
    fs.addDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(m.agregarProducto({ nombre: 'X' })).rejects.toThrow('permission-denied');
    expect(m.productosGuardados()).toEqual([{ id: 'a' }]);
  });
});

describe('actualizarProducto', () => {
  test('cambia solo los campos enviados en Firestore y en la copia recordada', async () => {
    const { m, fs } = cargar({ local: [{ id: 'a', nombre: 'Daypack', precio: 100, stock: 5 }, { id: 'b', nombre: 'Trek', precio: 250 }] });
    fs.updateDoc.mockResolvedValue();
    await m.actualizarProducto('a', { precio: 90 });
    expect(fs.updateDoc).toHaveBeenCalledWith({ coleccion: 'productos', id: 'a' }, { precio: 90 });
    expect(m.productosGuardados()).toEqual([{ id: 'a', nombre: 'Daypack', precio: 90, stock: 5 }, { id: 'b', nombre: 'Trek', precio: 250 }]);
  });

  test('si falla la escritura la copia recordada no muestra el cambio', async () => {
    const { m, fs } = cargar({ local: [{ id: 'a', precio: 100 }] });
    fs.updateDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(m.actualizarProducto('a', { precio: 1 })).rejects.toThrow();
    expect(m.productosGuardados()).toEqual([{ id: 'a', precio: 100 }]);
  });
});

describe('eliminarProducto', () => {
  test('borra el documento y lo quita de la copia recordada', async () => {
    const { m, fs } = cargar({ local: [{ id: 'a' }, { id: 'b' }] });
    fs.deleteDoc.mockResolvedValue();
    await m.eliminarProducto('a');
    expect(fs.deleteDoc).toHaveBeenCalledWith({ coleccion: 'productos', id: 'a' });
    expect(m.productosGuardados()).toEqual([{ id: 'b' }]);
    expect(guardadoLocal()).toEqual([{ id: 'b' }]);
  });

  test('si falla el borrado el producto sigue en la copia recordada', async () => {
    const { m, fs } = cargar({ local: [{ id: 'a' }] });
    fs.deleteDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(m.eliminarProducto('a')).rejects.toThrow();
    expect(m.productosGuardados()).toEqual([{ id: 'a' }]);
  });
});
