// Servicio de pedidos - Firestore
import {
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const COLECCION = 'pedidos';

// Crear un pedido
export async function crearPedido({ usuarioId, email, items, total }) {
  const pedido = {
    usuarioId,
    email,
    items: items.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      precio: i.precio,
      cantidad: i.cantidad,
    })),
    total,
    estado: 'pendiente',
    fecha: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLECCION), pedido);
  return ref.id;
}

// Obtener pedidos de un usuario
export async function obtenerPedidosUsuario(usuarioId) {
  const q = query(
    collection(db, COLECCION),
    where('usuarioId', '==', usuarioId),
    orderBy('fecha', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
