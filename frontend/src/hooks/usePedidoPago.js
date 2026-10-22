// Total y estado del pedido que se está pagando.
// El total sale del pedido en Firestore; si no se puede leer, se usa el guardado al crearlo.
// estado: 'cargando' | 'listo' | 'cerrado' (ya no está pendiente de pago) | 'noexiste'
// abiertos: estados en los que todavía se paga (PagoEfectivo vuelve a mostrar su CIP en verificando_pago)
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function usePedidoPago(pedidoId, abiertos = 'procesando_pago') {
  const [total, setTotal] = useState(() => sessionStorage.getItem('pago_total'));
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let cancelado = false;
    getDoc(doc(db, 'pedidos', pedidoId))
      .then((snap) => {
        if (cancelado) return;
        if (!snap.exists()) return setEstado('noexiste');
        const pedido = snap.data();
        if (!abiertos.split(',').includes(pedido.estado)) return setEstado('cerrado');
        const monto = Number(pedido.total) > 0 ? String(pedido.total) : sessionStorage.getItem('pago_total');
        if (!(Number(monto) > 0)) return setEstado('noexiste');
        setTotal(monto);
        setEstado('listo');
      })
      .catch((e) => {
        console.error(e);
        if (cancelado) return;
        // Sin permiso = el pedido no es de esta sesión o no existe; otros fallos (red) no bloquean
        const sinAcceso = e.code === 'permission-denied';
        setEstado(!sinAcceso && Number(sessionStorage.getItem('pago_total')) > 0 ? 'listo' : 'noexiste');
      });
    return () => { cancelado = true; };
  }, [pedidoId, abiertos]);

  return { total: Number(total) > 0 ? total : null, estado };
}
