// Configuración de Firebase para Kapac Made
import { initializeApp } from 'firebase/app';
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

// Servicios que usaremos
export const db = getFirestore(app);          // Base de datos (productos, pedidos)
export const auth = getAuth(app);             // Login / registro
export const storage = getStorage(app);       // Imágenes
export const googleProvider = new GoogleAuthProvider();

export default app;
