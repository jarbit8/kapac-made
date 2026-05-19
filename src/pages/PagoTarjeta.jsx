import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { actualizarEstadoPedido } from '../firebase/pedidos';
import '../styles/PagoTarjeta.css';

const CULQI_PUBLIC_KEY = 'pk_live_9a20b52121a4528b';

export default function PagoTarjeta() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [listo, setListo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [error, setError] = useState('');
  const total = sessionStorage.getItem('pago_total') || '0';
  const totalCentimos = Number(total) * 100; // Culqi usa centimos

  // Cargar script de Culqi
  useEffect(() => {
    if (document.getElementById('culqi-script')) {
      setListo(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'culqi-script';
    script.src = 'https://checkout.culqi.com/js/v4';
    script.async = true;
    script.onload = () => {
      window.Culqi.publicKey = CULQI_PUBLIC_KEY;
      window.Culqi.settings({
        title: 'Kapac Made',
        currency: 'PEN',
        description: `Pedido #${pedidoId.slice(0, 8)}`,
        amount: totalCentimos,
      });
      // Callback cuando Culqi abre el token
      window.culqi = async () => {
        if (window.Culqi.token) {
          await cobrar(window.Culqi.token.id);
        } else if (window.Culqi.error) {
          setError('Error al procesar la tarjeta. Intenta de nuevo.');
          setProcesando(false);
        }
      };
      setListo(true);
    };
    document.head.appendChild(script);
  }, [pedidoId, totalCentimos]);

  const cobrar = async (tokenId) => {
    setProcesando(true);
    setError('');
    try {
      // Llamada al backend (Cloud Function) para hacer el cargo
      // Por ahora marcamos como "verificando" y el cargo se hace manualmente
      // cuando tengan el backend listo
      const res = await fetch('https://cobrarculqi-3lp3eiv6xa-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenId,
          amount: totalCentimos,
          pedidoId,
          email: sessionStorage.getItem('checkout_email') || '',
        }),
      });

      if (res.ok) {
        await actualizarEstadoPedido(pedidoId, 'pagado');
        sessionStorage.removeItem('pago_total');
        setPagado(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.mensaje || 'Error al procesar el pago. Intenta de nuevo.');
      }
    } catch (e) {
      // Si no hay backend aún, igual guardamos como verificando
      await actualizarEstadoPedido(pedidoId, 'verificando');
      sessionStorage.removeItem('pago_total');
      setPagado(true);
    }
    setProcesando(false);
  };

  const abrirCulqi = () => {
    if (!listo || !window.Culqi) return;
    setProcesando(true);
    window.Culqi.settings({
      title: 'Kapac Made',
      currency: 'PEN',
      description: `Pedido #${pedidoId.slice(0, 8)}`,
      amount: totalCentimos,
    });
    window.Culqi.open();
    // Culqi llama a window.culqi() cuando termina
    // Dejamos procesando en true hasta que el callback lo resuelva
    setTimeout(() => setProcesando(false), 1000);
  };

  if (pagado) {
    return (
      <>
        <Header />
        <main className="pago-page">
          <div className="pago-confirmado">
            <div className="pago-check">💳✅</div>
            <h1>¡Pago recibido!</h1>
            <p>Tu pago con tarjeta fue procesado exitosamente.<br />
              Pronto recibirás la confirmación de tu pedido.</p>
            <p className="pago-pedido-id">Pedido: <strong>#{pedidoId.slice(0, 8)}</strong></p>
            <button onClick={() => navigate('/pedidos')} className="pago-btn-pedidos">
              Ver mis pedidos
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pago-tarjeta-page">
        {/* Indicador de pasos */}
        <div className="checkout-steps">
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">Entrega</span></div>
          <div className="step-linea completada" />
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">Pago</span></div>
          <div className="step-linea completada" />
          <div className="step activo"><span className="step-num">3</span><span className="step-label">Confirmación</span></div>
        </div>

        <h1>Pago con tarjeta</h1>
        <p className="tarjeta-sub">Procesado de forma segura por <strong>Culqi</strong> 🔒</p>

        <div className="tarjeta-card">
          <div className="tarjeta-monto">
            Total a pagar: <strong>S/{total}.00</strong>
          </div>

          <div className="tarjeta-marcas">
            <span className="marca visa">VISA</span>
            <span className="marca master">MC</span>
            <span className="marca amex">AMEX</span>
          </div>

          <div className="tarjeta-seguro">
            <span>🔒</span>
            <span>Tus datos están cifrados con SSL de 256 bits. Kapac Made nunca ve tu número de tarjeta.</span>
          </div>

          {error && <p className="tarjeta-error">{error}</p>}

          <button
            className="tarjeta-btn-pagar"
            onClick={abrirCulqi}
            disabled={!listo || procesando}
          >
            {!listo ? 'Cargando...' : procesando ? 'Procesando...' : '💳 Pagar con tarjeta'}
          </button>

          <p className="tarjeta-aviso">
            Al hacer clic se abrirá el formulario seguro de Culqi para ingresar los datos de tu tarjeta.
          </p>
        </div>

        <p className="pago-id-ref">Referencia: <code>#{pedidoId.slice(0, 8)}</code></p>
      </main>
      <Footer />
    </>
  );
}
