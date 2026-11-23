import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import PedidoNoDisponible from '../components/PedidoNoDisponible';
import { useIdioma } from '../context/LanguageContext';
import usePago from './pago/usePago';
import PagoYape from './pago/PagoYape';
import PagoEfectivo from './pago/PagoEfectivo';
import '../styles/Pago.css';

export default function Pago() {
  const { metodo, pedidoId } = useParams(); // /pago/:metodo/:pedidoId
  const { t } = useIdioma();
  const pago = usePago(metodo, pedidoId);
  const { estado } = pago;

  const volver = (
    <button className="pago-volver" onClick={pago.cambiarMetodo}>
      <Icono nombre="flechaIzq" tam={16} /> {t('pago.volver')}
    </button>
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

        {metodo === 'yape' && (
          <>
            {volver}
            <PagoYape total={pago.total} estado={estado} cargando={pago.cargando} error={pago.error} onPague={pago.registrarPago} />
          </>
        )}

        {metodo === 'efectivo' && (
          <>
            {volver}
            <PagoEfectivo pago={pago} />
          </>
        )}

        <p className="pago-id-ref">{t('pago.referencia')} <code>#{pedidoId.slice(0, 8).toUpperCase()}</code></p>
      </main>
      <Footer />
    </>
  );
}
