import { getDocs } from 'firebase/firestore';
import { obtenerEstadisticas } from './visitas';

jest.mock('./config', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), addDoc: jest.fn(), getDocs: jest.fn(), query: jest.fn(),
  orderBy: jest.fn(), limit: jest.fn(), serverTimestamp: jest.fn(),
}));

const hoy = new Date().toISOString().slice(0, 10);
const visita = (persona, sesion, ruta, pais, ciudad) => ({
  data: () => ({ dia: hoy, ruta, sesionId: `${persona}.${sesion}`, entrada: true, pais, ciudad, dispositivo: 'PC Windows', navegador: 'Chrome' }),
});

test('cuenta personas por país y por ciudad, separando Próximamente de la tienda', async () => {
  getDocs.mockResolvedValue({ docs: [
    visita('a', 1, 'proximamente', 'Peru', 'Arequipa'),
    visita('a', 2, 'proximamente', 'Peru', 'Arequipa'), // la misma persona otro día
    visita('b', 1, 'proximamente', 'PE', 'Lima'),        // código en vez de nombre
    visita('c', 1, 'proximamente', 'Chile', 'Santiago'),
    visita('d', 1, 'shop', 'Peru', 'Cusco'),
  ] });

  const stats = await obtenerEstadisticas(30);

  expect(stats.proximamente.total).toBe(4);
  expect(stats.proximamente.visitantesUnicos).toBe(3);
  expect(stats.proximamente.porPais).toEqual({ Peru: 2, Chile: 1 });
  expect(stats.proximamente.ciudadesPorPais).toEqual({ Peru: { Arequipa: 1, Lima: 1 }, Chile: { Santiago: 1 } });
  expect(stats.porPais).toEqual({ Peru: 1 });
  expect(stats.ciudadesPorPais).toEqual({ Peru: { Cusco: 1 } });
});
