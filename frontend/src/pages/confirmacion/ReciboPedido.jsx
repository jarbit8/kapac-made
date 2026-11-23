import React from 'react';
import { useIdioma } from '../../context/LanguageContext';
import { nombreEstado } from '../../i18n/estadosPedido';

export default function ReciboPedido({ pedido, pedidoId }) {
  const { t, idioma } = useIdioma();
  const es = idioma === 'es';

  // Fecha del pedido (la del servidor; si aún no llegó, la de ahora)
  const fecha = (pedido.fecha?.toDate ? pedido.fecha.toDate() : new Date()).toLocaleDateString(es ? 'es-PE' : 'en-US', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const METODOS = {
    yape: 'Yape', 'yape-codigo': 'Yape',
    tarjeta: es ? 'Tarjeta' : 'Card',
    efectivo: 'PagoEfectivo',
  };

  return (
    <div className="confirmacion-recibo">
      <div className="recibo-header">
        <span className="recibo-titulo">{t('conf.recibo')}</span>
        <span className="recibo-fecha">{fecha}</span>
      </div>

      <div className="recibo-id">
        {t('conf.num')} <strong>#{pedidoId.slice(0, 8).toUpperCase()}</strong>
      </div>

      {pedido.items?.length > 0 && (
        <div className="recibo-items">
          <div className="recibo-seccion-titulo">{t('pedidos.productos')}</div>
          {pedido.items.map((item, i) => (
            <div className="recibo-item" key={i}>
              <span className="recibo-item-nombre">{item.nombre}</span>
              <span className="recibo-item-qty">x{item.cantidad}</span>
              <span className="recibo-item-precio">S/{item.precio * item.cantidad}.00</span>
            </div>
          ))}
        </div>
      )}

      <div className="recibo-total">
        <span>{t('conf.total')}</span>
        <strong>S/{pedido.total ?? '—'}.00</strong>
      </div>

      <div className="recibo-detalles">
        <div className="recibo-detalle">
          <span className="recibo-detalle-label">{t('admin.metodo_pago')}</span>
          <span>{METODOS[pedido.metodoPago] || pedido.metodoPago || '—'}</span>
        </div>
        <div className="recibo-detalle">
          <span className="recibo-detalle-label">{t('pedidos.estado')}</span>
          <span className={`recibo-estado ${pedido.estado || ''}`}>{nombreEstado(pedido, idioma)}</span>
        </div>
        {pedido.envio?.tipo === 'envio' && (
          <div className="recibo-detalle">
            <span className="recibo-detalle-label">{t('conf.dir_envio')}</span>
            <span>{pedido.envio.direccion}, {pedido.envio.distrito}</span>
          </div>
        )}
        {pedido.envio?.tipo === 'recojo' && (
          <div className="recibo-detalle">
            <span className="recibo-detalle-label">{t('conf.entrega')}</span>
            <span>{t('checkout.recojo')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
