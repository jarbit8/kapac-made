import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ET from '../components/ET';
import Editable from '../components/Editable';
import { actualizarEstadoPedido } from '../firebase/pedidos';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import qrImg from '../assets/images/qr.jpeg';
import imgYape from '../assets/images/yape.avif';
import imgEfectivo from '../assets/images/pago efectivo.avif';
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
  const [qrCIP, setQrCIP] = useState('');
  const [urlPe, setUrlPe] = useState('');
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
          setQrCIP(data.qr || '');
          setUrlPe(data.urlPe || '');
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
            <h1><ET k="conf.titulo" /></h1>
            <p>
              <Editable id="pago_verificando_1" as="span">{idioma === 'en'
                ? 'Your payment is being verified by the Kapac Made team.'
                : 'Tu pago está siendo verificado por el equipo de Kapac Made.'}</Editable><br />
              <Editable id="pago_verificando_2" as="span">{idioma === 'en'
                ? 'We\'ll notify you once it\'s confirmed.'
                : 'Te avisaremos cuando sea confirmado.'}</Editable>
            </p>
            <p className="pago-pedido-id"><ET k="conf.pedido" /> <strong>#{pedidoId.slice(0, 8)}</strong></p>
            <button onClick={() => navigate('/pedidos')} className="pago-btn-pedidos">
              <ET k="conf.ver_pedidos" sinColor />
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
          <div className="step completado"><span className="step-num">✓</span><span className="step-label"><ET k="steps.entrega" /></span></div>
          <div className="step-linea completada" />
          <div className="step completado"><span className="step-num">✓</span><span className="step-label"><ET k="steps.pago" /></span></div>
          <div className="step-linea completada" />
          <div className="step activo"><span className="step-num">3</span><span className="step-label"><ET k="steps.confirmacion" /></span></div>
        </div>

        {/* ===== YAPE — solo QR (rápido, sin código) ===== */}
        {metodo === 'yape' && (
          <>
            <div style={{ textAlign: 'left' }}>
              <button className="pago-volver" onClick={() => navigate('/metodo-pago')}>
                <Editable id="pago_volver" as="span" sinColor>{idioma === 'en' ? '← Back' : '← Volver'}</Editable>
              </button>
            </div>
            <h1><ET k="pago.yape.titulo" /></h1>
            <p className="pago-sub"><ET k="pago.yape.sub" /></p>
            <div className="pago-card">
              {total && <div className="pago-monto"><ET k="pago.yape.monto" /> <strong className="yape-color">S/{total}.00</strong></div>}
              <img src={imgYape} alt="Yape" style={{ height: 48, objectFit: 'contain', marginBottom: 16, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
              <img src={qrImg} alt="QR Yape Kapac Made" className="pago-qr" />
              <div className="pago-pasos">
                {['pago.yape.paso1', 'pago.yape.paso2', 'pago.yape.paso3', 'pago.yape.paso4'].map((k, i) => (
                  <div className="pago-paso" key={i}>
                    <span className="paso-num yape-bg">{i + 1}</span>
                    <span><ET k={k} /></span>
                  </div>
                ))}
              </div>
              <button className="pago-btn-pague yape-btn" onClick={yaPague} disabled={cargando}>
                {cargando ? <ET k="pago.yape.enviando" sinColor /> : <ET k="pago.yape.boton" sinColor />}
              </button>
              <p className="pago-aviso"><ET k="pago.yape.aviso" /></p>
            </div>
          </>
        )}

        {/* ===== PAGO EFECTIVO ===== */}
        {metodo === 'efectivo' && (
          <>
            <div style={{ textAlign: 'left' }}>
              <button className="pago-volver" onClick={() => navigate('/metodo-pago')}>
                <Editable id="pago_volver" as="span" sinColor>{idioma === 'en' ? '← Back' : '← Volver'}</Editable>
              </button>
            </div>
            <h1><ET k="pago.ef.titulo" /></h1>
            <p className="pago-sub"><ET k="pago.ef.sub" /></p>
            <div className="pago-card">
              {total && <div className="pago-monto"><ET k="pago.yape.monto" /> <strong className="efectivo-color">S/{total}.00</strong></div>}
              <img src={imgEfectivo} alt="PagoEfectivo" style={{ height: 40, objectFit: 'contain', marginBottom: 16, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />

              {cargando && !codigoCIP && (
                <p style={{ padding: '40px 0', color: '#666' }}><ET k="pago.ef.generando" /></p>
              )}

              {errorCIP && (
                <div className="codigo-cip-error">
                  ⚠️ {errorCIP}
                  <br />
                  <small><ET k="pago.ef.error_falla" /></small>
                </div>
              )}

              {codigoCIP && (
                <>
                  <div className="codigo-cip-box">
                    <p className="codigo-cip-label"><ET k="pago.ef.codigo_label" /></p>
                    <div className="codigo-cip-numero">{codigoCIP}</div>
                    <button className="codigo-cip-copiar" onClick={copiarCIP}>
                      {copiadoCIP ? <ET k="pago.ef.copiado" sinColor /> : <ET k="pago.ef.copiar" sinColor />}
                    </button>
                    {vencimientoCIP && (
                      <p className="codigo-cip-vence">
                        <ET k="pago.ef.vence" /> {new Date(vencimientoCIP * 1000).toLocaleString(idioma === 'en' ? 'en-US' : 'es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>

                  {qrCIP && (
                    <div style={{ textAlign: 'center', margin: '14px 0' }}>
                      <img src={qrCIP} alt="QR PagoEfectivo" style={{ width: 150, height: 150, objectFit: 'contain' }} />
                      <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>
                        <Editable id="pago_ef_qr_nota" as="span">{idioma === 'en' ? 'Or scan the QR from your banking app' : 'O escanea el QR desde tu app bancaria'}</Editable>
                      </p>
                    </div>
                  )}

                  {urlPe && (
                    <a href={urlPe} target="_blank" rel="noopener noreferrer" className="pago-btn-pague efectivo-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 10 }}>
                      <Editable id="pago_ef_pagar_online" as="span" sinColor>{idioma === 'en' ? 'Pay online (banking / agents)' : 'Pagar en línea (banca / agentes)'}</Editable>
                    </a>
                  )}

                  <div className="pago-pasos">
                    {['pago.ef.paso1', 'pago.ef.paso2', 'pago.ef.paso3', 'pago.ef.paso4', 'pago.ef.paso5'].map((k, i) => (
                      <div className="pago-paso" key={i}>
                        <span className="paso-num efectivo-bg">{i + 1}</span>
                        <span><ET k={k} /></span>
                      </div>
                    ))}
                  </div>

                  <button className="pago-btn-pague efectivo-btn" onClick={yaGenereCIP} disabled={cargando}>
                    {cargando ? <ET k="pago.yape.enviando" sinColor /> : <ET k="pago.ef.boton" sinColor />}
                  </button>
                  <p className="pago-aviso"><ET k="pago.ef.aviso" /></p>
                </>
              )}
            </div>
          </>
        )}

        <p className="pago-id-ref"><ET k="pago.referencia" /> <code>#{pedidoId.slice(0, 8)}</code></p>
      </main>
      <Footer />
    </>
  );
}
