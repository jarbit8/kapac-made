import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import useTrackVisita from './useTrackVisita';
import usePedidoPago from './usePedidoPago';
import { registrarVisita } from '../firebase/visitas';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/TemaContext';
import { getDoc } from 'firebase/firestore';

let mockRuta = '/shop';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockRuta }) }), { virtual: true });
jest.mock('../firebase/visitas', () => ({ registrarVisita: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../context/TemaContext', () => ({ useTema: jest.fn() }));
jest.mock('../firebase/config', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn((db, c, id) => ({ c, id })), getDoc: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let valor;
async function montar(hook) {
  function Espia() { valor = hook(); return null; }
  raiz = createRoot(document.createElement('div'));
  await act(async () => { raiz.render(<Espia />); });
}

afterEach(async () => {
  await act(async () => { raiz.unmount(); });
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('useTrackVisita', () => {
  const sesion = (usuario, extra = {}) => useAuth.mockReturnValue({ usuario, cargando: false, esAdmin: false, ...extra });
  const tienda = (cerrado, cerradoListo = true) => useTema.mockReturnValue({ cerrado, cerradoListo });

  beforeEach(() => { mockRuta = '/shop'; sesion(null); tienda(false); });

  test('registra la visita con la ruta y el usuario', async () => {
    const u = { uid: 'u', email: 'ana@ejemplo.com' };
    sesion(u);
    await montar(useTrackVisita);
    expect(registrarVisita).toHaveBeenCalledWith('/shop', u, '');
  });

  test('sin sesión manda null', async () => {
    await montar(useTrackVisita);
    expect(registrarVisita).toHaveBeenCalledWith('/shop', null, '');
  });

  test('espera a saber quién es y si la tienda está abierta', async () => {
    sesion(null, { cargando: true });
    await montar(useTrackVisita);
    expect(registrarVisita).not.toHaveBeenCalled();
    await act(async () => { raiz.unmount(); });
    sesion(null);
    tienda(false, false);
    await montar(useTrackVisita);
    expect(registrarVisita).not.toHaveBeenCalled();
  });

  test('el dueño no se registra, Cristhian sí', async () => {
    sesion({ uid: 'j', email: 'Jarb2299@gmail.com' });
    await montar(useTrackVisita);
    expect(registrarVisita).not.toHaveBeenCalled();
    await act(async () => { raiz.unmount(); });
    sesion({ uid: 'c', email: 'cristhiandccapa@gmail.com' });
    await montar(useTrackVisita);
    expect(registrarVisita).toHaveBeenCalledTimes(1);
  });

  test('el navegador marcado como del dueño no se registra aunque no tenga sesión', async () => {
    localStorage.setItem('kapac_no_contar', '1');
    await montar(useTrackVisita);
    expect(registrarVisita).not.toHaveBeenCalled();
  });

  test('si el navegador lo usó Cristhian (no_contar = 0) sí se registra', async () => {
    localStorage.setItem('kapac_no_contar', '0');
    localStorage.setItem('kapac_dispositivo_admin', '1');
    await montar(useTrackVisita);
    expect(registrarVisita).toHaveBeenCalledTimes(1);
  });

  test('con la marca antigua de admin y sin la nueva, no se registra', async () => {
    localStorage.setItem('kapac_dispositivo_admin', '1');
    await montar(useTrackVisita);
    expect(registrarVisita).not.toHaveBeenCalled();
  });

  test('con la tienda cerrada se registra Próximamente y la dirección que quiso abrir', async () => {
    tienda(true);
    mockRuta = '/admin';
    await montar(useTrackVisita);
    expect(registrarVisita).toHaveBeenCalledWith('/proximamente', null, '/admin');
  });

  test('con la tienda cerrada /login cuenta como login', async () => {
    tienda(true);
    mockRuta = '/login';
    await montar(useTrackVisita);
    expect(registrarVisita).toHaveBeenCalledWith('/login', null, '');
  });

  test('con la tienda cerrada el admin ve la tienda y se registra su ruta', async () => {
    tienda(true);
    sesion({ uid: 'c', email: 'cristhiandccapa@gmail.com' }, { esAdmin: true });
    await montar(useTrackVisita);
    expect(registrarVisita).toHaveBeenCalledWith('/shop', expect.anything(), '');
  });
});

describe('usePedidoPago', () => {
  const pedido = (datos) => getDoc.mockResolvedValue({ exists: () => datos !== null, data: () => datos });
  const esperar = () => act(async () => { await Promise.resolve(); });

  test('el total sale del pedido guardado, no de lo que había en el navegador', async () => {
    sessionStorage.setItem('pago_total', '1');
    pedido({ total: 90, estado: 'procesando_pago' });
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor).toEqual({ total: '90', estado: 'listo' });
  });

  test('un pedido que ya no está pendiente queda cerrado', async () => {
    pedido({ total: 90, estado: 'pendiente_envio' });
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor.estado).toBe('cerrado');
  });

  test('PagoEfectivo sigue abierto en verificando_pago', async () => {
    pedido({ total: 90, estado: 'verificando_pago' });
    await montar(() => usePedidoPago('p1', 'procesando_pago,verificando_pago'));
    await esperar();
    expect(valor.estado).toBe('listo');
  });

  test('un pedido que no existe', async () => {
    pedido(null);
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor.estado).toBe('noexiste');
  });

  test('un pedido reemplazado al cambiar de método no se vuelve a pagar', async () => {
    sessionStorage.setItem('pedidos_reemplazados', JSON.stringify(['p1']));
    pedido({ total: 90, estado: 'procesando_pago' });
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor.estado).toBe('cerrado');
    expect(getDoc).not.toHaveBeenCalled();
  });

  test('sin permiso (pedido de otra sesión) no existe, aunque haya un total guardado', async () => {
    sessionStorage.setItem('pago_total', '90');
    getDoc.mockRejectedValue({ code: 'permission-denied' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor.estado).toBe('noexiste');
    console.error.mockRestore();
  });

  test('un fallo de red con el total guardado deja pagar con ese total', async () => {
    sessionStorage.setItem('pago_total', '90');
    getDoc.mockRejectedValue(new Error('red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor).toEqual({ total: '90', estado: 'listo' });
    console.error.mockRestore();
  });

  test('un fallo de red sin total guardado no deja pagar', async () => {
    getDoc.mockRejectedValue(new Error('red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor.estado).toBe('noexiste');
    console.error.mockRestore();
  });

  test('un pedido con total 0 y sin total guardado no se cobra', async () => {
    pedido({ total: 0, estado: 'procesando_pago' });
    await montar(() => usePedidoPago('p1'));
    await esperar();
    expect(valor.estado).toBe('noexiste');
    expect(valor.total).toBeNull();
  });
});
