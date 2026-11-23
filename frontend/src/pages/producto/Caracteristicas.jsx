import React from 'react';
import { CampoProducto } from '../../components/ProductoEditable';
import { useTraducido } from '../../i18n/useTraducido';

// Fila de "Características" — traduce título y descripción automáticamente al inglés.
function FeatureFila({ titulo, desc, idioma }) {
  const tituloT = useTraducido(titulo, idioma);
  const descT = useTraducido(desc, idioma);
  return (
    <div className="producto-feature">
      <strong>{tituloT}</strong>
      {desc && <span>{descT}</span>}
    </div>
  );
}

export default function Caracteristicas({ producto, esAdmin, idioma, edicion }) {
  const { filas, cambiarFila, agregarFila, quitarFila } = edicion;

  if (esAdmin) {
    return (
      <div className="producto-features">
        {filas('features').map((f, i) => (
          <div key={i} className="producto-feature">
            <strong>
              <CampoProducto valor={f.titulo} placeholder="Agregar título" onGuardar={(v) => cambiarFila('features', i, 'titulo', v)} />
            </strong>
            <span>
              <CampoProducto valor={f.desc} placeholder="Agregar descripción" onGuardar={(v) => cambiarFila('features', i, 'desc', v)} />
            </span>
            <button type="button" className="pe-quitar" onClick={() => quitarFila('features', i)}>× Quitar</button>
          </div>
        ))}
        <button type="button" className="pe-agregar" onClick={() => agregarFila('features', { titulo: '', desc: '' })}>
          + Agregar característica
        </button>
      </div>
    );
  }

  if (!(Array.isArray(producto.features) && producto.features.some(f => f.titulo))) return null;
  return (
    <div className="producto-features">
      {producto.features.filter(f => f.titulo).map((f, i) => (
        <FeatureFila key={i} titulo={f.titulo} desc={f.desc} idioma={idioma} />
      ))}
    </div>
  );
}
