import React from 'react';
import Campo from './Campo';

export default function BloqueBien({ f, t }) {
  const { form, errores, propsDe, cambiar } = f;
  return (
    <section className="libro-bloque">
      <h2><span className="libro-num">2</span>{t('libro.bloque2')}</h2>
      <div className="libro-grid">
        <div className="libro-campo completo">
          <span className="libro-etiqueta" id="libro-bienTipo-etiqueta">{t('libro.bien_tipo')} <span className="req">*</span></span>
          <div className="libro-opciones" role="radiogroup" aria-labelledby="libro-bienTipo-etiqueta">
            {[['producto', 'libro.bien_producto'], ['servicio', 'libro.bien_servicio']].map(([valor, clave]) => (
              <label className="libro-opcion" key={valor}>
                <input type="radio" name="bienTipo" value={valor} checked={form.bienTipo === valor} onChange={() => cambiar('bienTipo', valor)} />
                <span>{t(clave)}</span>
              </label>
            ))}
          </div>
        </div>
        <Campo id="bienDescripcion" etiqueta={t('libro.bien_desc')} requerido error={errores.bienDescripcion} completo t={t}>
          <input {...propsDe('bienDescripcion')} autoComplete="off" maxLength={300} />
        </Campo>
        <Campo id="monto" etiqueta={t('libro.monto')} error={errores.monto} t={t}>
          <input {...propsDe('monto', false)} inputMode="decimal" maxLength={9} placeholder="0.00" autoComplete="off" />
        </Campo>
        <Campo id="pedidoId" etiqueta={t('libro.pedido_num')} error={errores.pedidoId} t={t}>
          <input {...propsDe('pedidoId', false)} maxLength={40} autoComplete="off" />
        </Campo>
      </div>
    </section>
  );
}
