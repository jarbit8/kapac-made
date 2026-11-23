import React from 'react';
import Fila, { FilasProveedor } from './Fila';
import Leyendas from './Leyendas';
import { fechaLarga, fechaHora } from './formato';

// La hoja registrada: es lo que se ve al terminar y lo único que sale al imprimir
export default function Hoja({ r, t, idioma }) {
  const d = r.datos;
  return (
    <article className="libro-hoja">
      <header className="libro-hoja-cab">
        <div>
          <p className="libro-hoja-titulo">{t('libro.titulo')}</p>
          <p className="libro-hoja-sub">{t('libro.subtitulo')}</p>
        </div>
        <div className="libro-hoja-codigo">
          <span>{t('libro.ok_codigo')}</span>
          <strong>{r.codigo}</strong>
        </div>
      </header>

      <dl className="libro-datos">
        <Fila etiqueta={t('libro.ok_fecha')} valor={fechaHora(r.fecha, idioma)} />
        <Fila etiqueta={t('libro.ok_limite')} valor={fechaLarga(r.fechaLimite, idioma)} />
      </dl>

      <h3>{t('libro.proveedor')}</h3>
      <dl className="libro-datos">
        <FilasProveedor t={t} />
      </dl>

      <h3>1. {t('libro.bloque1')}</h3>
      <dl className="libro-datos">
        <Fila etiqueta={t('libro.nombre')} valor={d.nombre} />
        <Fila etiqueta={t('libro.hoja_documento')} valor={`${d.documentoTipo} ${d.documento}`} />
        <Fila etiqueta={t('libro.domicilio')} valor={d.domicilio} />
        <Fila etiqueta={t('libro.hoja_telefono')} valor={d.telefono} />
        <Fila etiqueta={t('libro.correo')} valor={d.email} />
        <Fila etiqueta={t('libro.hoja_apoderado')} valor={d.apoderado} />
      </dl>

      <h3>2. {t('libro.bloque2')}</h3>
      <dl className="libro-datos">
        <Fila etiqueta={t('libro.bien_tipo')} valor={t(d.bienTipo === 'producto' ? 'libro.bien_producto' : 'libro.bien_servicio')} />
        <Fila etiqueta={t('libro.bien_desc')} valor={d.bienDescripcion} />
        <Fila etiqueta={t('libro.hoja_monto')} valor={d.monto === null ? '' : `S/ ${d.monto.toFixed(2)}`} />
        <Fila etiqueta={t('libro.hoja_pedido_num')} valor={d.pedidoId} />
      </dl>

      <h3>3. {t('libro.bloque3')}</h3>
      <dl className="libro-datos">
        <Fila etiqueta={t('libro.tipo')} valor={t(d.tipo === 'reclamo' ? 'libro.tipo_reclamo' : 'libro.tipo_queja')} />
        <Fila etiqueta={t('libro.detalle')} valor={d.detalle} />
        <Fila etiqueta={t('libro.pedido_consumidor')} valor={d.pedido} />
      </dl>

      <Leyendas t={t} />
    </article>
  );
}
