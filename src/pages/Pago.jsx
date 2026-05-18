import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { actualizarEstadoPedido } from '../firebase/pedidos';
import qrImg from '../assets/images/qr.jpeg';
import '../styles/Pago.css';

export default function Pago() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [total, setTotal] = useState(null);

  // Recuperar total guardado temporalmente en sessionStorage
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

  if (enviado) {
    return (
      <>
        <Header />
        <main className="pago-page">
          <div className="pago-confirmado">
            <div className="pago-check">✅</div>
            <h1>¡Gracias por tu compra!</h1>
            <p>Tu pago está siendo verificado por el equipo de Kapac Made.<br />
              Te avisaremos cuando sea confirmado.</p>
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
        <h1>Pago con Yape</h1>
        <p className="pago-sub">
          Escanea el código QR con tu app de Yape y transfiere el monto exacto.
        </p>

        <div className="pago-card">
          {total && (
            <div className="pago-monto">
              Monto a pagar: <strong>S/{total}.00</strong>
            </div>
          )}

          <img src={qrImg} alt="QR de Yape Kapac Made" className="pago-qr" />

          <div className="pago-pasos">
            <div className="pago-paso">
              <span className="paso-num">1</span>
              <span>Abre tu app de <strong>Yape</strong></span>
            </div>
            <div className="pago-paso">
              <span className="paso-num">2</span>
              <span>Toca <strong>"Yapear"</strong> → <strong>"Código QR"</strong></span>
            </div>
            <div className="pago-paso">
              <span className="paso-num">3</span>
              <span>Escanea el QR y confirma el monto</span>
            </div>
            <div className="pago-paso">
              <span className="paso-num">4</span>
              <span>Una vez realizado el pago, presiona el botón de abajo</span>
            </div>
          </div>

          <button
            className="pago-btn-pague"
            onClick={yaPague}
            disabled={cargando}
          >
            {cargando ? 'Enviando...' : '✅ Ya pagué'}
          </button>

          <p className="pago-aviso">
            Nuestro equipo verificará tu pago y actualizará el estado de tu pedido.
          </p>
        </div>

        <p className="pago-id-ref">Referencia: <code>#{pedidoId.slice(0, 8)}</code></p>
      </main>
      <Footer />
    </>
  );
}
