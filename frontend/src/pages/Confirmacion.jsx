import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import { useIdioma } from '../context/LanguageContext';
import Cargando from '../components/Cargando/Cargando';
import { textoPagina } from '../i18n/estadosPedido';
import { cipPendiente } from '../utils/compra';
import usePedidoConfirmacion from './confirmacion/usePedidoConfirmacion';
import CodigoCIP from './confirmacion/CodigoCIP';
import ReciboPedido from './confirmacion/ReciboPedido';
import AvisoCorreo from './confirmacion/AvisoCorreo';
import '../styles/Pago.css';
import '../styles/Confirmacion.css';

export default function Confirmacion() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { t, idioma } = useIdioma();
  const { pedido, cargando, aviso } = usePedidoConfirmacion(pedidoId);

  const pagado = ['pendiente_envio', 'pagado', 'enviado', 'entregado'].includes(pedido?.estado);
  const pagina = textoPagina(pedido, idioma);

  if (cargando) {
    return (
      <>
        <Header />
        <main className="confirmacion-page">
          <Cargando />
        </main>
        <Footer />
      </>
    );
  }

  if (!pedido) {
    return (
      <>
        <Header />
        <main className="confirmacion-page">
          <div className="confirmacion-header">
            <div className="confirmacion-icono"><Icono nombre="alerta" tam={40} /></div>
            <h1>{t('conf.no_encontrado')}</h1>
          </div>
          <div className="confirmacion-acciones">
            <button onClick={() => navigate('/shop')} className="conf-btn-inicio">{t('conf.volver_tienda')}</button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="confirmacion-page">
        <PasosCompra actual={3} />

        <div className="confirmacion-header">
          <div className={`confirmacion-icono ${pagado ? 'ok' : 'espera'}`}>
            <Icono nombre={pagado ? 'checkCirculo' : pedido.estado === 'cancelado' ? 'alerta' : 'reloj'} tam={44} />
          </div>
          <h1>{pagina?.titulo || t('conf.recibido')}</h1>
          <p className="confirmacion-sub">{pagina?.texto || t('conf.sub_verificando')}</p>
        </div>

        {cipPendiente(pedido) && <CodigoCIP pedido={pedido} />}

        <ReciboPedido pedido={pedido} pedidoId={pedidoId} />

        <AvisoCorreo pedido={pedido} aviso={aviso} />

        <div className="confirmacion-acciones">
          <button onClick={() => navigate('/pedidos')} className="conf-btn-pedidos">{t('conf.ver_pedidos')}</button>
          <button onClick={() => navigate('/shop')} className="conf-btn-inicio">{t('conf.volver_tienda')}</button>
        </div>
      </main>
      <Footer />
    </>
  );
}
