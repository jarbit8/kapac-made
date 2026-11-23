import { doc, getDoc, setDoc } from 'firebase/firestore';
import { obtenerPerfil, guardarPerfil } from './perfil';

jest.mock('./config', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(),
}));

beforeEach(() => { doc.mockImplementation((db, c, id) => ({ c, id })); });

test('lee el perfil de su usuario y devuelve null si no existe', async () => {
  getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ nombre: 'Ana' }) });
  expect(await obtenerPerfil('u1')).toEqual({ nombre: 'Ana' });
  expect(getDoc.mock.calls[0][0]).toEqual({ c: 'usuarios', id: 'u1' });
  getDoc.mockResolvedValueOnce({ exists: () => false });
  expect(await obtenerPerfil('u2')).toBeNull();
});

test('guardar mezcla con lo que ya había (no borra otros campos)', async () => {
  await guardarPerfil('u1', { telefono: '999888777' });
  expect(setDoc).toHaveBeenCalledWith({ c: 'usuarios', id: 'u1' }, { telefono: '999888777' }, { merge: true });
});
