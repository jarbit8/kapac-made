import React from 'react';
import Icono from '../../components/Icono';
import { useIdioma } from '../../context/LanguageContext';

// Aviso por correo (opcional)
export default function AvisoCorreo({ pedido, aviso }) {
  const { t, idioma } = useIdioma();
  const es = idioma === 'es';
  const { quiereAviso, emailConfirmado, emailInput, setEmailInput, errorEmail, toggleAviso, confirmarEmail } = aviso;

  return (
    <div className="confirmacion-canal">
      <h2>{t('conf.aviso_titulo')}</h2>
      <p>{t('conf.aviso_sub')}</p>

      <div className="canal-opciones">
        <button
          className={`canal-opcion ${quiereAviso ? 'seleccionado' : ''}`}
          onClick={toggleAviso}
          aria-pressed={quiereAviso}
        >
          <span className="canal-icono"><Icono nombre="correo" tam={22} /></span>
          <div>
            <strong>{t('conf.canal_email')}</strong>
            <span>{pedido.email || t('conf.aviso_sin_correo')}</span>
          </div>
          <span className={`canal-check-box ${quiereAviso ? 'on' : ''}`}>
            {quiereAviso && <Icono nombre="check" tam={14} />}
          </span>
        </button>

        {quiereAviso && !emailConfirmado && !pedido.email && (
          <div className="canal-email-input">
            <input
              type="email"
              autoComplete="email"
              placeholder={es ? 'tucorreo@email.com' : 'youremail@email.com'}
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
            />
            <button className="canal-btn-confirmar" onClick={confirmarEmail}>{t('conf.aviso_guardar')}</button>
          </div>
        )}
        {errorEmail && <p className="checkout-error"><Icono nombre="alerta" tam={16} /> {errorEmail}</p>}

        {quiereAviso && !emailConfirmado && pedido.email && (
          <button className="canal-btn-confirmar" onClick={confirmarEmail}>{t('conf.aviso_confirmar')}</button>
        )}
        {quiereAviso && emailConfirmado && (
          <div className="canal-guardado">
            <Icono nombre="check" tam={16} /> {t('conf.aviso_ok')} <strong>{pedido.email}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
