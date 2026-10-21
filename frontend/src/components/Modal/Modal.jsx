import React from 'react';
import '../../styles/Modal.css';

/**
 * Modal estético para confirmaciones y avisos.
 *
 * Props:
 *  - abierto: boolean
 *  - onClose: cerrar modal
 *  - titulo: string
 *  - mensaje: string | JSX
 *  - confirmar: string (texto del botón principal)
 *  - cancelar: string (texto del botón secundario, opcional)
 *  - onConfirmar: fn
 *  - tipo: 'normal' | 'peligro'
 *  - icono: emoji o JSX
 */
export default function Modal({
  abierto,
  onClose,
  titulo,
  mensaje,
  confirmar = 'Aceptar',
  cancelar = 'Cancelar',
  onConfirmar,
  tipo = 'normal',
  icono,
}) {
  if (!abierto) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-card ${tipo === 'peligro' ? 'modal-peligro' : ''}`} onClick={e => e.stopPropagation()}>
        {icono && <div className="modal-icono">{icono}</div>}
        <h3 className="modal-titulo">{titulo}</h3>
        {mensaje && <p className="modal-mensaje">{mensaje}</p>}

        <div className="modal-acciones">
          {cancelar && (
            <button className="modal-btn modal-btn-secundario" onClick={onClose}>
              {cancelar}
            </button>
          )}
          <button
            className={`modal-btn modal-btn-primario ${tipo === 'peligro' ? 'btn-peligro' : ''}`}
            onClick={() => { onConfirmar?.(); onClose(); }}
          >
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
