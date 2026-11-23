import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePedidoPago from '../../hooks/usePedidoPago';
import { actualizarEstadoPedido } from '../../firebase/pedidos';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useIdioma } from '../../context/LanguageContext';
import { correoCompra, nombreCompra, marcarReemplazado } from '../../utils/compra';

const CREAR_ORDEN_URL = 'https://us-central1-kapac-made.cloudfunctions.net/crearOrdenCulqi';

export default function usePago(metodo, pedidoId) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { restaurar } = useCart();
  const { idioma } = useIdioma();
  const [cargando, setCargando] = useState(false);
  const { total, estado } = usePedidoPago(pedidoId, metodo === 'efectivo' ? 'procesando_pago,verificando_pago' : 'procesando_pago');
  const [codigoCIP, setCodigoCIP] = useState(null);
  const [vencimientoCIP, setVencimientoCIP] = useState(null);
  const [qrCIP, setQrCIP] = useState('');
  const [urlPe, setUrlPe] = useState('');
  const [errorCIP, setErrorCIP] = useState(null);
  const [copiadoCIP, setCopiadoCIP] = useState(false);
  const [error, setError] = useState('');

  // Generar código PagoEfectivo automáticamente al entrar
  const generandoCIP = useRef(false);
  useEffect(() => {
    if (metodo !== 'efectivo' || estado !== 'listo' || !total || !usuario || codigoCIP) return;
    if (generandoCIP.current) return;
    generandoCIP.current = true;
    const generar = async (reintento) => {
      setCargando(true);
      setErrorCIP(null);
      try {
        const resp = await fetch(CREAR_ORDEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(Number(total) * 100), // céntimos
            pedidoId,
            email: correoCompra(usuario),
            nombre: nombreCompra(usuario),
          }),
        });
        const data = await resp.json();
        if (data.ok) {
          setCodigoCIP(data.codigoPago);
          setVencimientoCIP(data.expiration);
          setQrCIP(data.qr || '');
          setUrlPe(data.urlPe || '');
        } else if (resp.status === 429 && !reintento) {
          setTimeout(() => generar(true), 6000);
          return;
        } else {
          setErrorCIP({ mensaje: data.mensaje });
        }
      } catch (e) {
        console.error(e);
        setErrorCIP({ conexion: true });
      }
      setCargando(false);
      generandoCIP.current = false;
    };
    generar(false);
  }, [metodo, estado, total, usuario, codigoCIP, pedidoId]);

  const copiarCIP = () => {
    if (!codigoCIP) return;
    navigator.clipboard.writeText(codigoCIP);
    setCopiadoCIP(true);
    setTimeout(() => setCopiadoCIP(false), 2500);
  };

  // "Ya pagué" (Yape) y "Ya generé el código" (PagoEfectivo): ambos pasan el pedido a verificación
  const registrarPago = async () => {
    setCargando(true);
    setError('');
    try {
      await actualizarEstadoPedido(pedidoId, 'verificando_pago');
      sessionStorage.removeItem('pago_total');
      navigate(`/confirmacion/${pedidoId}`);
    } catch (e) {
      console.error(e);
      setError(idioma === 'en' ? "We couldn't register your payment. Please try again." : 'No pudimos registrar tu pago. Intenta de nuevo.');
    }
    setCargando(false);
  };

  const cambiarMetodo = () => {
    marcarReemplazado(pedidoId);
    restaurar();
    navigate('/metodo-pago');
  };

  return {
    total, estado, cargando, error, codigoCIP, vencimientoCIP, qrCIP, urlPe, errorCIP, copiadoCIP,
    copiarCIP, registrarPago, cambiarMetodo,
  };
}
