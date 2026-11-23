import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { observarUsuario } from '../firebase/auth';

const mockSetIdioma = jest.fn();
let mockIdioma = 'es';
jest.mock('./LanguageContext', () => ({ useIdioma: () => ({ idioma: mockIdioma, setIdioma: mockSetIdioma }) }));
jest.mock('../firebase/auth', () => ({ observarUsuario: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

let auth;
let raiz;
let avisarSesion;

function Espia() {
  auth = useAuth();
  return null;
}

async function montar() {
  raiz = createRoot(document.createElement('div'));
  await act(async () => { raiz.render(<AuthProvider><Espia /></AuthProvider>); });
}
const entra = async (usuario) => { await act(async () => { avisarSesion(usuario); }); };

beforeEach(() => {
  localStorage.clear();
  mockIdioma = 'es';
  mockSetIdioma.mockClear();
  observarUsuario.mockImplementation((cb) => { avisarSesion = cb; return jest.fn(); });
});
afterEach(async () => { await act(async () => { raiz.unmount(); }); });

const JOEL = { uid: 'j', email: 'jarb2299@gmail.com' };
const CRIS = { uid: 'c', email: 'Cristhiandccapa@Gmail.com' };
const CLIENTE = { uid: 'x', email: 'ana@ejemplo.com' };

test('arranca cargando y sin admin; sin sesión sigue sin ser admin', async () => {
  await montar();
  expect(auth.cargando).toBe(true);
  expect(auth.esAdmin).toBe(false);
  await entra(null);
  expect(auth.cargando).toBe(false);
  expect(auth.usuario).toBeNull();
  expect(auth.esAdmin).toBe(false);
});

test('un cliente con cuenta o un invitado no es admin', async () => {
  await montar();
  await entra(CLIENTE);
  expect(auth.esAdmin).toBe(false);
  await entra({ uid: 'anon', email: null, isAnonymous: true });
  expect(auth.esAdmin).toBe(false);
});

test('los correos de la lista son admin aunque cambie la capitalización', async () => {
  await montar();
  await entra(CRIS);
  expect(auth.esAdmin).toBe(true);
  await entra(JOEL);
  expect(auth.esAdmin).toBe(true);
});

test('editar exige ser admin y activar el modo edición, que siempre arranca apagado', async () => {
  await montar();
  await entra(JOEL);
  expect(auth.modoEdicion).toBe(false);
  expect(auth.puedeEditar).toBe(false);
  await act(async () => { auth.setModoEdicion(true); });
  expect(auth.puedeEditar).toBe(true);
  await entra(CLIENTE);
  expect(auth.puedeEditar).toBe(false);
});

test('un cliente nunca puede editar aunque active el modo edición', async () => {
  await montar();
  await entra(CLIENTE);
  await act(async () => { auth.setModoEdicion(true); });
  expect(auth.puedeEditar).toBe(false);
});

test('al editar la página pasa a español', async () => {
  mockIdioma = 'en';
  await montar();
  await entra(JOEL);
  expect(mockSetIdioma).not.toHaveBeenCalled();
  await act(async () => { auth.setModoEdicion(true); });
  expect(mockSetIdioma).toHaveBeenCalledWith('es');
});

test('si en español no toca el idioma', async () => {
  await montar();
  await entra(JOEL);
  await act(async () => { auth.setModoEdicion(true); });
  expect(mockSetIdioma).not.toHaveBeenCalled();
});

test('marcas del navegador: solo el dueño deja de contar en Visitas, Cristhian sí cuenta', async () => {
  await montar();
  await entra(JOEL);
  expect(localStorage.getItem('kapac_dispositivo_admin')).toBe('1');
  expect(localStorage.getItem('kapac_no_contar')).toBe('1');
  expect(localStorage.getItem('kapac_sesion_admin')).toBe('1');
  await entra(CRIS);
  expect(localStorage.getItem('kapac_no_contar')).toBe('0');
});

test('un cliente no deja marcas de admin y cerrar sesión borra la sesión recordada', async () => {
  await montar();
  await entra(CLIENTE);
  expect(localStorage.getItem('kapac_dispositivo_admin')).toBeNull();
  expect(localStorage.getItem('kapac_sesion_admin')).toBeNull();
  await entra(JOEL);
  await entra(null);
  expect(localStorage.getItem('kapac_sesion_admin')).toBeNull();
});

test('mientras Firebase confirma, se asume la sesión de admin de la visita anterior', async () => {
  localStorage.setItem('kapac_sesion_admin', '1');
  await montar();
  expect(auth.cargando).toBe(true);
  expect(auth.esAdmin).toBe(true);
  // pero editar sigue pidiendo activar el modo edición
  expect(auth.puedeEditar).toBe(false);
  await entra(CLIENTE);
  expect(auth.esAdmin).toBe(false);
});

test('al desmontar deja de escuchar la sesión', async () => {
  const baja = jest.fn();
  observarUsuario.mockImplementation((cb) => { avisarSesion = cb; return baja; });
  await montar();
  await act(async () => { raiz.unmount(); });
  expect(baja).toHaveBeenCalled();
  raiz = createRoot(document.createElement('div'));
});
