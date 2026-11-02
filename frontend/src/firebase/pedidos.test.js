import fs from 'fs';
import path from 'path';
import { addDoc, getDocs, updateDoc, where, doc, collection, serverTimestamp } from 'firebase/firestore';
import { crearPedido, obtenerPedidosUsuario, obtenerTodosPedidos, actualizarEstadoPedido } from './pedidos';

jest.mock('./config', () => ({ db: { nombre: 'db' } }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), addDoc: jest.fn(), getDocs: jest.fn(), doc: jest.fn(), updateDoc: jest.fn(),
  query: jest.fn(), where: jest.fn(), serverTimestamp: jest.fn(),
}));

const REGLAS = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'firestore.rules'), 'utf8');

beforeEach(() => {
  collection.mockImplementation((db, nombre) => ({ coleccion: nombre }));
  doc.mockImplementation((db, coleccion, id) => ({ coleccion, id }));
  where.mockImplementation((campo, op, valor) => ({ campo, op, valor }));
  serverTimestamp.mockReturnValue('HORA_SERVIDOR');
  addDoc.mockResolvedValue({ id: 'ped1' });
});

const base = {
  usuarioId: 'u1', email: 'ana@ejemplo.com', nombre: 'Ana',
  items: [{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2, stock: 5, foto: 'x.jpg', categoria: 'mochilas' }],
  total: 200,
};
const guardado = () => addDoc.mock.calls[0][1];

describe('crearPedido', () => {
  test('nace en procesando_pago, con yape por defecto y devuelve el id del documento', async () => {
    const id = await crearPedido(base);
    expect(id).toBe('ped1');
    expect(addDoc.mock.calls[0][0]).toEqual({ coleccion: 'pedidos' });
    expect(guardado()).toMatchObject({
      usuarioId: 'u1', email: 'ana@ejemplo.com', nombre: 'Ana', total: 200,
      estado: 'procesando_pago', metodoPago: 'yape', envio: null, esInvitado: false, fecha: 'HORA_SERVIDOR',
    });
  });

  test('de cada producto guarda solo id, nombre, precio y cantidad (no el stock ni lo demás)', async () => {
    await crearPedido(base);
    expect(guardado().items).toEqual([{ id: 'p1', nombre: 'Daypack', precio: 100, cantidad: 2 }]);
  });

  test('respeta el método de pago y el envío; null en envío significa recojo en tienda', async () => {
    await crearPedido({ ...base, metodoPago: 'efectivo', envio: { tipo: 'envio', ciudad: 'Arequipa' } });
    expect(guardado().metodoPago).toBe('efectivo');
    expect(guardado().envio).toEqual({ tipo: 'envio', ciudad: 'Arequipa' });
  });

  test('esInvitado solo se guarda como booleano', async () => {
    await crearPedido({ ...base, esInvitado: 'si' });
    expect(guardado().esInvitado).toBe(true);
    addDoc.mockClear();
    await crearPedido({ ...base, esInvitado: undefined });
    expect(guardado().esInvitado).toBe(false);
  });

  test('sin nombre guarda cadena vacía, nunca undefined (Firestore lo rechaza)', async () => {
    await crearPedido({ ...base, nombre: undefined });
    expect(guardado().nombre).toBe('');
  });

  test('si Firestore rechaza el pedido el error llega a quien llama (para no seguir al pago)', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(crearPedido(base)).rejects.toThrow('permission-denied');
  });

  test('las claves del pedido son exactamente las que firestore.rules deja crear', async () => {
    await crearPedido({ ...base, metodoPago: 'efectivo', envio: { tipo: 'recojo' }, esInvitado: true });
    const permitidas = REGLAS.match(/match \/pedidos\/\{pedidoId\}[\s\S]*?hasOnly\(\[([^\]]+)\]\)/)[1]
      .match(/'(\w+)'/g).map((s) => s.replace(/'/g, ''));
    expect(permitidas.length).toBeGreaterThan(5);
    const sobran = Object.keys(guardado()).filter((k) => !permitidas.includes(k));
    expect(sobran).toEqual([]);
    expect(Object.keys(guardado()).sort()).toEqual([...permitidas].sort());
  });

  test('el estado inicial es el único que firestore.rules deja crear', async () => {
    await crearPedido(base);
    expect(REGLAS).toContain(`request.resource.data.estado == '${guardado().estado}'`);
  });
});

describe('obtenerPedidosUsuario', () => {
  const docs = (lista) => ({ docs: lista.map(([id, datos]) => ({ id, data: () => datos })) });

  test('pide solo los pedidos del usuario', async () => {
    getDocs.mockResolvedValue(docs([]));
    await obtenerPedidosUsuario('u7');
    expect(where).toHaveBeenCalledWith('usuarioId', '==', 'u7');
  });

  test('los ordena del más reciente al más antiguo y agrega el id', async () => {
    getDocs.mockResolvedValue(docs([
      ['viejo', { fecha: { seconds: 100 } }],
      ['nuevo', { fecha: { seconds: 300 } }],
      ['medio', { fecha: { seconds: 200 } }],
    ]));
    const r = await obtenerPedidosUsuario('u1');
    expect(r.map((p) => p.id)).toEqual(['nuevo', 'medio', 'viejo']);
  });

  test('un pedido sin fecha todavía (pendiente del servidor) no se pierde ni rompe el orden: queda al final', async () => {
    getDocs.mockResolvedValue(docs([
      ['viejo', { fecha: { seconds: 100 } }],
      ['recien', { fecha: null }],
    ]));
    const r = await obtenerPedidosUsuario('u1');
    expect(r).toHaveLength(2);
    expect(r.map((p) => p.id)).toEqual(['viejo', 'recien']);
  });

  test('sin pedidos devuelve lista vacía', async () => {
    getDocs.mockResolvedValue(docs([]));
    expect(await obtenerPedidosUsuario('u1')).toEqual([]);
  });
});

describe('obtenerTodosPedidos (admin)', () => {
  test('trae todos y los ordena del más reciente al más antiguo', async () => {
    getDocs.mockResolvedValue({ docs: [
      { id: 'a', data: () => ({ fecha: { seconds: 1 } }) },
      { id: 'b', data: () => ({ fecha: { seconds: 9 } }) },
      { id: 'c', data: () => ({}) },
    ] });
    const r = await obtenerTodosPedidos();
    expect(r.map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(where).not.toHaveBeenCalled();
  });
});

describe('actualizarEstadoPedido', () => {
  test('cambia solo el campo estado del pedido indicado', async () => {
    updateDoc.mockResolvedValue();
    await actualizarEstadoPedido('ped9', 'enviado');
    expect(updateDoc).toHaveBeenCalledWith({ coleccion: 'pedidos', id: 'ped9' }, { estado: 'enviado' });
  });
});
