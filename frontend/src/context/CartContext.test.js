import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CartProvider, useCart } from './CartContext';
import { useAuth } from './AuthContext';
import { obtenerCarrito, guardarCarrito } from '../firebase/carritos';
import { obtenerProducto } from '../firebase/productos';

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../firebase/carritos', () => ({
  ...jest.requireActual('../firebase/carritos'),
  obtenerCarrito: jest.fn(),
  guardarCarrito: jest.fn(),
}));
jest.mock('../firebase/productos', () => ({ obtenerProducto: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

const mochila = { id: 'm1', nombre: 'Mochila', precio: 90, stock: 3, moneda: 'S/' };
let carro;
let raiz;

function Espia() {
  carro = useCart();
  return null;
}

async function montar() {
  raiz = createRoot(document.createElement('div'));
  await act(async () => { raiz.render(<CartProvider><Espia /></CartProvider>); });
}

const avanzar = async (ms = 0) => { await act(async () => { jest.advanceTimersByTime(ms); }); };

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  useAuth.mockReturnValue({ usuario: null });
  obtenerCarrito.mockResolvedValue([]);
  guardarCarrito.mockResolvedValue();
  obtenerProducto.mockImplementation(async () => { throw new Error('sin red'); });
});

afterEach(async () => {
  await act(async () => { raiz.unmount(); });
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('agregar', () => {
  test('agrega y suma, sin pasar del stock', async () => {
    await montar();
    await act(async () => { carro.agregar(mochila); });
    expect(carro.items).toHaveLength(1);
    await act(async () => { carro.agregar(mochila); carro.agregar(mochila); carro.agregar(mochila); });
    expect(carro.items[0].cantidad).toBe(3);
    expect(carro.totalItems).toBe(3);
    expect(carro.totalPrecio).toBe(270);
  });

  test('un producto agotado no se agrega', async () => {
    await montar();
    await act(async () => { carro.agregar({ ...mochila, stock: 0 }); });
    expect(carro.items).toEqual([]);
  });

  test('sin stock cargado se vende hasta 99', async () => {
    await montar();
    const { stock, ...sinStock } = mochila;
    await act(async () => { for (let i = 0; i < 120; i++) carro.agregar(sinStock); });
    expect(carro.items[0].cantidad).toBe(99);
  });

  test('productos distintos quedan como líneas separadas', async () => {
    await montar();
    await act(async () => { carro.agregar(mochila); carro.agregar({ ...mochila, id: 'm2', precio: 50 }); });
    expect(carro.items.map((i) => i.id)).toEqual(['m1', 'm2']);
    expect(carro.totalPrecio).toBe(140);
  });
});

describe('cambiar cantidad, quitar y vaciar', () => {
  test('cambiarCantidad respeta el stock y no baja de 1', async () => {
    await montar();
    await act(async () => { carro.agregar(mochila); });
    await act(async () => { carro.cambiarCantidad('m1', 2); });
    expect(carro.items[0].cantidad).toBe(2);
    await act(async () => { carro.cambiarCantidad('m1', 50); });
    expect(carro.items[0].cantidad).toBe(3);
    await act(async () => { carro.cambiarCantidad('m1', 0); });
    expect(carro.items[0].cantidad).toBe(3);
    await act(async () => { carro.cambiarCantidad('m1', -2); });
    expect(carro.items[0].cantidad).toBe(3);
  });

  test('quitar y vaciar', async () => {
    await montar();
    await act(async () => { carro.agregar(mochila); carro.agregar({ ...mochila, id: 'm2' }); });
    await act(async () => { carro.quitar('m1'); });
    expect(carro.items.map((i) => i.id)).toEqual(['m2']);
    await act(async () => { carro.vaciar(); });
    expect(carro.items).toEqual([]);
    expect(carro.totalPrecio).toBe(0);
  });
});

describe('persistencia', () => {
  test('se guarda en el navegador y se recupera al volver a abrir', async () => {
    await montar();
    await act(async () => { carro.agregar(mochila); });
    expect(JSON.parse(localStorage.getItem('kapac_carrito'))[0].id).toBe('m1');
    await act(async () => { raiz.unmount(); });
    await montar();
    expect(carro.items[0].id).toBe('m1');
  });

  test('un carrito dañado o que no es lista empieza vacío', async () => {
    localStorage.setItem('kapac_carrito', '{no es json');
    await montar();
    expect(carro.items).toEqual([]);
    await act(async () => { raiz.unmount(); });
    localStorage.setItem('kapac_carrito', JSON.stringify({ id: 'm1' }));
    await montar();
    expect(carro.items).toEqual([]);
  });

  test('sin cuenta no escribe en Firestore', async () => {
    await montar();
    await act(async () => { carro.agregar(mochila); });
    await avanzar(2000);
    expect(guardarCarrito).not.toHaveBeenCalled();
    expect(obtenerCarrito).not.toHaveBeenCalled();
  });
});

describe('con cuenta', () => {
  test('al entrar une el carrito local con el de la cuenta y lo guarda, sin duplicar', async () => {
    localStorage.setItem('kapac_carrito', JSON.stringify([{ ...mochila, cantidad: 1 }]));
    obtenerCarrito.mockResolvedValue([{ ...mochila, cantidad: 2 }, { ...mochila, id: 'm2', cantidad: 1 }]);
    useAuth.mockReturnValue({ usuario: { uid: 'u1', email: 'a@b.com' } });
    await montar();
    expect(carro.items.map((i) => [i.id, i.cantidad])).toEqual([['m1', 2], ['m2', 1]]);
    expect(guardarCarrito).toHaveBeenCalledWith('u1', expect.arrayContaining([expect.objectContaining({ id: 'm1', cantidad: 2 })]));
    expect(obtenerCarrito).toHaveBeenCalledTimes(1);
  });

  test('los cambios se guardan en la cuenta con un retardo, una sola escritura por ráfaga', async () => {
    useAuth.mockReturnValue({ usuario: { uid: 'u1', email: 'a@b.com' } });
    await montar();
    guardarCarrito.mockClear();
    await act(async () => { carro.agregar(mochila); });
    await act(async () => { carro.agregar(mochila); });
    await avanzar(100);
    expect(guardarCarrito).not.toHaveBeenCalled();
    await avanzar(500);
    expect(guardarCarrito).toHaveBeenCalledTimes(1);
    expect(guardarCarrito.mock.calls[0][0]).toBe('u1');
    expect(guardarCarrito.mock.calls[0][1][0].cantidad).toBe(2);
  });
});

describe('poner al día con el catálogo', () => {
  const guardar = (items) => localStorage.setItem('kapac_carrito', JSON.stringify(items));

  test('al abrir corrige precio y stock, avisa y deja los avisos guardados hasta verlos', async () => {
    guardar([{ ...mochila, cantidad: 3 }]);
    obtenerProducto.mockResolvedValue({ ...mochila, precio: 100, stock: 1 });
    await montar();
    await avanzar(1600);
    expect(carro.items[0]).toMatchObject({ precio: 100, cantidad: 1, stock: 1 });
    expect(carro.avisos.map((a) => a.tipo).sort()).toEqual(['precio', 'stock']);
    expect(JSON.parse(localStorage.getItem('kapac_carrito_avisos'))).toHaveLength(2);
    await act(async () => { carro.limpiarAvisos(); });
    expect(carro.avisos).toEqual([]);
    expect(localStorage.getItem('kapac_carrito_avisos')).toBeNull();
  });

  test('un producto agotado o borrado sale del carrito con su aviso', async () => {
    guardar([{ ...mochila, cantidad: 1 }, { ...mochila, id: 'm2', cantidad: 1 }]);
    obtenerProducto.mockImplementation(async (id) => (id === 'm1' ? { ...mochila, stock: 0 } : null));
    await montar();
    await avanzar(1600);
    expect(carro.items).toEqual([]);
    expect(carro.avisos.map((a) => [a.id, a.tipo])).toEqual([['m1', 'agotado'], ['m2', 'quitado']]);
  });

  test('si el catálogo no responde, el carrito queda como estaba y sin avisos', async () => {
    guardar([{ ...mochila, cantidad: 2 }]);
    await montar();
    await avanzar(1600);
    expect(carro.items[0].cantidad).toBe(2);
    expect(carro.avisos).toEqual([]);
  });

  test('refrescar devuelve solo lo que cambió en esa lectura', async () => {
    guardar([{ ...mochila, cantidad: 1 }]);
    obtenerProducto.mockResolvedValue(mochila);
    await montar();
    await avanzar(1600);
    obtenerProducto.mockResolvedValue({ ...mochila, precio: 120 });
    let cambios;
    await act(async () => { cambios = await carro.refrescar(); });
    expect(cambios.map((c) => c.tipo)).toEqual(['precio']);
    expect(cambios[0]).toMatchObject({ antes: 90, ahora: 120 });
    await act(async () => { cambios = await carro.refrescar(); });
    expect(cambios).toEqual([]);
  });

  test('con un carrito vacío no lee el catálogo', async () => {
    await montar();
    await avanzar(2000);
    expect(obtenerProducto).not.toHaveBeenCalled();
  });

  test('los avisos guardados de una visita anterior siguen ahí', async () => {
    localStorage.setItem('kapac_carrito_avisos', JSON.stringify([{ id: 'm1', tipo: 'precio' }]));
    await montar();
    expect(carro.avisos).toHaveLength(1);
  });
});

describe('restaurar (cambiar de método de pago)', () => {
  test('con el carrito vacío vuelve a poner el del respaldo', async () => {
    sessionStorage.setItem('checkout_respaldo', JSON.stringify({ items: [{ ...mochila, cantidad: 2 }], email: 'a@b.com', nombre: 'Ana' }));
    await montar();
    await act(async () => { carro.restaurar(); });
    expect(carro.items[0].cantidad).toBe(2);
  });

  test('con productos en el carrito no los pisa', async () => {
    sessionStorage.setItem('checkout_respaldo', JSON.stringify({ items: [{ ...mochila, id: 'otro', cantidad: 5 }] }));
    await montar();
    await act(async () => { carro.agregar(mochila); });
    await act(async () => { carro.restaurar(); });
    expect(carro.items.map((i) => i.id)).toEqual(['m1']);
  });
});
