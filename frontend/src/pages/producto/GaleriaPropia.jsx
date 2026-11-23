import React from 'react';
import { fotoRapida } from '../../utils/fotos';
import { nombreProducto } from '../../i18n/producto';
import { GaleriaProducto, MAX_GALERIA } from '../../components/ProductoEditable';

// Galería propia del producto — filas escalonadas (sin título)
export default function GaleriaPropia({ producto, esAdmin, idioma, onCambiar }) {
  const galeria = (Array.isArray(producto.galeria) ? producto.galeria : []).filter(Boolean);
  if (esAdmin) return <GaleriaProducto fotos={galeria} nombre={nombreProducto(producto, idioma)} onCambiar={onCambiar} />;
  const fotos = galeria.map(fotoRapida).slice(0, MAX_GALERIA);
  if (!fotos.length) return null;
  return (
    <section className="producto-galeria-edit">
      <div className="galeria-edit-grid">
        {fotos.map((src, i) => (
          <figure key={i} className={`galeria-edit-item pos-${i}`}>
            <img src={src} alt={`${nombreProducto(producto, idioma)} ${i + 1}`} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </section>
  );
}
