import React, { useState } from 'react';
import Icono from '../../components/Icono';
import { useIdioma } from '../../context/LanguageContext';
import { venceCIP } from '../../utils/compra';

export default function CodigoCIP({ pedido }) {
  const { t, idioma } = useIdioma();
  const [copiadoCIP, setCopiadoCIP] = useState(false);
  const vence = venceCIP(pedido.codigoPagoVence, idioma);

  const copiarCIP = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(pedido.codigoPago).then(() => {
      setCopiadoCIP(true);
      setTimeout(() => setCopiadoCIP(false), 2500);
    }).catch(() => {});
  };

  return (
    <div className="conf-cip">
      <div className="codigo-cip-box">
        <p className="codigo-cip-label">{t('pago.ef.codigo_label')}</p>
        <div className="codigo-cip-numero">{pedido.codigoPago}</div>
        <button className="codigo-cip-copiar" onClick={copiarCIP}>
          <Icono nombre={copiadoCIP ? 'check' : 'copiar'} tam={16} /> {copiadoCIP ? t('pago.ef.copiado') : t('pago.ef.copiar')}
        </button>
        {vence && (
          <p className="codigo-cip-vence">
            <Icono nombre="reloj" tam={15} /> {t(vence.vencido ? 'conf.cip_vencio' : 'conf.cip_vence')} {vence.texto}
          </p>
        )}
      </div>
      {/^https:\/\//.test(pedido.codigoPagoUrl || '') && (
        <a href={pedido.codigoPagoUrl} target="_blank" rel="noopener noreferrer" className="pago-btn-secundario">
          {t('conf.cip_como_pagar')} <Icono nombre="externo" tam={16} />
        </a>
      )}
    </div>
  );
}
