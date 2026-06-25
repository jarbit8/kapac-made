import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useIdioma } from '../context/LanguageContext';
import '../styles/PagoTarjeta.css';

const CULQI_PUBLIC_KEY = 'pk_live_9a20b52121a4528b';

export default function PagoTarjeta() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { t } = useIdioma();
  const [listo, setListo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [error, setError] = useState('');
  const total = sessionStorage.getItem('pago_total') || '0';
  const totalCentimos = Number(total) * 100; // Culqi usa centimos

  // Cargar script de Culqi — SOLO tarjeta habilitada
  useEffect(() => {
    const init = () => {
      window.Culqi.publicKey = CULQI_PUBLIC_KEY;
      window.Culqi.settings({
        title: 'Kapac Made',
        currency: 'PEN',
        description: `Pedido #${pedidoId.slice(0, 8)}`,
        amount: totalCentimos,
      });
      // Restringir el modal a SOLO tarjeta (sin Yape, sin agente, sin billetera)
      if (typeof window.Culqi.options === 'function') {
        window.Culqi.options({
          lang: 'es',
          modal: true,
          installments: true,
          paymentMethods: {
            tarjeta:    true,
            yape:       false,
            bancaMovil: false,
            agente:     false,
            billetera:  false,
            cuotealo:   false,
          },
        });
      }
      // Callback cuando Culqi devuelve token
      window.culqi = async () => {
        if (window.Culqi.token) {
          await cobrar(window.Culqi.token.id);
        } else if (window.Culqi.error) {
          setError(window.Culqi.error.user_message || 'Error al procesar la tarjeta. Intenta de nuevo.');
          setProcesando(false);
        }
      };
      setListo(true);
    };

    if (document.getElementById('culqi-script') && window.Culqi) {
      init();
      return;
    }
    const script = document.createElement('script');
    script.id = 'culqi-script';
    script.src = 'https://checkout.culqi.com/js/v4';
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        sessionStorage.removeItem('pago_total');
        navigate(`/confirmacion/${pedidoId}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.mensaje || 'Error al procesar el pago. Intenta de nuevo.');
      }
    } catch (e) {
      setError('No se pudo confirmar el pago. Si te cobraron, escríbenos al +51 997 050 752.');
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
    // Re-aplicar restricción SOLO tarjeta (por si quedó config de otra página)
    if (typeof window.Culqi.options === 'function') {
      window.Culqi.options({
        lang: 'es',
        modal: true,
        installments: true,
        paymentMethods: {
          tarjeta:    true,
          yape:       false,
          bancaMovil: false,
          agente:     false,
          billetera:  false,
          cuotealo:   false,
        },
      });
    }
    window.Culqi.open();
    setTimeout(() => setProcesando(false), 1000);
  };

  if (pagado) {
    return (
      <>
        <Header />
        <main className="pago-page">
          <div className="pago-confirmado">
            <div className="pago-check">💳✅</div>
            <h1>{t('pago.tarjeta.exito')}</h1>
            <p>{t('pago.tarjeta.exito_sub')}</p>
            <p className="pago-pedido-id">{t('conf.pedido')} <strong>#{pedidoId.slice(0, 8)}</strong></p>
            <button onClick={() => navigate('/pedidos')} className="pago-btn-pedidos">
              {t('conf.ver_pedidos')}
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
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">{t('steps.entrega')}</span></div>
          <div className="step-linea completada" />
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">{t('steps.pago')}</span></div>
          <div className="step-linea completada" />
          <div className="step activo"><span className="step-num">3</span><span className="step-label">{t('steps.confirmacion')}</span></div>
        </div>

        <h1>{t('pago.tarjeta.titulo')}</h1>
        <p className="tarjeta-sub">{t('pago.tarjeta.sub')} <strong>Culqi</strong> 🔒</p>

        <div className="tarjeta-card">
          <div className="tarjeta-monto">
            {t('pago.tarjeta.total')} <strong>S/{total}.00</strong>
          </div>

          <div className="tarjeta-marcas">
            <span className="marca visa">VISA</span>
            <span className="marca master">MC</span>
            <span className="marca amex">AMEX</span>
          </div>

          <div className="tarjeta-seguro">
            <span>🔒</span>
            <span>{t('pago.tarjeta.seguro')}</span>
          </div>

          {error && <p className="tarjeta-error">{error}</p>}

          <button
            className="tarjeta-btn-pagar"
            onClick={abrirCulqi}
            disabled={!listo || procesando}
          >
            {!listo ? t('pago.tarjeta.cargando') : procesando ? t('pago.tarjeta.procesando') : t('pago.tarjeta.boton')}
          </button>

          <p className="tarjeta-aviso">{t('pago.tarjeta.aviso')}</p>
        </div>

        <p className="pago-id-ref">{t('pago.referencia')} <code>#{pedidoId.slice(0, 8)}</code></p>
      </main>
      <Footer />
    </>
  );
}
