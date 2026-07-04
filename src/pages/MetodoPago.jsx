import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ET from '../components/ET';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { crearPedido } from '../firebase/pedidos';
import { descontarStock } from '../firebase/productos';
import { loginAnonimo } from '../firebase/auth';
import '../styles/MetodoPago.css';
import imgYape from '../assets/images/yape.avif';
import imgTarjeta from '../assets/images/tarjeta.jpg';
import imgEfectivo from '../assets/images/pago efectivo.avif';

const logoStyle = { width: 72, height: 44, objectFit: 'contain', borderRadius: 8 };

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
            <span className="step-label"><ET k="steps.entrega" /></span>
          </div>
          <div className="step-linea completada" />
          <div className="step activo">
            <span className="step-num">2</span>
            <span className="step-label"><ET k="steps.pago" /></span>
          </div>
          <div className="step-linea" />
          <div className="step">
            <span className="step-num">3</span>
            <span className="step-label"><ET k="steps.confirmacion" /></span>
          </div>
        </div>

        <h1><ET k="metodo.titulo" /></h1>
        <p className="metodo-sub"><ET k="metodo.total" /> <strong>S/{total}.00</strong></p>

        <div className="metodo-opciones">
          {/* Yape — con QR (rápido) */}
          <button
            className={`metodo-opcion ${metodo === 'yape' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('yape')}
          >
            <div className="metodo-icono"><img src={imgYape} alt="Yape" style={logoStyle} /></div>
            <div className="metodo-info">
              <strong><ET k="metodo.yape" /></strong>
              <span><ET k="metodo.yape_desc" /></span>
            </div>
            <div className={`opcion-radio ${metodo === 'yape' ? 'on' : ''}`} />
          </button>

          {/* Yape — con código de aprobación */}
          <button
            className={`metodo-opcion ${metodo === 'yape-codigo' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('yape-codigo')}
          >
            <div className="metodo-icono"><img src={imgYape} alt="Yape" style={logoStyle} /></div>
            <div className="metodo-info">
              <strong><ET k="metodo.yape_codigo" /></strong>
              <span><ET k="metodo.yape_codigo_desc" /></span>
            </div>
            <div className={`opcion-radio ${metodo === 'yape-codigo' ? 'on' : ''}`} />
          </button>

          {/* Tarjeta */}
          <button
            className={`metodo-opcion ${metodo === 'tarjeta' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('tarjeta')}
          >
            <div className="metodo-icono"><img src={imgTarjeta} alt="Tarjeta" style={logoStyle} /></div>
            <div className="metodo-info">
              <strong><ET k="metodo.tarjeta" /></strong>
              <span><ET k="metodo.tarjeta_desc" /></span>
            </div>
            <div className={`opcion-radio ${metodo === 'tarjeta' ? 'on' : ''}`} />
          </button>

          {/* PagoEfectivo */}
          <button
            className={`metodo-opcion ${metodo === 'efectivo' ? 'seleccionada' : ''}`}
            onClick={() => setMetodo('efectivo')}
          >
            <div className="metodo-icono"><img src={imgEfectivo} alt="PagoEfectivo" style={logoStyle} /></div>
            <div className="metodo-info">
              <strong><ET k="metodo.efectivo" /></strong>
              <span><ET k="metodo.efectivo_desc" /></span>
            </div>
            <div className={`opcion-radio ${metodo === 'efectivo' ? 'on' : ''}`} />
          </button>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        <div className="metodo-acciones">
          <button className="metodo-btn-volver" onClick={() => navigate('/checkout')}>
            <ET k="metodo.volver" sinColor />
          </button>
          <button className="metodo-btn-confirmar" onClick={confirmar} disabled={procesando}>
            {procesando ? <ET k="metodo.procesando" sinColor /> : <ET k="metodo.confirmar" sinColor />}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
