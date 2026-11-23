import React from 'react';
import Campo from './Campo';
import { DOCUMENTOS } from './validacion';

export default function BloqueConsumidor({ f, t }) {
  const { form, errores, propsDe, cambiar, cambiarDocumento, cambiarTipoDocumento, soloNumeros } = f;
  return (
    <section className="libro-bloque">
      <h2><span className="libro-num">1</span>{t('libro.bloque1')}</h2>
      <div className="libro-grid">
        <Campo id="nombre" etiqueta={t('libro.nombre')} requerido error={errores.nombre} completo t={t}>
          <input {...propsDe('nombre')} autoComplete="name" maxLength={120} />
        </Campo>
        <Campo id="documentoTipo" etiqueta={t('libro.doc_tipo')} requerido t={t}>
          <select id="libro-documentoTipo" name="documentoTipo" value={form.documentoTipo} onChange={(e) => cambiarTipoDocumento(e.target.value)}>
            {DOCUMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Campo>
        <Campo id="documento" etiqueta={t('libro.doc_numero')} requerido error={errores.documento} t={t}>
          <input
            {...propsDe('documento')}
            onChange={(e) => cambiarDocumento(e.target.value)}
            inputMode={soloNumeros(form.documentoTipo) ? 'numeric' : 'text'}
            maxLength={form.documentoTipo === 'RUC' ? 11 : form.documentoTipo === 'DNI' ? 8 : 15}
            autoComplete="off"
          />
        </Campo>
        <Campo id="domicilio" etiqueta={t('libro.domicilio')} requerido error={errores.domicilio} completo t={t}>
          <input {...propsDe('domicilio')} autoComplete="street-address" maxLength={200} />
        </Campo>
        <Campo id="telefono" etiqueta={t('libro.telefono')} error={errores.telefono} t={t}>
          <input {...propsDe('telefono', false)} type="tel" autoComplete="tel" maxLength={20} />
        </Campo>
        <Campo id="email" etiqueta={t('libro.correo')} requerido error={errores.email} t={t}>
          <input {...propsDe('email')} type="email" autoComplete="email" maxLength={120} />
        </Campo>
      </div>

      <label className="libro-switch">
        <input type="checkbox" role="switch" checked={form.menorDeEdad} onChange={(e) => cambiar('menorDeEdad', e.target.checked)} />
        <span className="libro-switch-pista" aria-hidden="true" />
        <span>{t('libro.menor')}</span>
      </label>
      {form.menorDeEdad && (
        <div className="libro-grid">
          <Campo id="apoderado" etiqueta={t('libro.apoderado')} requerido error={errores.apoderado} completo t={t}>
            <input {...propsDe('apoderado')} autoComplete="off" maxLength={120} />
          </Campo>
        </div>
      )}
    </section>
  );
}
