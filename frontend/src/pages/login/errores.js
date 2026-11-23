const MAPA_ES = {
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
};

const MAPA_EN = {
  'auth/invalid-email': 'Invalid email address.',
  'auth/user-not-found': 'No account exists with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
};

export function traducirError(code, idioma) {
  const mapa = idioma === 'en' ? MAPA_EN : MAPA_ES;
  const fallback = idioma === 'en' ? 'An error occurred. Please try again.' : 'Ocurrió un error. Intenta de nuevo.';
  return mapa[code] || fallback;
}
