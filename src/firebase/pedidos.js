// Servicio de pedidos - Firestore
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const COLECCION = 'pedidos';

// Crear un pedido
export async function crearPedido({ usuarioId, email, nombre, items, total, envio, metodoPago, esInvitado }) {
  const pedido = {
    usuarioId,
    email,
    nombre: nombre || '',
    items: items.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      precio: i.precio,
      cantidad: i.cantidad,
    })),
    total,
    estado: 'procesando_pago',
    metodoPago: metodoPago || 'yape',
    envio: envio || null,       // null = recojo en tienda
    esInvitado: !!esInvitado,   // true = compró sin cuenta
    fecha: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLECCION), pedido);
  return ref.id;
}

// Obtener pedidos de un usuario
// (sin orderBy en la query → no necesita índice compuesto;
//  ordenamos por fecha aquí mismo en el código)
export async function obtenerPedidosUsuario(usuarioId) {
  const q = query(
    collection(db, COLECCION),
    where('usuarioId', '==', usuarioId)
  );
  const snap = await getDocs(q);
  const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Ordenar más reciente primero (maneja fecha pendiente de serverTimestamp)
  pedidos.sort((a, b) => {
    const fa = a.fecha?.seconds || 0;
    const fb = b.fecha?.seconds || 0;
    return fb - fa;
  });

  return pedidos;
}

// Actualizar estado de un pedido
export async function actualizarEstadoPedido(pedidoId, nuevoEstado) {
  const ref = doc(db, COLECCION, pedidoId);
  await updateDoc(ref, { estado: nuevoEstado });
}

// Actualizar pedido con datos extra (ej. codigoAprobacion de Yape)
export async function actualizarPedido(pedidoId, datos) {
  const ref = doc(db, COLECCION, pedidoId);
  await updateDoc(ref, datos);
}

// Obtener TODOS los pedidos (para el admin)
export async function obtenerTodosPedidos() {
  const snap = await getDocs(collection(db, COLECCION));
  const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  pedidos.sort((a, b) => {
    const fa = a.fecha?.seconds || 0;
    const fb = b.fecha?.seconds || 0;
    return fb - fa;
  });
  return pedidos;
}
