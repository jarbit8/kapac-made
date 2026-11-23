import React from 'react';
import Icono from '../../components/Icono';
import { useIdioma } from '../../context/LanguageContext';
import { mensajeServidor } from '../../i18n/mensajes';
import imgEfectivo from '../../assets/images/pago efectivo.avif';
import PasosPago from './PasosPago';

export default function PagoEfectivo({ pago }) {
  const { t, idioma } = useIdioma();
  const {
    total, cargando, error, codigoCIP, vencimientoCIP, qrCIP, urlPe, errorCIP, copiadoCIP,
    copiarCIP, registrarPago,
  } = pago;

  return (
    <>
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

            <PasosPago claves={['pago.ef.paso1', 'pago.ef.paso2', 'pago.ef.paso3', 'pago.ef.paso4']} />

            {urlPe && (
              <a href={urlPe} target="_blank" rel="noopener noreferrer" className="pago-btn-secundario">
                {t('pago.ef.online')} <Icono nombre="externo" tam={16} />
              </a>
            )}

            {error && <p className="pago-error"><Icono nombre="alerta" tam={16} /> {error}</p>}
            <button className="pago-btn-pague" onClick={registrarPago} disabled={cargando}>
              {cargando ? t('pago.yape.enviando') : <><Icono nombre="check" tam={18} /> {t('pago.ef.boton')}</>}
            </button>
            <p className="pago-aviso"><Icono nombre="info" tam={16} /> {t('pago.ef.aviso')}</p>
          </>
        )}
      </div>
    </>
  );
}
