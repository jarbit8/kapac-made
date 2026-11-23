import React from 'react';
import { CampoProducto } from '../../components/ProductoEditable';
import { useTraducido } from '../../i18n/useTraducido';

// Fila de "Especificaciones" — traduce etiqueta y valor automáticamente al inglés.
function SpecFila({ label, valor, idioma }) {
  const labelT = useTraducido(label, idioma);
  const valorT = useTraducido(valor, idioma);
  return <tr><td>{labelT}</td><td>{valorT}</td></tr>;
}

export default function Especificaciones({ producto, esAdmin, idioma, edicion }) {
  const { filas, cambiarFila, agregarFila, quitarFila } = edicion;

  if (esAdmin) {
    return (
      <>
        {filas('specs').length > 0 && (
          <table className="producto-tabla">
            <tbody>
              {filas('specs').map((s, i) => (
                <tr key={i}>
                  <td><CampoProducto valor={s.label} placeholder="Agregar nombre" onGuardar={(v) => cambiarFila('specs', i, 'label', v)} /></td>
                  <td><CampoProducto valor={s.valor} placeholder="Agregar valor" onGuardar={(v) => cambiarFila('specs', i, 'valor', v)} /></td>
                  <td className="pe-celda">
                    <button type="button" className="pe-quitar" onClick={() => quitarFila('specs', i)}>× Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button type="button" className="pe-agregar" onClick={() => agregarFila('specs', { label: '', valor: '' })}>
          + Agregar especificación
        </button>
      </>
    );
  }

  if (!(Array.isArray(producto.specs) && producto.specs.some(s => s.label && s.valor))) return null;
  return (
    <table className="producto-tabla">
      <tbody>
        {producto.specs.filter(s => s.label && s.valor).map((s, i) => (
          <SpecFila key={i} label={s.label} valor={s.valor} idioma={idioma} />
        ))}
      </tbody>
    </table>
  );
}
