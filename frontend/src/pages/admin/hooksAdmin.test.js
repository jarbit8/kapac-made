import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import useReclamos from './useReclamos';
import usePedidos from './usePedidos';
import useVisitas from './useVisitas';
import { formatoFecha } from './formatoFecha';
import { obtenerReclamos, responderReclamo } from '../../firebase/reclamos';
import { obtenerTodosPedidos } from '../../firebase/pedidos';
import { obtenerEstadisticas, obtenerVisitasRecientes } from '../../firebase/visitas';

jest.mock('../../firebase/reclamos', () => ({ obtenerReclamos: jest.fn(), responderReclamo: jest.fn() }));
jest.mock('../../firebase/pedidos', () => ({ obtenerTodosPedidos: jest.fn() }));
jest.mock('../../firebase/visitas', () => ({ obtenerEstadisticas: jest.fn(), obtenerVisitasRecientes: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let h;
async function montar(hook) {
  function Espia() { h = hook(); return null; }
  raiz = createRoot(document.createElement('div'));
  await act(async () => { raiz.render(<Espia />); });
}
afterEach(async () => { await act(async () => { raiz.unmount(); }); jest.restoreAllMocks(); jest.clearAllMocks(); });

describe('useReclamos', () => {
  const R = [
    { id: 'a', codigo: '000001-2026', email: 'a@b.com', estado: 'pendiente' },
    { id: 'b', codigo: '000002-2026', email: 'c@d.com', estado: 'respondido' },
  ];
  const setMsg = jest.fn();

  test('separa pendientes de respondidos', async () => {
    obtenerReclamos.mockResolvedValue(R);
    await montar(() => useReclamos(setMsg));
    await act(async () => { await h.cargarReclamos(); });
    expect(h.reclamosPendientes.map((r) => r.id)).toEqual(['a']);
    expect(h.reclamosRespondidos.map((r) => r.id)).toEqual(['b']);
    expect(h.reclamosError).toBe('');
  });

  test('si no se pueden leer, lo dice', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    obtenerReclamos.mockRejectedValue(new Error('permisos'));
    await montar(() => useReclamos(setMsg));
    await act(async () => { await h.cargarReclamos(); });
    expect(h.reclamosError).toContain('permisos');
  });

  test('abrir y cerrar el mismo reclamo borra lo escrito', async () => {
    await montar(() => useReclamos(setMsg));
    await act(async () => { h.abrirReclamo('a'); });
    await act(async () => { h.setRespuesta('hola'); });
    await act(async () => { h.abrirReclamo('a'); });
    expect(h.reclamoAbierto).toBeNull();
    expect(h.respuesta).toBe('');
  });

  test('una respuesta de menos de 10 letras no se envía ni se confirma', async () => {
    const conf = jest.spyOn(window, 'confirm').mockReturnValue(true);
    await montar(() => useReclamos(setMsg));
    await act(async () => { h.setRespuesta('   corta  '); });
    await act(async () => { await h.enviarRespuesta(R[0]); });
    expect(responderReclamo).not.toHaveBeenCalled();
    expect(conf).not.toHaveBeenCalled();
    expect(setMsg).toHaveBeenCalledWith(expect.stringContaining('mínimo 10'));
  });

  test('si el admin no confirma, no se envía', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    await montar(() => useReclamos(setMsg));
    await act(async () => { h.setRespuesta('Te cambiamos la mochila sin costo.'); });
    await act(async () => { await h.enviarRespuesta(R[0]); });
    expect(responderReclamo).not.toHaveBeenCalled();
  });

  test('responde con el texto recortado, avisa el código y recarga', async () => {
    const conf = jest.spyOn(window, 'confirm').mockReturnValue(true);
    obtenerReclamos.mockResolvedValue(R);
    responderReclamo.mockResolvedValue();
    await montar(() => useReclamos(setMsg));
    await act(async () => { h.setRespuesta('  Te cambiamos la mochila sin costo.  '); });
    await act(async () => { await h.enviarRespuesta(R[0]); });
    expect(conf.mock.calls[0][0]).toContain('a@b.com');
    expect(responderReclamo).toHaveBeenCalledWith('a', 'Te cambiamos la mochila sin costo.');
    expect(setMsg).toHaveBeenCalledWith('Reclamo 000001-2026 respondido');
    expect(obtenerReclamos).toHaveBeenCalled();
    expect(h.respuesta).toBe('');
    expect(h.respondiendo).toBe(false);
  });

  test('si Firestore rechaza, avisa y deja lo escrito', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    responderReclamo.mockRejectedValue(new Error('permission-denied'));
    await montar(() => useReclamos(setMsg));
    await act(async () => { h.setRespuesta('Te cambiamos la mochila sin costo.'); });
    await act(async () => { await h.enviarRespuesta(R[0]); });
    expect(setMsg).toHaveBeenCalledWith(expect.stringContaining('No se pudo guardar'));
    expect(h.respuesta).toBe('Te cambiamos la mochila sin costo.');
    expect(h.respondiendo).toBe(false);
  });
});

describe('usePedidos', () => {
  test('Yape con QR en verificación lo revisa el admin; PagoEfectivo no', async () => {
    obtenerTodosPedidos.mockResolvedValue([
      { id: '1', estado: 'verificando_pago', metodoPago: 'yape' },
      { id: '2', estado: 'verificando_pago', metodoPago: 'efectivo' },
      { id: '3', estado: 'verificando', metodoPago: 'yape' },
      { id: '4', estado: 'pendiente_envio', metodoPago: 'yape' },
      { id: '5', estado: 'procesando_pago', metodoPago: 'yape' },
    ]);
    await montar(usePedidos);
    expect(h.pedidosVerificando).toEqual([]);
    await act(async () => { await h.cargarPedidos(); });
    expect(h.pedidosVerificando.map((p) => p.id)).toEqual(['1', '3']);
    expect(h.filtroPedidos).toBe('pendientes');
  });
});

describe('useVisitas', () => {
  test('arranca en Próximamente si la tienda está cerrada y en Página si está abierta', async () => {
    await montar(() => useVisitas(true));
    expect(h.zona).toBe('proximamente');
    await act(async () => { raiz.unmount(); });
    await montar(() => useVisitas(false));
    expect(h.zona).toBe('pagina');
  });

  test('una respuesta lenta de otra zona no pisa la lista de la zona actual', async () => {
    let soltarLenta;
    obtenerEstadisticas.mockResolvedValue({});
    obtenerVisitasRecientes.mockImplementation((n, z) => (z === 'login'
      ? new Promise((res) => { soltarLenta = () => res([{ id: 'lenta' }]); })
      : Promise.resolve([{ id: 'rapida' }])));
    await montar(() => useVisitas(false));
    await act(async () => { h.cambiarZona('login'); });
    await act(async () => { h.cambiarZona('pagina'); });
    await act(async () => { soltarLenta(); });
    expect(h.visitasRecientes).toEqual([{ id: 'rapida' }]);
    expect(h.zona).toBe('pagina');
  });

  test('ver más pide 10 más', async () => {
    obtenerVisitasRecientes.mockResolvedValue([]);
    await montar(() => useVisitas(false));
    await act(async () => { await h.verMasVisitas(); });
    expect(obtenerVisitasRecientes).toHaveBeenCalledWith(20, 'pagina');
    expect(h.visitasLimite).toBe(20);
  });
});

describe('formatoFecha', () => {
  test('sin fecha de servidor todavía dice Recién creado', () => {
    expect(formatoFecha(null)).toBe('Recién creado');
    expect(formatoFecha({})).toBe('Recién creado');
  });
  test('con fecha da día, mes y año', () => {
    const s = formatoFecha({ toDate: () => new Date('2026-11-05T15:30:00Z') });
    expect(s).toMatch(/2026/);
    expect(s).toMatch(/05/);
  });
});
