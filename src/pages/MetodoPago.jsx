import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { crearPedido } from '../firebase/pedidos';
import '../styles/MetodoPago.css';

// Iconos SVG
const IconoBTC = () => (
  <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="32" fill="#F7931A"/>
    <path d="M46.1 27.8c.6-4.2-2.6-6.4-7-7.9l1.4-5.7-3.5-.9-1.4 5.5-2.8-.7 1.4-5.5-3.5-.9-1.4 5.7c-.9-.2-1.8-.4-2.7-.7l-4.8-1.2-.9 3.7s2.6.6 2.5.6c1.4.3 1.6 1.2 1.6 1.9l-3.9 15.5c-.2.4-.6 1-1.5.8.03.04-2.5-.6-2.5-.6l-1.7 4 4.5 1.1 2.5.6-1.5 5.9 3.5.9 1.4-5.7 2.8.7-1.4 5.7 3.5.9 1.4-5.9c5.9 1.1 10.3.7 12.2-4.7 1.5-4.3-.07-6.8-3.2-8.4 2.3-.5 4-2 4.5-5.1zm-8 11.2c-1.07 4.3-8.3 2-10.6 1.4l1.9-7.5c2.4.6 9.9 1.8 8.7 6.1zm1.07-11.3c-1 3.9-7 1.9-9 1.4l1.7-6.8c2 .5 8.3 1.4 7.3 5.4z" fill="white"/>
  </svg>
);

const IconoTarjeta = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="3"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
    <line x1="6" y1="15" x2="10" y2="15"/>
    <line x1="13" y1="15" x2="17" y2="15"/>
  </svg>
);

const IconoYape = () => (
  <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="32" fill="#6B0EA0"/>
    <text x="32" y="40" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="Arial">Y</text>
  </svg>
);

export default function MetodoPago() {
  const navigate = useNavigate();
  const { items, vaciar, totalPrecio } = useCart();
  const { usuario } = useAuth();
  const [metodo, setMetodo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const total = sessionStorage.getItem('checkout_total') || totalPrecio;

  const confirmar = async () => {
    if (!metodo) {
      setError('Por favor selecciona un método de pago.');
      return;
    }
    if (metodo === 'tarjeta') {
      setError('Pago con tarjeta próximamente. Elige otro método por ahora.');
      return;
    }

    setProcesando(true);
    setError('');

    try {
      const envioRaw = sessionStorage.getItem('checkout_envio');
      const envio = envioRaw ? JSON.parse(envioRaw) : null;

      const pedidoId = await crearPedido({
        usuarioId: usuario.uid,
        email: usuario.email,
        items,
        total: Number(total),
        envio,
        metodoPago: metodo,
      });

      vaciar();
      sessionStorage.removeItem('checkout_items');
      sessionStorage.setItem('pago_total', total);

      if (metodo === 'yape') {
        navigate(`/pago/yape/${pedidoId}`);
      } else if (metodo === 'bitcoin') {
        navigate(`/pago/btc/${pedidoId}`);
      }
    } catch (e) {
      console.error(e);
      setError('Hubo un error. Intenta de nuevo.');
    }

    setProcesando(false);
  };

  return (
    <>
      <Header />
      <main className="metodo-page">
        {/* Indicador de pasos */}
        <div className="checkout-steps">
          <div className="step completado">
            <span className="step-num">✓</span>
            <span className="step-label">Entrega</span>
          </div>
          <div className="step-linea completada" />
          <div className="step activo">
            <span className="step-num">2</span>
            <span className="step-label">Pago</span>
          </div>
          <div className="step-linea" />
          <div className="step">
            <span className="step-num">3</span>
            <span className="step-label">Confirmación</span>
          </div>
        </div>

        <h1>Método de pago</h1>
        <p className="metodo-sub">Total a pagar: <strong>S/{total}.00</strong></p>

        <div className="metodo-opciones">
          {/* Yape */}
          <button
            className={`metodo-opcion ${metodo === 'yape' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('yape')}
          >
            <div className="metodo-icono"><IconoYape /></div>
            <div className="metodo-info">
              <strong>Yape</strong>
              <span>Escanea el QR y yapea al instante</span>
            </div>
            <div className={`opcion-radio ${metodo === 'yape' ? 'on' : ''}`} />
          </button>

          {/* Bitcoin */}
          <button
            className={`metodo-opcion ${metodo === 'bitcoin' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('bitcoin')}
          >
            <div className="metodo-icono"><IconoBTC /></div>
            <div className="metodo-info">
              <strong>Bitcoin</strong>
              <span>Paga con BTC · seguro y descentralizado</span>
            </div>
            <div className={`opcion-radio ${metodo === 'bitcoin' ? 'on' : ''}`} />
          </button>

          {/* Tarjeta */}
          <button
            className={`metodo-opcion proximamente ${metodo === 'tarjeta' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('tarjeta')}
          >
            <div className="metodo-icono tarjeta-icono"><IconoTarjeta /></div>
            <div className="metodo-info">
              <strong>Tarjeta de crédito / débito</strong>
              <span>Visa, Mastercard · próximamente</span>
            </div>
            <span className="prox-badge">Próximamente</span>
          </button>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        <div className="metodo-acciones">
          <button className="metodo-btn-volver" onClick={() => navigate('/checkout')}>
            ← Volver
          </button>
          <button className="metodo-btn-confirmar" onClick={confirmar} disabled={procesando}>
            {procesando ? 'Procesando...' : 'Confirmar y pagar →'}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
