import React from 'react';
import Icono from './Icono';
import { useIdioma } from '../context/LanguageContext';
import '../styles/Checkout.css';

// Indicador de la compra: 1 entrega · 2 pago · 3 confirmación
const PASOS = ['steps.entrega', 'steps.pago', 'steps.confirmacion'];

export default function PasosCompra({ actual }) {
  const { t } = useIdioma();
  return (
    <div className="checkout-steps">
      {PASOS.map((k, i) => {
        const n = i + 1;
        const estado = n < actual ? 'completado' : n === actual ? 'activo' : '';
        return (
          <React.Fragment key={k}>
            {i > 0 && <div className={`step-linea${n <= actual ? ' completada' : ''}`} />}
            <div className={`step ${estado}`}>
              <span className="step-num">{n < actual ? <Icono nombre="check" tam={15} /> : n}</span>
              <span className="step-label">{t(k)}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
