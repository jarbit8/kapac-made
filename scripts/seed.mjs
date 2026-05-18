// Script Node para poblar Firestore con los productos iniciales
// Uso: node scripts/seed.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBS0Ud5y11qOJlF6kGubx7PiX5mnXMRmgw",
  authDomain: "kapac-made.firebaseapp.com",
  projectId: "kapac-made",
  storageBucket: "kapac-made.firebasestorage.app",
  messagingSenderId: "19638468309",
  appId: "1:19638468309:web:3ceff7c057d7f3965bec5c",
  measurementId: "G-2763WKFFNT"
};

const PRODUCTOS = [
  { nombre: 'Kapac Explorer', precio: 129, precioOriginal: 149, moneda: 'S/', imagenMochila: 'mochila-1', imagenContexto: 'foto-1', descripcion: 'Mochila resistente para aventuras urbanas y de montaña.', stock: 10, activo: true },
  { nombre: 'Kapac Atoms',    precio: 129, precioOriginal: 159, moneda: 'S/', imagenMochila: 'mochila-2', imagenContexto: 'foto-2', descripcion: 'Diseño minimalista con ilustraciones andinas únicas.', stock: 8, activo: true },
  { nombre: 'Kapac Trail',    precio: 119, precioOriginal: 139, moneda: 'S/', imagenMochila: 'mochila-3', imagenContexto: 'foto-3', descripcion: 'Ligera y cómoda para tus rutas diarias.', stock: 12, activo: true },
  { nombre: 'Kapac Summit',   precio: 149, precioOriginal: 169, moneda: 'S/', imagenMochila: 'mochila-4', imagenContexto: 'foto-4', descripcion: 'La más amplia, ideal para viajes largos.', stock: 6, activo: true },
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const col = collection(db, 'productos');
const snap = await getDocs(col);

if (!snap.empty) {
  console.log(`Ya existen ${snap.size} productos. No se duplica nada.`);
  process.exit(0);
}

const batch = writeBatch(db);
PRODUCTOS.forEach((p) => batch.set(doc(col), p));
await batch.commit();

console.log(`OK - ${PRODUCTOS.length} productos subidos a Firestore.`);
process.exit(0);
