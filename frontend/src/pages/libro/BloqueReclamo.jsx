import React from 'react';
import Campo from './Campo';

export default function BloqueReclamo({ f, t }) {
  const { form, errores, propsDe, cambiar } = f;
  return (
    <section className="libro-bloque">
      <h2><span className="libro-num">3</span>{t('libro.bloque3')}</h2>
      <div className="libro-grid">
        <div className={`libro-campo completo${errores.tipo ? ' con-error' : ''}`}>
          <span className="libro-etiqueta" id="libro-tipo-etiqueta">{t('libro.tipo')} <span className="req">*</span></span>
          <div className="libro-opciones" role="radiogroup" aria-labelledby="libro-tipo-etiqueta">
            {[['reclamo', 'libro.tipo_reclamo'], ['queja', 'libro.tipo_queja']].map(([valor, clave]) => (
              <label className="libro-opcion" key={valor}>
                <input id={`libro-tipo-${valor}`} type="radio" name="tipo" value={valor} checked={form.tipo === valor} onChange={() => cambiar('tipo', valor)} />
                <span>{t(clave)}</span>
              </label>
            ))}
          </div>
          {errores.tipo && <p className="libro-error">{t(errores.tipo)}</p>}
        </div>
        <Campo id="detalle" etiqueta={t('libro.detalle')} requerido error={errores.detalle} completo t={t}>
          <textarea {...propsDe('detalle')} rows={6} maxLength={3000} />
          <span className="libro-contador">{form.detalle.length} / 3000</span>
        </Campo>
        <Campo id="pedido" etiqueta={t('libro.pedido_consumidor')} requerido error={errores.pedido} completo t={t}>
          <textarea {...propsDe('pedido')} rows={4} maxLength={1500} />
          <span className="libro-contador">{form.pedido.length} / 1500</span>
        </Campo>
      </div>
    </section>
  );
}
