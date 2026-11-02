import fs from 'fs';
import path from 'path';
import { getDocs, updateDoc, orderBy, query, collection, doc, serverTimestamp } from 'firebase/firestore';
import { enviarReclamo, obtenerReclamos, responderReclamo } from './reclamos';

jest.mock('./config', () => ({ db: { nombre: 'db' } }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), doc: jest.fn(), getDocs: jest.fn(), orderBy: jest.fn(), query: jest.fn(),
  serverTimestamp: jest.fn(), updateDoc: jest.fn(),
}));

const REGLAS = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'firestore.rules'), 'utf8');
const respuesta = (cuerpo, ok = true) => ({ ok, json: async () => cuerpo });

beforeEach(() => {
  global.fetch = jest.fn();
  collection.mockImplementation((db, nombre) => ({ coleccion: nombre }));
  doc.mockImplementation((db, coleccion, id) => ({ coleccion, id }));
  orderBy.mockImplementation((campo, sentido) => ({ campo, sentido }));
  query.mockImplementation((...partes) => partes);
  serverTimestamp.mockReturnValue('HORA_SERVIDOR');
});
afterEach(() => { delete global.fetch; });

describe('enviarReclamo', () => {
  const hoja = { tipo: 'reclamo', nombre: 'Ana Quispe', email: 'ana@ejemplo.com' };

  test('manda la hoja tal cual a la función registrarreclamo por POST', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: true, codigo: 'R-2026-0001', fecha: 'f', fechaLimite: 'l' }));
    await enviarReclamo(hoja);
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('https://registrarreclamo-3lp3eiv6xa-uc.a.run.app');
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual(hoja);
  });

  test('si se registró devuelve código, fecha y fecha límite, sin datos de más', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: true, codigo: 'R-2026-0001', fecha: 'f', fechaLimite: 'l', interno: 'x' }));
    expect(await enviarReclamo(hoja)).toEqual({ ok: true, codigo: 'R-2026-0001', fecha: 'f', fechaLimite: 'l' });
  });

  test('si el servidor la rechaza devuelve su mensaje y no un código', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: false, mensaje: 'Revisa el correo.' }, false));
    expect(await enviarReclamo(hoja)).toEqual({ ok: false, mensaje: 'Revisa el correo.' });
  });

  test('un 200 con ok distinto de true no se toma como registrado', async () => {
    global.fetch.mockResolvedValue(respuesta({ codigo: 'R-1' }, true));
    const r = await enviarReclamo(hoja);
    expect(r.ok).toBe(false);
    expect(r.codigo).toBeUndefined();
  });

  test('una respuesta que no es JSON no rompe', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => { throw new Error('html'); } });
    expect(await enviarReclamo(hoja)).toEqual({ ok: false, mensaje: undefined });
  });

  test('sin conexión devuelve error "conexion" para que la página lo ponga en el idioma activo', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await enviarReclamo(hoja)).toEqual({ ok: false, error: 'conexion' });
  });
});

describe('obtenerReclamos (admin)', () => {
  test('lee la colección ordenada por fecha descendente y usa el código como id', async () => {
    getDocs.mockResolvedValue({ docs: [
      { id: 'R-2026-0002', data: () => ({ tipo: 'queja' }) },
      { id: 'R-2026-0001', data: () => ({ tipo: 'reclamo' }) },
    ] });
    const r = await obtenerReclamos();
    expect(query).toHaveBeenCalledWith({ coleccion: 'reclamos' }, { campo: 'fecha', sentido: 'desc' });
    expect(r).toEqual([{ id: 'R-2026-0002', tipo: 'queja' }, { id: 'R-2026-0001', tipo: 'reclamo' }]);
  });
});

describe('responderReclamo (admin)', () => {
  test('guarda la respuesta, la hora del servidor y el estado respondido en reclamos/<código>', async () => {
    updateDoc.mockResolvedValue();
    await responderReclamo('R-2026-0001', 'Le devolveremos su dinero.');
    expect(updateDoc).toHaveBeenCalledWith(
      { coleccion: 'reclamos', id: 'R-2026-0001' },
      { respuesta: 'Le devolveremos su dinero.', fechaRespuesta: 'HORA_SERVIDOR', estado: 'respondido' },
    );
  });

  test('escribe exactamente las tres claves que firestore.rules deja cambiar', async () => {
    updateDoc.mockResolvedValue();
    await responderReclamo('R-1', 'ok');
    const permitidas = REGLAS.match(/match \/reclamos\/\{codigo\}[\s\S]*?hasOnly\(\[([^\]]+)\]\)/)[1]
      .match(/'(\w+)'/g).map((s) => s.replace(/'/g, ''));
    expect(Object.keys(updateDoc.mock.calls[0][1]).sort()).toEqual([...permitidas].sort());
    expect(REGLAS).toContain("request.resource.data.estado == 'respondido'");
  });

  test('si las reglas lo rechazan (ya respondido o sin permiso) el error llega a quien llama', async () => {
    updateDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(responderReclamo('R-1', 'ok')).rejects.toThrow('permission-denied');
  });
});
