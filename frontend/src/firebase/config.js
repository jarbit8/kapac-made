// Configuración de Firebase para Kapac Made
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBS0Ud5y11qOJlF6kGubx7PiX5mnXMRmgw",
  authDomain: "kapac-made.firebaseapp.com",
  projectId: "kapac-made",
  storageBucket: "kapac-made.firebasestorage.app",
  messagingSenderId: "19638468309",
  appId: "1:19638468309:web:3ceff7c057d7f3965bec5c",
  measurementId: "G-2763WKFFNT"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// App Check (anti-abuso). Solo se activa si hay una llave reCAPTCHA configurada;
// si no, no hace nada y el sitio funciona igual.
if (process.env.REACT_APP_RECAPTCHA_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.REACT_APP_RECAPTCHA_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('App Check no se pudo inicializar:', e?.message);
  }
}

// Servicios que usaremos
export const db = getFirestore(app);          // Base de datos (productos, pedidos)
export const auth = getAuth(app);             // Login / registro
export const storage = getStorage(app);       // Imágenes
export const googleProvider = new GoogleAuthProvider();

export default app;
