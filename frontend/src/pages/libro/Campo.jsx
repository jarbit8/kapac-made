import React from 'react';

export default function Campo({ id, etiqueta, requerido, error, completo, t, children }) {
  return (
    <div className={`libro-campo${completo ? ' completo' : ''}${error ? ' con-error' : ''}`}>
      <label htmlFor={`libro-${id}`}>{etiqueta}{requerido && <span className="req"> *</span>}</label>
      {children}
      {error && <p className="libro-error" id={`libro-${id}-error`}>{t(error)}</p>}
    </div>
  );
}
