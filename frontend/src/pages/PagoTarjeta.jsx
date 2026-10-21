import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import { useIdioma } from '../context/LanguageContext';
import imgTarjeta from '../assets/images/tarjeta.jpg';
import '../styles/PagoTarjeta.css';

const CULQI_PUBLIC_KEY = 'pk_live_9a20b52121a4528b';

export default function PagoTarjeta() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { t } = useIdioma();
  const [listo, setListo] = useState(false);
  const [procesando, setProcesando] = useState(false);
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

  return (
    <>
      <Header />
      <main className="pago-tarjeta-page">
        <PasosCompra actual={2} />

        <button className="pago-volver" onClick={() => navigate('/metodo-pago')}>
          <Icono nombre="flechaIzq" tam={16} /> {t('pago.volver')}
        </button>

        <h1>{t('pago.tarjeta.titulo')}</h1>
        <p className="tarjeta-sub"><Icono nombre="escudo" tam={17} /> {t('pago.tarjeta.sub')} <strong>Culqi</strong></p>

        <div className="tarjeta-card">
          <div className="tarjeta-monto">
            <span>{t('pago.tarjeta.total')}</span>
            <strong>S/{total}.00</strong>
          </div>

          <div className="tarjeta-marcas">
            <img src={imgTarjeta} alt="Visa, Mastercard, American Express" />
          </div>

          <div className="tarjeta-seguro">
            <Icono nombre="candado" tam={17} />
            <span>{t('pago.tarjeta.seguro')}</span>
          </div>

          {error && <p className="tarjeta-error"><Icono nombre="alerta" tam={16} /> {error}</p>}

          <button className="tarjeta-btn-pagar" onClick={abrirCulqi} disabled={!listo || procesando}>
            {!listo ? t('pago.tarjeta.cargando') : procesando ? t('pago.tarjeta.procesando')
              : <><Icono nombre="candado" tam={17} /> {t('pago.tarjeta.boton')} S/{total}.00</>}
          </button>

          <p className="tarjeta-aviso">{t('pago.tarjeta.aviso')}</p>
        </div>

        <p className="pago-id-ref">{t('pago.referencia')} <code>#{pedidoId.slice(0, 8).toUpperCase()}</code></p>
      </main>
      <Footer />
    </>
  );
}
