import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import PedidoNoDisponible from '../components/PedidoNoDisponible';
import usePedidoPago from '../hooks/usePedidoPago';
import { actualizarEstadoPedido } from '../firebase/pedidos';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useIdioma } from '../context/LanguageContext';
import { mensajeServidor } from '../i18n/mensajes';
import { correoCompra, nombreCompra, marcarReemplazado } from '../utils/compra';
import qrImg from '../assets/images/qr.jpeg';
import imgYape from '../assets/images/yape.avif';
import imgEfectivo from '../assets/images/pago efectivo.avif';
import '../styles/Pago.css';

const CREAR_ORDEN_URL = 'https://us-central1-kapac-made.cloudfunctions.net/crearOrdenCulqi';

export default function Pago() {
  const { metodo, pedidoId } = useParams(); // /pago/:metodo/:pedidoId
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { restaurar } = useCart();
  const { t, idioma } = useIdioma();
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

  const yaGenereCIP = async () => {
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

  const yaPague = async () => {
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

  const volver = (
    <button className="pago-volver" onClick={cambiarMetodo}>
      <Icono nombre="flechaIzq" tam={16} /> {t('pago.volver')}
    </button>
  );

  const pasos = (claves) => (
    <ol className="pago-pasos">
      {claves.map((k, i) => (
        <li className="pago-paso" key={k}>
          <span className="paso-num">{i + 1}</span>
          <span>{t(k)}</span>
        </li>
      ))}
    </ol>
  );

  if (estado === 'noexiste' || estado === 'cerrado') {
    return (
      <>
        <Header />
        <main className="pago-page">
          <PasosCompra actual={2} />
          {volver}
          <div className="pago-card">
            <PedidoNoDisponible estado={estado} pedidoId={pedidoId} claseError="pago-error" claseBoton="pago-btn-pague" />
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
        <PasosCompra actual={2} />

        {/* ===== YAPE con QR ===== */}
        {metodo === 'yape' && (
          <>
            {volver}
            <h1>{t('pago.yape.titulo')}</h1>
            <p className="pago-sub">{t('pago.yape.sub')}</p>
            <div className="pago-card">
              {total && (
                <div className="pago-monto">
                  <span>{t('pago.yape.monto')}</span>
                  <strong>S/{total}.00</strong>
                </div>
              )}
              <img src={imgYape} alt="Yape" className="pago-logo" />
              <img src={qrImg} alt="QR Yape Kapac Made" className="pago-qr" />
              <p className="pago-qr-nombre">QHAPAQ BRANDS</p>
              {pasos(['pago.yape.paso1', 'pago.yape.paso2', 'pago.yape.paso3', 'pago.yape.paso4'])}
              {error && <p className="pago-error"><Icono nombre="alerta" tam={16} /> {error}</p>}
              <button className="pago-btn-pague" onClick={yaPague} disabled={cargando || estado !== 'listo'}>
                {cargando ? t('pago.yape.enviando') : <><Icono nombre="check" tam={18} /> {t('pago.yape.boton')}</>}
              </button>
              <p className="pago-aviso"><Icono nombre="info" tam={16} /> {t('pago.yape.aviso')}</p>
            </div>
          </>
        )}

        {/* ===== PAGOEFECTIVO ===== */}
        {metodo === 'efectivo' && (
          <>
            {volver}
            <h1>{t('pago.ef.titulo')}</h1>
            <p className="pago-sub">{t('pago.ef.sub')}</p>
            <div className="pago-card">
              {total && (
                <div className="pago-monto">
                  <span>{t('pago.yape.monto')}</span>
                  <strong>S/{total}.00</strong>
                </div>
              )}
              <img src={imgEfectivo} alt="PagoEfectivo" className="pago-logo" />

              {cargando && !codigoCIP && (
                <p className="pago-generando"><span className="pago-spinner" aria-hidden="true" /> {t('pago.ef.generando')}</p>
              )}

              {errorCIP && (
                <div className="codigo-cip-error">
                  <Icono nombre="alerta" tam={18} />
                  <div>
                    {errorCIP.conexion ? t('pago.err_conexion') : mensajeServidor(errorCIP.mensaje, idioma, t('pago.err_codigo'))}
                    <small>{t('pago.ef.error_falla')}</small>
                  </div>
                </div>
              )}

              {codigoCIP && (
                <>
                  <div className="codigo-cip-box">
                    <p className="codigo-cip-label">{t('pago.ef.codigo_label')}</p>
                    <div className="codigo-cip-numero">{codigoCIP}</div>
                    <button className="codigo-cip-copiar" onClick={copiarCIP}>
                      <Icono nombre={copiadoCIP ? 'check' : 'copiar'} tam={16} /> {copiadoCIP ? t('pago.ef.copiado') : t('pago.ef.copiar')}
                    </button>
                    {vencimientoCIP && (
                      <p className="codigo-cip-vence">
                        <Icono nombre="reloj" tam={15} /> {t('pago.ef.vence')} {new Date(vencimientoCIP * 1000).toLocaleString(idioma === 'en' ? 'en-US' : 'es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })}
                      </p>
                    )}
                  </div>

                  {qrCIP && (
                    <div className="codigo-cip-qr">
                      <img src={qrCIP} alt="QR PagoEfectivo" />
                      <p>{t('pago.ef.qr')}</p>
                    </div>
                  )}

                  {pasos(['pago.ef.paso1', 'pago.ef.paso2', 'pago.ef.paso3', 'pago.ef.paso4'])}

                  {urlPe && (
                    <a href={urlPe} target="_blank" rel="noopener noreferrer" className="pago-btn-secundario">
                      {t('pago.ef.online')} <Icono nombre="externo" tam={16} />
                    </a>
                  )}

                  {error && <p className="pago-error"><Icono nombre="alerta" tam={16} /> {error}</p>}
                  <button className="pago-btn-pague" onClick={yaGenereCIP} disabled={cargando}>
                    {cargando ? t('pago.yape.enviando') : <><Icono nombre="check" tam={18} /> {t('pago.ef.boton')}</>}
                  </button>
                  <p className="pago-aviso"><Icono nombre="info" tam={16} /> {t('pago.ef.aviso')}</p>
                </>
              )}
            </div>
          </>
        )}

        <p className="pago-id-ref">{t('pago.referencia')} <code>#{pedidoId.slice(0, 8).toUpperCase()}</code></p>
      </main>
      <Footer />
    </>
  );
}
