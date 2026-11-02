import { useState } from 'react';
import { obtenerTodosPedidos } from '../../firebase/pedidos';

export default function usePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtroPedidos, setFiltroPedidos] = useState('pendientes'); // 'pendientes' | 'completados' | 'cancelados'

  const cargarPedidos = async () => {
    setPedidos(await obtenerTodosPedidos());
  };

  // PagoEfectivo se confirma solo: solo el Yape con QR lo revisa el admin
  const pedidosVerificando = pedidos.filter(p => ['verificando_pago', 'verificando'].includes(p.estado) && p.metodoPago !== 'efectivo');

  return { pedidos, pedidosVerificando, filtroPedidos, setFiltroPedidos, cargarPedidos };
}
