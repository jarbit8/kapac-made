// Script para actualizar productos reales en Firestore
// Ejecutar: node scripts/update-productos.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Usar Application Default Credentials (firebase login ya autenticado)
initializeApp({ projectId: 'kapac-made' });
const db = getFirestore();

const productos = [
  {
    nombre: 'Kapac Explorer',
    precio: 129,
    precioOriginal: 149,
    moneda: 'S/',
    descripcion: 'Mochila diseñada para explorar sin límites. Fabricada en Arequipa con altos estándares de calidad. Disponible en Verde Militar, Salvia Cyan y Verde Agua. Testeada y certificada para aventuras urbanas y de viaje.',
    categoria: 'Aventura',
    imagenMochila: 'mochila-1',
    imagenContexto: 'foto-1',
    stock: 10,
    activo: true,
    codigo: 'KM-EXP-BK-52-V2',
  },
  {
    nombre: 'Kapac Atoms',
    precio: 129,
    precioOriginal: 159,
    moneda: 'S/',
    descripcion: 'La mochila más reciente de Kapac Made. Diseño que destaca, hecha en Arequipa con materiales de primera calidad. Perfecta para el uso diario urbano y viajes.',
    categoria: 'Urbana',
    imagenMochila: 'mochila-2',
    imagenContexto: 'foto-2',
    stock: 10,
    activo: true,
    codigo: 'KM-MO-AT001',
  },
  {
    nombre: 'Gonzalo',
    precio: 1,
    precioOriginal: null,
    moneda: 'S/',
    descripcion: 'Edición especial Gonzalo. Una pieza única de Kapac Made para coleccionistas.',
    categoria: 'Urbana',
    imagenMochila: 'gonzalo',
    imagenContexto: 'foto-1',
    stock: 1,
    activo: true,
  },
];

async function actualizarProductos() {
  console.log('🔄 Obteniendo productos existentes...');
  const snap = await db.collection('productos').get();
  const existentes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`📦 Encontrados ${existentes.length} productos existentes`);

  for (const producto of productos) {
    // Buscar por nombre
    const existente = existentes.find(e =>
      e.nombre?.toLowerCase().includes(producto.nombre.toLowerCase()) ||
      producto.nombre.toLowerCase().includes(e.nombre?.toLowerCase())
    );

    if (existente) {
      console.log(`✏️  Actualizando: ${producto.nombre} (${existente.id})`);
      await db.collection('productos').doc(existente.id).update(producto);
    } else {
      console.log(`➕ Creando nuevo: ${producto.nombre}`);
      await db.collection('productos').add(producto);
    }
  }

  console.log('✅ Productos actualizados correctamente');
}

actualizarProductos().catch(console.error);
