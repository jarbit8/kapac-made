// Servicio de autenticación - Firebase Auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from './config';

// Registro con email y contraseña
export function registrar(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Iniciar sesión con email y contraseña
export function iniciarSesion(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Iniciar sesión con Google
export function iniciarSesionGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// Enviar el enlace para cambiar la contraseña
export function enviarRecuperacion(email) {
  return sendPasswordResetEmail(auth, email);
}

// Login anónimo para invitados (guest checkout)
export function loginAnonimo() {
  return signInAnonymously(auth);
}

// Cerrar sesión
export function cerrarSesion() {
  return signOut(auth);
}

// Escuchar cambios de sesión (saber si hay usuario logueado)
export function observarUsuario(callback) {
  return onAuthStateChanged(auth, callback);
}
