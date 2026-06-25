import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { actualizarEstadoPedido } from '../firebase/pedidos';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import qrImg from '../assets/images/qr.jpeg';
import '../styles/Pago.css';

const CREAR_ORDEN_URL = 'https://us-central1-kapac-made.cloudfunctions.net/crearOrdenCulqi';

export default function Pago() {
  const { metodo, pedidoId } = useParams(); // /pago/:metodo/:pedidoId
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [total, setTotal] = useState(null);
  const [codigoCIP, setCodigoCIP] = useState(null);
  const [vencimientoCIP, setVencimientoCIP] = useState(null);
  const [errorCIP, setErrorCIP] = useState('');
  const [copiadoCIP, setCopiadoCIP] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem('pago_total');
    if (t) setTotal(t);
  }, []);

  // Generar código PagoEfectivo automáticamente al entrar
  useEffect(() => {
    if (metodo !== 'efectivo' || !total || !usuario || codigoCIP) return;
    const generar = async () => {
      setCargando(true);
      setErrorCIP('');
      try {
        const resp = await fetch(CREAR_ORDEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(total) * 100, // céntimos
            pedidoId,
            email: usuario.email,
            nombre: usuario.displayName || '',
          }),
        });
        const data = await resp.json();
        if (data.ok) {
          setCodigoCIP(data.codigoPago);
          setVencimientoCIP(data.expiration);
        } else {
          setErrorCIP(data.mensaje || 'No se pudo generar el código.');
        }
      } catch (e) {
        console.error(e);
        setErrorCIP('Error de conexión. Intenta de nuevo.');
      }
      setCargando(false);
    };
    generar();
  }, [metodo, total, usuario, codigoCIP, pedidoId]);

  const copiarCIP = () => {
    if (!codigoCIP) return;
    navigator.clipboard.writeText(codigoCIP);
    setCopiadoCIP(true);
    setTimeout(() => setCopiadoCIP(false), 2500);
  };

  const yaGenereCIP = async () => {
    setCargando(true);
    try {
      await actualizarEstadoPedido(pedidoId, 'verificando_pago');
      sessionStorage.removeItem('pago_total');
      navigate(`/confirmacion/${pedidoId}`);
    } catch (e) {
      console.error(e);
      alert('Hubo un error. Intenta de nuevo.');
    }
    setCargando(false);
  };

  const yaPague = async () => {
    setCargando(true);
    try {
      await actualizarEstadoPedido(pedidoId, 'verificando_pago');
      sessionStorage.removeItem('pago_total');
      navigate(`/confirmacion/${pedidoId}`);
    } catch (e) {
      console.error(e);
      alert('Hubo un error. Intenta de nuevo.');
    }
    setCargando(false);
  };

  // Pantalla de confirmación (igual para ambos métodos)
  if (enviado) {
    return (
      <>
        <Header />
        <main className="pago-page">
          <div className="pago-confirmado">
            <div className="pago-check">✅</div>
            <h1>{t('conf.titulo')}</h1>
            <p>
              {idioma === 'en'
                ? 'Your payment is being verified by the Kapac Made team.'
                : 'Tu pago está siendo verificado por el equipo de Kapac Made.'}<br />
              {idioma === 'en'
                ? 'We\'ll notify you once it\'s confirmed.'
                : 'Te avisaremos cuando sea confirmado.'}
            </p>
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
      <main className="pago-page">
        {/* Indicador de pasos */}
        <div className="checkout-steps">
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">{t('steps.entrega')}</span></div>
          <div className="step-linea completada" />
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">{t('steps.pago')}</span></div>
          <div className="step-linea completada" />
          <div className="step activo"><span className="step-num">3</span><span className="step-label">{t('steps.confirmacion')}</span></div>
        </div>

        {/* ===== YAPE — solo QR (rápido, sin código) ===== */}
        {metodo === 'yape' && (
          <>
            <h1>{t('pago.yape.titulo')}</h1>
            <p className="pago-sub">{t('pago.yape.sub')}</p>
            <div className="pago-card">
              {total && <div className="pago-monto">{t('pago.yape.monto')} <strong className="yape-color">S/{total}.00</strong></div>}
              <img src={qrImg} alt="QR Yape Kapac Made" className="pago-qr" />
              <div className="pago-pasos">
                {[
                  t('pago.yape.paso1'),
                  t('pago.yape.paso2'),
                  t('pago.yape.paso3'),
                  t('pago.yape.paso4'),
                ].map((p, i) => (
                  <div className="pago-paso" key={i}>
                    <span className="paso-num yape-bg">{i + 1}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <button className="pago-btn-pague yape-btn" onClick={yaPague} disabled={cargando}>
                {cargando ? t('pago.yape.enviando') : t('pago.yape.boton')}
              </button>
              <p className="pago-aviso">{t('pago.yape.aviso')}</p>
            </div>
          </>
        )}

        {/* ===== PAGO EFECTIVO ===== */}
        {metodo === 'efectivo' && (
          <>
            <h1>{t('pago.ef.titulo')}</h1>
            <p className="pago-sub">{t('pago.ef.sub')}</p>
            <div className="pago-card">
              {total && <div className="pago-monto">{t('pago.yape.monto')} <strong className="efectivo-color">S/{total}.00</strong></div>}

              {cargando && !codigoCIP && (
                <p style={{ padding: '40px 0', color: '#666' }}>{t('pago.ef.generando')}</p>
              )}

              {errorCIP && (
                <div className="codigo-cip-error">
                  ⚠️ {errorCIP}
                  <br />
                  <small>{t('pago.ef.error_falla')}</small>
                </div>
              )}

              {codigoCIP && (
                <>
                  <div className="codigo-cip-box">
                    <p className="codigo-cip-label">{t('pago.ef.codigo_label')}</p>
                    <div className="codigo-cip-numero">{codigoCIP}</div>
                    <button className="codigo-cip-copiar" onClick={copiarCIP}>
                      {copiadoCIP ? t('pago.ef.copiado') : t('pago.ef.copiar')}
                    </button>
                    {vencimientoCIP && (
                      <p className="codigo-cip-vence">
                        {t('pago.ef.vence')} {new Date(vencimientoCIP * 1000).toLocaleString(idioma === 'en' ? 'en-US' : 'es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>

                  <div className="pago-pasos">
                    {[
                      t('pago.ef.paso1'),
                      t('pago.ef.paso2'),
                      t('pago.ef.paso3'),
                      t('pago.ef.paso4'),
                      t('pago.ef.paso5'),
                    ].map((p, i) => (
                      <div className="pago-paso" key={i}>
                        <span className="paso-num efectivo-bg">{i + 1}</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>

                  <button className="pago-btn-pague efectivo-btn" onClick={yaGenereCIP} disabled={cargando}>
                    {cargando ? t('pago.yape.enviando') : t('pago.ef.boton')}
                  </button>
                  <p className="pago-aviso">{t('pago.ef.aviso')}</p>
                </>
              )}
            </div>
          </>
        )}

        <p className="pago-id-ref">{t('pago.referencia')} <code>#{pedidoId.slice(0, 8)}</code></p>
      </main>
      <Footer />
    </>
  );
}
