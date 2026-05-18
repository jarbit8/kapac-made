import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { actualizarEstadoPedido } from '../firebase/pedidos';
import qrImg from '../assets/images/qr.jpeg';
import btcImg from '../assets/images/btc.png';
import '../styles/Pago.css';

// Dirección BTC de Kapac Made
const BTC_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'; // ← reemplaza con la real

export default function Pago() {
  const { metodo, pedidoId } = useParams(); // /pago/:metodo/:pedidoId
  const navigate = useNavigate();
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    const t = sessionStorage.getItem('pago_total');
    if (t) setTotal(t);
  }, []);

  const yaPague = async () => {
    setCargando(true);
    try {
      await actualizarEstadoPedido(pedidoId, 'verificando');
      setEnviado(true);
      sessionStorage.removeItem('pago_total');
    } catch (e) {
      console.error(e);
      alert('Hubo un error. Intenta de nuevo.');
    }
    setCargando(false);
  };

  const copiarBTC = () => {
    navigator.clipboard.writeText(BTC_ADDRESS);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Pantalla de confirmación (igual para ambos métodos)
  if (enviado) {
    return (
      <>
        <Header />
        <main className="pago-page">
          <div className="pago-confirmado">
            <div className="pago-check">✅</div>
            <h1>¡Gracias por tu compra!</h1>
            <p>
              Tu pago está siendo verificado por el equipo de Kapac Made.<br />
              Te avisaremos cuando sea confirmado.
            </p>
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
      <main className="pago-page">
        {/* Indicador de pasos */}
        <div className="checkout-steps">
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">Entrega</span></div>
          <div className="step-linea completada" />
          <div className="step completado"><span className="step-num">✓</span><span className="step-label">Pago</span></div>
          <div className="step-linea completada" />
          <div className="step activo"><span className="step-num">3</span><span className="step-label">Confirmación</span></div>
        </div>

        {/* ===== YAPE ===== */}
        {metodo === 'yape' && (
          <>
            <h1>Pago con Yape</h1>
            <p className="pago-sub">Escanea el código QR con tu app de Yape y transfiere el monto exacto.</p>
            <div className="pago-card">
              {total && <div className="pago-monto">Monto: <strong className="yape-color">S/{total}.00</strong></div>}
              <img src={qrImg} alt="QR Yape Kapac Made" className="pago-qr" />
              <div className="pago-pasos">
                {['Abre tu app de Yape', 'Toca "Yapear" → "Código QR"', 'Escanea y confirma el monto', 'Presiona el botón de abajo'].map((p, i) => (
                  <div className="pago-paso" key={i}>
                    <span className="paso-num yape-bg">{i + 1}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <button className="pago-btn-pague yape-btn" onClick={yaPague} disabled={cargando}>
                {cargando ? 'Enviando...' : '✅ Ya pagué con Yape'}
              </button>
              <p className="pago-aviso">Nuestro equipo verificará tu pago y actualizará el estado de tu pedido.</p>
            </div>
          </>
        )}

        {/* ===== BITCOIN ===== */}
        {metodo === 'btc' && (
          <>
            <h1>Pago con Bitcoin</h1>
            <p className="pago-sub">Envía el monto exacto en BTC a la dirección de abajo o escanea el QR.</p>
            <div className="pago-card">
              {total && (
                <div className="pago-monto">
                  Monto: <strong className="btc-color">S/{total}.00</strong>
                  <span className="btc-nota"> (el equivalente en BTC al momento de pagar)</span>
                </div>
              )}
              <img src={btcImg} alt="QR Bitcoin Kapac Made" className="pago-qr btc-qr" />
              <div className="btc-address-box">
                <p className="btc-address-label">Dirección BTC:</p>
                <div className="btc-address-row">
                  <code className="btc-address">{BTC_ADDRESS}</code>
                  <button className="btc-copiar" onClick={copiarBTC}>
                    {copiado ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div className="pago-pasos">
                {[
                  'Abre tu wallet de Bitcoin (Trust Wallet, Muun, etc.)',
                  'Escanea el QR o pega la dirección',
                  'Ingresa el monto equivalente en BTC',
                  'Confirma la transacción y presiona el botón de abajo',
                ].map((p, i) => (
                  <div className="pago-paso" key={i}>
                    <span className="paso-num btc-bg">{i + 1}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <button className="pago-btn-pague btc-btn" onClick={yaPague} disabled={cargando}>
                {cargando ? 'Enviando...' : '₿ Ya pagué con Bitcoin'}
              </button>
              <p className="pago-aviso">Nuestro equipo verificará tu pago en blockchain y actualizará el estado del pedido.</p>
            </div>
          </>
        )}

        <p className="pago-id-ref">Referencia: <code>#{pedidoId.slice(0, 8)}</code></p>
      </main>
      <Footer />
    </>
  );
}
