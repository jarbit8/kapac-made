import fs from 'fs';
import path from 'path';
import { getDocs, addDoc } from 'firebase/firestore';
import { registrarVisita, obtenerEstadisticas, obtenerVisitasRecientes, detectarDispositivo, detectarNavegador } from './visitas';

jest.mock('./config', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), addDoc: jest.fn(), getDocs: jest.fn(), query: jest.fn(),
  orderBy: jest.fn(), limit: jest.fn(), serverTimestamp: jest.fn(),
}));

const hoy = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
const visita = (persona, sesion, ruta, pais, ciudad, extra = {}) => ({
  data: () => ({ dia: hoy, ruta, sesionId: `${persona}.${sesion}`, entrada: true, pais, ciudad, dispositivo: 'PC Windows', navegador: 'Chrome', ...extra }),
});

test('cuenta personas por país y por ciudad, separando Próximamente de la página', async () => {
  getDocs.mockResolvedValue({ docs: [
    visita('a', 1, 'proximamente', 'Peru', 'Arequipa'),
    visita('a', 2, 'proximamente', 'Peru', 'Arequipa'), // la misma persona otro día
    visita('b', 1, 'proximamente', 'PE', 'Lima'),        // código en vez de nombre
    visita('c', 1, 'proximamente', 'Chile', 'Santiago'),
    visita('d', 1, 'shop', 'Peru', 'Cusco'),
    visita('r', 1, 'proximamente', 'United States', 'Boardman', { robot: true }),
  ] });

  const stats = await obtenerEstadisticas(30);

  expect(stats.proximamente.total).toBe(5);
  expect(stats.proximamente.visitantesUnicos).toBe(4);
  expect(stats.proximamente.robots).toBe(1);
  expect(stats.proximamente.porPais).toEqual({ Peru: 2, Chile: 1, 'United States': 1 });
  expect(stats.proximamente.ciudadesPorPais).toEqual({ Peru: { Arequipa: 1, Lima: 1 }, Chile: { Santiago: 1 }, 'United States': { Boardman: 1 } });
  expect(stats.pagina.robots).toBe(0);
  expect(stats.pagina.porPais).toEqual({ Peru: 1 });
  expect(stats.pagina.ciudadesPorPais).toEqual({ Peru: { Cusco: 1 } });
});

test('Próximamente, login y página van por separado, y la misma persona cuenta una vez', async () => {
  // Llegan de la más nueva a la más vieja
  getDocs.mockResolvedValue({ docs: [
    visita('c', 1, 'home', 'Peru', 'Lima', { entrada: false, email: 'cristhiandccapa@gmail.com' }),
    visita('c', 1, 'login', 'Peru', 'Lima', { entrada: false }),
    visita('c', 1, 'proximamente', 'Peru', 'Lima'),
    visita('x', 1, 'login', 'Peru', 'Cusco', { entrada: false }),
    visita('x', 1, 'proximamente', 'Peru', 'Cusco', { pidio: '/admin' }),
    visita('j', 1, 'admin', 'Peru', 'Arequipa', { entrada: false, email: 'jarb2299@gmail.com' }),
    visita('j', 1, 'proximamente', 'Peru', 'Arequipa'),
  ] });

  const stats = await obtenerEstadisticas(30);
  expect(stats.proximamente.total).toBe(2);
  expect(stats.login.total).toBe(2);
  expect(stats.pagina.total).toBe(1);
  expect(stats.pagina.visitantesUnicos).toBe(1);
  expect(stats.pagina.logueados).toBe(1);
  expect(stats.pagina.porRuta).toEqual({ home: 1 });

  const proximamente = await obtenerVisitasRecientes(10, 'proximamente');
  expect(proximamente.map((v) => v.pidio || null)).toEqual([null, '/admin']);
  const login = await obtenerVisitasRecientes(10, 'login');
  expect(login.map((v) => [v.correo, v.entro])).toEqual([['cristhiandccapa@gmail.com', true], [null, false]]);
  const pagina = await obtenerVisitasRecientes(10, 'pagina');
  expect(pagina).toHaveLength(1);
  expect(pagina[0].recorrido).toEqual(['home']);
});

test('guarda solo campos que aceptan las reglas, y sin los nuevos si las publicadas son viejas', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('sin red'));
  addDoc.mockRejectedValueOnce({ code: 'permission-denied' }).mockResolvedValueOnce({});

  await registrarVisita('/proximamente', null, '/admin');

  const [completa, basica] = addDoc.mock.calls.map((c) => c[1]);
  expect(completa).toMatchObject({ ruta: 'proximamente', pidio: '/admin', robot: false, entrada: true });
  expect(basica).not.toHaveProperty('pidio');
  expect(basica).not.toHaveProperty('robot');

  // firestore.rules usa hasOnly: un campo que no esté en esa lista hace fallar todas las visitas
  const reglas = fs.readFileSync(path.join(__dirname, '../../../firestore.rules'), 'utf8');
  const permitidos = reglas.match(/match \/visitas[\s\S]*?hasOnly\(\[([^\]]*)\]/)[1].match(/'\w+'/g).map((x) => x.slice(1, -1));
  expect(permitidos).toEqual(expect.arrayContaining(Object.keys(completa)));
});

test('reconoce el dispositivo y el navegador', () => {
  const iphoneInstagram = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.0';
  const androidChrome = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
  const ipadSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
  const pcEdge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
  const facebook = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]';

  expect(detectarDispositivo(iphoneInstagram)).toBe('iPhone');
  expect(detectarNavegador(iphoneInstagram)).toBe('Instagram');
  expect(detectarDispositivo(androidChrome)).toBe('Android');
  expect(detectarNavegador(androidChrome)).toBe('Chrome');
  expect(detectarDispositivo(ipadSafari, 5)).toBe('iPad');
  expect(detectarDispositivo(ipadSafari, 0)).toBe('Mac');
  expect(detectarNavegador(ipadSafari)).toBe('Safari');
  expect(detectarDispositivo(pcEdge)).toBe('PC Windows');
  expect(detectarNavegador(pcEdge)).toBe('Edge');
  expect(detectarNavegador(facebook)).toBe('Facebook');
});
