// Actualiza Firestore: elimina mochila-3 y mochila-4, agrega Gonzalo
// Uso: node scripts/update-productos.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, addDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBS0Ud5y11qOJlF6kGubx7PiX5mnXMRmgw",
  authDomain: "kapac-made.firebaseapp.com",
  projectId: "kapac-made",
  storageBucket: "kapac-made.firebasestorage.app",
  messagingSenderId: "19638468309",
  appId: "1:19638468309:web:3ceff7c057d7f3965bec5c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const col = collection(db, 'productos');
const snap = await getDocs(col);
const productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

console.log(`\nProductos actuales en Firestore (${productos.length}):`);
productos.forEach(p => console.log(`  [${p.id.slice(0,8)}] ${p.nombre} — imagenMochila: ${p.imagenMochila}`));

// Eliminar los que usan mochila-3 o mochila-4
const aEliminar = productos.filter(p =>
  p.imagenMochila === 'mochila-3' || p.imagenMochila === 'mochila-4'
);

if (aEliminar.length === 0) {
  console.log('\nNo se encontraron productos con mochila-3 o mochila-4. Nada que eliminar.');
} else {
  for (const p of aEliminar) {
    await deleteDoc(doc(db, 'productos', p.id));
    console.log(`\n🗑️  Eliminado: "${p.nombre}" (${p.id.slice(0,8)})`);
  }
}

// Verificar si Gonzalo ya existe
const yaExiste = productos.some(p => p.imagenMochila === 'gonzalo');
if (yaExiste) {
  console.log('\n⚠️  Gonzalo ya existe en la base de datos. No se duplica.');
} else {
  const gonzalo = {
    nombre: 'Gonzalo',
    precio: 1,
    precioOriginal: null,
    moneda: 'S/',
    imagenMochila: 'gonzalo',
    imagenContexto: 'gonzalo',
    descripcion: 'Edición especial Gonzalo.',
    stock: 10,
    activo: true,
    categoria: 'Aventura',
  };
  const ref = await addDoc(col, gonzalo);
  console.log(`\n✅ Agregado: "Gonzalo" (${ref.id.slice(0,8)}) — S/1.00`);
}

console.log('\n✔ Listo.\n');
process.exit(0);
