import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { crearPedido } from '../firebase/pedidos';
import { descontarStock } from '../firebase/productos';
import { loginAnonimo } from '../firebase/auth';
import '../styles/MetodoPago.css';

// Iconos SVG — badges con look real de las marcas
const IconoYape = () => (
  <svg width="72" height="44" viewBox="0 0 72 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="72" height="44" rx="9" fill="#742284"/>
    <text x="36" y="29" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="800" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="-0.3">Yape</text>
  </svg>
);

const IconoTarjeta = () => (
  <svg width="72" height="44" viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Visa + Mastercard combo */}
    <rect width="64" height="32" rx="7" fill="#fff" stroke="#e3e3e3"/>
    <text x="20" y="14" textAnchor="middle" fill="#1A1F71" fontSize="8" fontWeight="900" fontStyle="italic" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="0.5">VISA</text>
    <circle cx="40" cy="20" r="6" fill="#EB001B"/>
    <circle cx="48" cy="20" r="6" fill="#F79E1B" fillOpacity="0.92"/>
    <path d="M44 15.5a6 6 0 0 1 0 9 6 6 0 0 1 0-9z" fill="#FF5F00"/>
  </svg>
);


const IconoEfectivo = () => (
  <svg width="72" height="44" viewBox="0 0 72 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="72" height="44" rx="9" fill="#fff" stroke="#e3e3e3"/>
    <text x="36" y="26" textAnchor="middle" fontSize="11.5" fontWeight="800" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="-0.2">
      <tspan fill="#0a1f8f">pago</tspan><tspan fill="#EC008C">efectivo</tspan>
    </text>
  </svg>
);

export default function MetodoPago() {
  const navigate = useNavigate();
  const { items, vaciar, totalPrecio } = useCart();
  const { usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const [metodo, setMetodo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const total = sessionStorage.getItem('checkout_total') || totalPrecio;

  const confirmar = async () => {
    if (!metodo) {
      setError(t('metodo.seleccionar'));
      return;
    }

    setProcesando(true);
    setError('');

    try {
      const envioRaw = sessionStorage.getItem('checkout_envio');
      const envio = envioRaw ? JSON.parse(envioRaw) : null;
      const guestEmail = sessionStorage.getItem('checkout_email') || '';

      // Si no hay sesión, hacer login anónimo para poder escribir en Firestore
      let uid, email, nombre;
      if (usuario) {
        uid    = usuario.uid;
        email  = usuario.email;
        nombre = usuario.displayName || '';
      } else {
        const cred = await loginAnonimo();
        uid    = cred.user.uid;
        email  = guestEmail;
        nombre = envio?.nombre || '';
      }

      const pedidoId = await crearPedido({
        usuarioId: uid,
        email,
        nombre,
        items,
        total: Number(total),
        envio,
        metodoPago: metodo,
        esInvitado: !usuario,
      });

      // Descontar el stock de cada producto comprado
      await Promise.all(items.map((i) => descontarStock(i.id, i.cantidad)));

      vaciar();
      sessionStorage.removeItem('checkout_items');
      sessionStorage.setItem('pago_total', total);

      if (metodo === 'yape' || metodo === 'yape-codigo') {
        navigate(`/pago/${metodo}/${pedidoId}`);
      } else if (metodo === 'tarjeta') {
        navigate(`/pago/tarjeta/${pedidoId}`);
      } else if (metodo === 'efectivo') {
        navigate(`/pago/efectivo/${pedidoId}`);
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
            <span className="step-label">{t('steps.entrega')}</span>
          </div>
          <div className="step-linea completada" />
          <div className="step activo">
            <span className="step-num">2</span>
            <span className="step-label">{t('steps.pago')}</span>
          </div>
          <div className="step-linea" />
          <div className="step">
            <span className="step-num">3</span>
            <span className="step-label">{t('steps.confirmacion')}</span>
          </div>
        </div>

        <h1>{t('metodo.titulo')}</h1>
        <p className="metodo-sub">{t('metodo.total')} <strong>S/{total}.00</strong></p>

        <div className="metodo-opciones">
          {/* Yape — con QR (rápido) */}
          <button
            className={`metodo-opcion ${metodo === 'yape' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('yape')}
          >
            <div className="metodo-icono"><IconoYape /></div>
            <div className="metodo-info">
              <strong>{t('metodo.yape')}</strong>
              <span>{t('metodo.yape_desc')}</span>
            </div>
            <div className={`opcion-radio ${metodo === 'yape' ? 'on' : ''}`} />
          </button>

          {/* Yape — con código de aprobación */}
          <button
            className={`metodo-opcion ${metodo === 'yape-codigo' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('yape-codigo')}
          >
            <div className="metodo-icono"><IconoYape /></div>
            <div className="metodo-info">
              <strong>{t('metodo.yape_codigo')}</strong>
              <span>{t('metodo.yape_codigo_desc')}</span>
            </div>
            <div className={`opcion-radio ${metodo === 'yape-codigo' ? 'on' : ''}`} />
          </button>

          {/* Tarjeta */}
          <button
            className={`metodo-opcion ${metodo === 'tarjeta' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('tarjeta')}
          >
            <div className="metodo-icono tarjeta-icono"><IconoTarjeta /></div>
            <div className="metodo-info">
              <strong>{t('metodo.tarjeta')}</strong>
              <span>{t('metodo.tarjeta_desc')}</span>
            </div>
            <div className={`opcion-radio ${metodo === 'tarjeta' ? 'on' : ''}`} />
          </button>

          {/* PagoEfectivo */}
          <button
            className={`metodo-opcion ${metodo === 'efectivo' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('efectivo')}
          >
            <div className="metodo-icono"><IconoEfectivo /></div>
            <div className="metodo-info">
              <strong>{t('metodo.efectivo')}</strong>
              <span>{t('metodo.efectivo_desc')}</span>
            </div>
            <div className={`opcion-radio ${metodo === 'efectivo' ? 'on' : ''}`} />
          </button>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        <div className="metodo-acciones">
          <button className="metodo-btn-volver" onClick={() => navigate('/checkout')}>
            {t('metodo.volver')}
          </button>
          <button className="metodo-btn-confirmar" onClick={confirmar} disabled={procesando}>
            {procesando ? t('metodo.procesando') : t('metodo.confirmar')}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
