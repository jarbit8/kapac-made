import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icono from './Icono';
import { useIdioma } from '../context/LanguageContext';

// Aviso de las pantallas de pago cuando el pedido no existe o ya no está pendiente de pago
export default function PedidoNoDisponible({ estado, pedidoId, claseError, claseBoton }) {
  const navigate = useNavigate();
  const { t } = useIdioma();
  const cerrado = estado === 'cerrado';

  return (
    <>
      <p className={claseError}><Icono nombre="alerta" tam={16} /> {t(cerrado ? 'pago.pedido_cerrado' : 'pago.pedido_no_encontrado')}</p>
      <button className={claseBoton} onClick={() => navigate(cerrado ? `/confirmacion/${pedidoId}` : '/shop')}>
        {t(cerrado ? 'pago.ver_pedido' : 'conf.volver_tienda')}
      </button>
    </>
  );
}
