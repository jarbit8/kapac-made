import { getDoc, setDoc, doc } from 'firebase/firestore';
import { obtenerTextos, guardarTexto } from './textos';

jest.mock('./config', () => ({ db: { nombre: 'db' } }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn() }));

beforeEach(() => {
  doc.mockImplementation((db, coleccion, id) => ({ coleccion, id }));
});

describe('obtenerTextos', () => {
  test('lee el mapa de contenido/textos', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ 'hero.titulo__es': 'Hola', 'hero.titulo__en': 'Hi' }) });
    expect(await obtenerTextos()).toEqual({ 'hero.titulo__es': 'Hola', 'hero.titulo__en': 'Hi' });
    expect(doc).toHaveBeenCalledWith({ nombre: 'db' }, 'contenido', 'textos');
  });

  test('si el documento no existe devuelve un objeto vacío', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    expect(await obtenerTextos()).toEqual({});
  });

  test('un documento existente sin datos devuelve un objeto vacío, no undefined', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => undefined });
    expect(await obtenerTextos()).toEqual({});
  });

  test('si Firestore no responde falla: así la página conserva los textos de la visita anterior', async () => {
    getDoc.mockRejectedValue(new Error('unavailable'));
    await expect(obtenerTextos()).rejects.toThrow('unavailable');
  });
});

describe('guardarTexto', () => {
  test('cambia solo la clave editada, con merge para no borrar los demás textos', async () => {
    setDoc.mockResolvedValue();
    await guardarTexto('hero.titulo__es', 'Nuevo');
    expect(setDoc).toHaveBeenCalledWith({ coleccion: 'contenido', id: 'textos' }, { 'hero.titulo__es': 'Nuevo' }, { merge: true });
  });

  test('si la escritura falla (sin permiso) el error llega a quien llama para revertir el texto', async () => {
    setDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(guardarTexto('a', 'b')).rejects.toThrow('permission-denied');
  });
});
