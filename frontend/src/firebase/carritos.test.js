import { getDoc, setDoc, doc } from 'firebase/firestore';
import { obtenerCarrito, guardarCarrito, fusionarCarritos } from './carritos';

jest.mock('./config', () => ({ db: { nombre: 'db' } }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), serverTimestamp: jest.fn(),
}));

beforeEach(() => {
  doc.mockImplementation((db, coleccion, id) => ({ coleccion, id }));
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => console.error.mockRestore());

describe('fusionarCarritos', () => {
  test('el mismo producto en los dos carritos NO se suma: queda la mayor cantidad', () => {
    const local = [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2 }];
    const remoto = [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 3 }];
    expect(fusionarCarritos(local, remoto)).toEqual([{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 3 }]);
    expect(fusionarCarritos(remoto, local)[0].cantidad).toBe(3);
  });

  test('los productos distintos se juntan, primero los del primer carrito', () => {
    const r = fusionarCarritos([{ id: 'a', cantidad: 1 }], [{ id: 'b', cantidad: 4 }]);
    expect(r.map((i) => i.id)).toEqual(['a', 'b']);
    expect(r[1].cantidad).toBe(4);
  });

  test('al iniciar sesión no se pierde el carrito local si el de la cuenta está vacío, ni al revés', () => {
    const items = [{ id: 'a', cantidad: 2 }];
    expect(fusionarCarritos(items, [])).toEqual(items);
    expect(fusionarCarritos([], items)).toEqual(items);
    expect(fusionarCarritos([], [])).toEqual([]);
  });

  test('una cantidad ausente, cero o inválida cuenta como 1 (nunca queda un producto sin unidades)', () => {
    expect(fusionarCarritos([{ id: 'a' }], [])[0].cantidad).toBe(1);
    expect(fusionarCarritos([{ id: 'a', cantidad: 0 }], [])[0].cantidad).toBe(1);
    expect(fusionarCarritos([{ id: 'a', cantidad: 0 }], [{ id: 'a' }])[0].cantidad).toBe(1);
  });

  test('ignora entradas rotas: null, sin id o con id vacío', () => {
    const r = fusionarCarritos([null, undefined, { cantidad: 3 }, { id: '', cantidad: 2 }, { id: 'ok', cantidad: 1 }], [{ nombre: 'sin id' }]);
    expect(r).toEqual([{ id: 'ok', cantidad: 1 }]);
  });

  test('el dato del primer carrito (precio, nombre) es el que se conserva', () => {
    const r = fusionarCarritos([{ id: 'a', precio: 100, cantidad: 1 }], [{ id: 'a', precio: 1, cantidad: 5 }]);
    expect(r).toEqual([{ id: 'a', precio: 100, cantidad: 5 }]);
  });

  test('no modifica los carritos que recibe', () => {
    const a = [{ id: 'a', cantidad: 1 }];
    const b = [{ id: 'a', cantidad: 9 }];
    fusionarCarritos(a, b);
    expect(a).toEqual([{ id: 'a', cantidad: 1 }]);
    expect(b).toEqual([{ id: 'a', cantidad: 9 }]);
  });
});

describe('obtenerCarrito', () => {
  test('lee carritos/<uid> y devuelve los items', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ items: [{ id: 'a', cantidad: 2 }] }) });
    expect(await obtenerCarrito('u1')).toEqual([{ id: 'a', cantidad: 2 }]);
    expect(doc).toHaveBeenCalledWith({ nombre: 'db' }, 'carritos', 'u1');
  });

  test('sin carrito guardado devuelve lista vacía', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    expect(await obtenerCarrito('u1')).toEqual([]);
  });

  test('un documento sin campo items devuelve lista vacía', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });
    expect(await obtenerCarrito('u1')).toEqual([]);
  });

  test('si Firestore falla devuelve lista vacía y no rompe el inicio de sesión', async () => {
    getDoc.mockRejectedValue(new Error('offline'));
    expect(await obtenerCarrito('u1')).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});

describe('guardarCarrito', () => {
  test('escribe items y la hora del servidor en carritos/<uid>', async () => {
    setDoc.mockResolvedValue();
    const items = [{ id: 'a', cantidad: 2 }];
    await guardarCarrito('u1', items);
    expect(doc).toHaveBeenCalledWith({ nombre: 'db' }, 'carritos', 'u1');
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [ref, datos] = setDoc.mock.calls[0];
    expect(ref).toEqual({ coleccion: 'carritos', id: 'u1' });
    expect(datos.items).toBe(items);
    expect(Object.keys(datos).sort()).toEqual(['actualizadoEn', 'items']);
  });

  test('si falla la escritura no lanza (el carrito local sigue funcionando)', async () => {
    setDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(guardarCarrito('u1', [])).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
