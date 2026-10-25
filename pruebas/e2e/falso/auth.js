// Firebase Auth falso para las pruebas de punta a punta: la sesión vive en localStorage.__user
// (la pone la prueba) y los inicios de sesión de la página la escriben ahí. Con window.__authError
// = 'auth/...' el siguiente intento falla con ese código.
const oyentes = [];

const leer = () => { try { return JSON.parse(localStorage.getItem('__user')); } catch (_) { return null; } };
const completar = (u) => (u ? { emailVerified: true, photoURL: null, displayName: null, ...u, getIdToken: async () => 'token-falso' } : null);

function emitir(u) {
  if (u) localStorage.setItem('__user', JSON.stringify(u)); else localStorage.removeItem('__user');
  oyentes.forEach((f) => f(completar(u)));
}

const falla = () => {
  const codigo = window.__authError;
  if (!codigo) return null;
  return Promise.reject(Object.assign(new Error(codigo), { code: codigo }));
};

const auth = { get currentUser() { return completar(leer()); } };

export const getAuth = () => auth;
export class GoogleAuthProvider {}

export function onAuthStateChanged(_auth, callback) {
  oyentes.push(callback);
  setTimeout(() => callback(completar(leer())), 30);
  return () => { const i = oyentes.indexOf(callback); if (i >= 0) oyentes.splice(i, 1); };
}

export function createUserWithEmailAndPassword(_auth, email) {
  return falla() || (emitir({ uid: 'u-nuevo', email, displayName: '', isAnonymous: false }), Promise.resolve({ user: completar(leer()) }));
}

export function signInWithEmailAndPassword(_auth, email) {
  return falla() || (emitir({ uid: 'u-1', email, displayName: 'Ana Quispe', isAnonymous: false }), Promise.resolve({ user: completar(leer()) }));
}

export function signInWithPopup() {
  return falla() || (emitir({ uid: 'u-g', email: 'ana.g@gmail.com', displayName: 'Ana Google', isAnonymous: false }), Promise.resolve({ user: completar(leer()) }));
}

export function signInAnonymously() {
  return falla() || (emitir({ uid: 'anon-demo', email: null, displayName: null, isAnonymous: true }), Promise.resolve({ user: completar(leer()) }));
}

export function sendPasswordResetEmail() {
  window.__recuperacionEnviada = (window.__recuperacionEnviada || 0) + 1;
  return falla() || Promise.resolve();
}

export function signOut() {
  emitir(null);
  return Promise.resolve();
}
