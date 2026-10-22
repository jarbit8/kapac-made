import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import PedidoNoDisponible from '../components/PedidoNoDisponible';
import usePedidoPago from '../hooks/usePedidoPago';
import { useIdioma } from '../context/LanguageContext';
import { mensajeServidor } from '../i18n/mensajes';
import imgYape from '../assets/images/yape.avif';
import '../styles/PagoTarjeta.css';

const CULQI_PUBLIC_KEY = 'pk_live_9a20b52121a4528b';

export default function PagoYapeCulqi() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { t, idioma } = useIdioma();
  const [listo, setListo] = useState(false);
  const [fallaScript, setFallaScript] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const { total, estado } = usePedidoPago(pedidoId);
  const totalCentimos = Math.round(Number(total) * 100); // Culqi usa céntimos

  // Cargar script de Culqi (Checkout v4)
  useEffect(() => {
    const init = () => {
      window.Culqi.publicKey = CULQI_PUBLIC_KEY;
      setFallaScript(false);
      setListo(true);
    };

    if (window.Culqi) {
      init();
      return;
    }
    const script = document.createElement('script');
    script.id = 'culqi-script';
    script.src = 'https://checkout.culqi.com/js/v4';
    script.async = true;
    script.onload = init;
    script.onerror = () => setFallaScript(true);
    document.head.appendChild(script);
    const espera = setTimeout(() => { if (!window.Culqi) setFallaScript(true); }, 10000);
    return () => clearTimeout(espera);
  }, []);

  const cobrar = async (tokenId) => {
    setProcesando(true);
    setError('');
    try {
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
        setError(mensajeServidor(data.mensaje, idioma, t('pago.err_cobro')));
      }
    } catch (e) {
      console.error(e);
      setError(t('pago.err_confirmar'));
    }
    setProcesando(false);
  };

  const abrirCulqi = () => {
    if (!listo || !window.Culqi || estado !== 'listo' || !totalCentimos) return;
    setProcesando(true);
    window.Culqi.settings({
      title: 'Kapac Made',
      currency: 'PEN',
      description: `Pedido #${pedidoId.slice(0, 8)}`,
      amount: totalCentimos,
    });
    // Solo Yape activado en el modal de Culqi
    if (typeof window.Culqi.options === 'function') {
      window.Culqi.options({
        lang: idioma,
        modal: true,
        installments: false,
        paymentMethods: {
          tarjeta:    false,
          yape:       true,
          bancaMovil: false,
          agente:     false,
          billetera:  false,
          cuotealo:   false,
        },
      });
    }
    window.culqi = async () => {
      if (window.Culqi.token) {
        await cobrar(window.Culqi.token.id);
      } else if (window.Culqi.error) {
        console.error('Culqi error:', window.Culqi.error);
        setError(window.Culqi.error.user_message || t('pago.err_yape'));
        setProcesando(false);
      }
    };
    window.Culqi.open();
    setTimeout(() => setProcesando(false), 1000);
  };

  const disponible = estado === 'listo' || estado === 'cargando';

  return (
    <>
      <Header />
      <main className="pago-tarjeta-page">
        <PasosCompra actual={2} />

        <button className="pago-volver" onClick={() => navigate('/metodo-pago')}>
          <Icono nombre="flechaIzq" tam={16} /> {t('pago.volver')}
        </button>

        <h1>{t('pago.yapeculqi.titulo')}</h1>
        <p className="tarjeta-sub"><Icono nombre="escudo" tam={17} /> {t('pago.tarjeta.sub')} <strong>Culqi</strong></p>

        <div className="tarjeta-card">
          {!disponible ? (
            <PedidoNoDisponible estado={estado} pedidoId={pedidoId} claseError="tarjeta-error" claseBoton="tarjeta-btn-pagar" />
          ) : (
            <>
              {total && (
                <div className="tarjeta-monto">
                  <span>{t('pago.tarjeta.total')}</span>
                  <strong>S/{total}.00</strong>
                </div>
              )}

              <div className="tarjeta-marcas">
                <img src={imgYape} alt="Yape" />
              </div>

              <div className="tarjeta-seguro">
                <Icono nombre="candado" tam={17} />
                <span>{t('pago.yapeculqi.seguro')}</span>
              </div>

              {(error || fallaScript) && (
                <p className="tarjeta-error"><Icono nombre="alerta" tam={16} /> {error || t('pago.culqi_falla')}</p>
              )}

              {fallaScript && !listo ? (
                <button className="tarjeta-btn-pagar" onClick={() => window.location.reload()}>{t('pago.reintentar')}</button>
              ) : (
                <button className="tarjeta-btn-pagar" onClick={abrirCulqi} disabled={!listo || estado !== 'listo' || procesando}>
                  {!listo || estado !== 'listo' ? t('pago.tarjeta.cargando') : procesando ? t('pago.tarjeta.procesando')
                    : <><Icono nombre="candado" tam={17} /> {t('pago.yapeculqi.boton')} S/{total}.00</>}
                </button>
              )}

              <p className="tarjeta-aviso">{t('pago.yapeculqi.aviso')}</p>
            </>
          )}
        </div>

        <p className="pago-id-ref">{t('pago.referencia')} <code>#{pedidoId.slice(0, 8).toUpperCase()}</code></p>
      </main>
      <Footer />
    </>
  );
}
