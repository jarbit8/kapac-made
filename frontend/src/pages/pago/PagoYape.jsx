import React from 'react';
import Icono from '../../components/Icono';
import { useIdioma } from '../../context/LanguageContext';
import qrImg from '../../assets/images/qr.jpeg';
import imgYape from '../../assets/images/yape.avif';
import PasosPago from './PasosPago';

export default function PagoYape({ total, estado, cargando, error, onPague }) {
  const { t } = useIdioma();
  return (
    <>
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
        <PasosPago claves={['pago.yape.paso1', 'pago.yape.paso2', 'pago.yape.paso3', 'pago.yape.paso4']} />
        {error && <p className="pago-error"><Icono nombre="alerta" tam={16} /> {error}</p>}
        <button className="pago-btn-pague" onClick={onPague} disabled={cargando || estado !== 'listo'}>
          {cargando ? t('pago.yape.enviando') : <><Icono nombre="check" tam={18} /> {t('pago.yape.boton')}</>}
        </button>
        <p className="pago-aviso"><Icono nombre="info" tam={16} /> {t('pago.yape.aviso')}</p>
      </div>
    </>
  );
}
