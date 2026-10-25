import React from 'react';
import { diasHabilesHasta } from '../../utils/diasHabiles';
import { fechaPanel } from '../../utils/formato';

// Días hábiles que quedan para responder; en rojo si son 3 o menos o ya venció
const plazoReclamo = (r) => {
  if (r.estado === 'respondido' || !r.fechaLimite?.toDate) return null;
  const n = diasHabilesHasta(r.fechaLimite.toDate());
  const dias = (v) => `${v} día${v === 1 ? '' : 's'} hábil${v === 1 ? '' : 'es'}`;
  const texto = n < 0 ? `Vencido hace ${dias(-n)}` : n === 0 ? 'Vence hoy' : `Quedan ${dias(n)}`;
  return { texto, urgente: n <= 3 };
};

const tipoReclamo = (r) => (r.tipo === 'queja' ? 'Queja' : 'Reclamo');

function detalleReclamo(r) {
  return [
    ['Consumidor', r.nombre],
    ['Documento', `${r.documentoTipo} ${r.documento}`],
    ['Domicilio', r.domicilio],
    ['Teléfono', r.telefono],
    ['Correo', r.email],
    ['Padre, madre o apoderado', r.menorDeEdad ? r.apoderado : ''],
    ['Bien contratado', r.bienTipo === 'servicio' ? 'Servicio' : 'Producto'],
    ['Descripción', r.bienDescripcion],
    ['Monto reclamado', typeof r.monto === 'number' ? `S/ ${r.monto.toFixed(2)}` : ''],
    ['N.º de pedido', r.pedidoId],
    ['Tipo', tipoReclamo(r)],
    ['Detalle', r.detalle],
    ['Pedido del consumidor', r.pedido],
    ['Idioma', r.idioma === 'en' ? 'Inglés' : 'Español'],
    ['Fecha límite', r.fechaLimite?.toDate ? r.fechaLimite.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : ''],
  ].filter(([, v]) => v);
}

const COLOR_PENDIENTE = { bg: '#fff3cd', color: '#856404' };
const COLOR_RESPONDIDO = { bg: '#d4edda', color: '#155724' };

function TarjetaReclamo({ r, abierto, onAbrir, respuesta, onRespuesta, respondiendo, onEnviar }) {
  const pendiente = r.estado !== 'respondido';
  const col = pendiente ? COLOR_PENDIENTE : COLOR_RESPONDIDO;
  const plazo = plazoReclamo(r);
  return (
    <div className="admin-pedido-card">
      <div className="admin-pedido-top">
        <div>
          <span className="admin-pedido-id">{r.codigo}</span>
          <span className="admin-pedido-email">{tipoReclamo(r)}</span>
        </div>
        <span className="admin-pedido-estado" style={{ background: col.bg, color: col.color }}>
          {pendiente ? 'Pendiente' : 'Respondido'}
        </span>
      </div>
      <p className="admin-pedido-fecha">{fechaPanel(r.fecha)} · {r.nombre} · {r.email}</p>
      {plazo && <p className={`admin-reclamo-plazo${plazo.urgente ? ' urgente' : ''}`}>{plazo.texto}</p>}
      <button type="button" className="admin-filtro-btn" onClick={() => onAbrir(r.id)}>
        {abierto ? 'Cerrar' : (pendiente ? 'Ver y responder' : 'Ver')}
      </button>

      {abierto && (
        <div className="admin-reclamo-detalle">
          <dl>
            {detalleReclamo(r).map(([k, v]) => (
              <div className="admin-reclamo-fila" key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {pendiente ? (
            <div className="admin-reclamo-responder">
              <label htmlFor={`respuesta-${r.id}`}>Respuesta al consumidor</label>
              <textarea
                id={`respuesta-${r.id}`}
                rows={6}
                maxLength={3000}
                value={respuesta}
                onChange={(e) => onRespuesta(e.target.value)}
              />
              <button
                type="button"
                className="admin-reclamo-enviar"
                onClick={() => onEnviar(r)}
                disabled={respondiendo}
              >
                {respondiendo ? 'Enviando…' : 'Enviar respuesta'}
              </button>
            </div>
          ) : (
            <div className="admin-reclamo-responder">
              <p className="admin-reclamo-respuesta-fecha">Respondido el {fechaPanel(r.fechaRespuesta)}</p>
              <p className="admin-reclamo-respuesta">{r.respuesta}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pestaña Reclamos. filtro: 'pendientes' | 'respondidos' · abierto: id del reclamo desplegado
export default function PanelReclamos({ reclamos, error, filtro, onFiltro, abierto, ...tarjeta }) {
  const pendientes = reclamos.filter((r) => r.estado !== 'respondido');
  const respondidos = reclamos.filter((r) => r.estado === 'respondido');
  const lista = filtro === 'pendientes' ? pendientes : respondidos;

  return (
    <div className="admin-pedidos">
      <div className="admin-pedidos-filtros">
        {[
          { key: 'pendientes', label: `Pendientes (${pendientes.length})` },
          { key: 'respondidos', label: `Respondidos (${respondidos.length})` },
        ].map((f) => (
          <button
            key={f.key}
            className={`admin-filtro-btn ${filtro === f.key ? 'activo' : ''}`}
            onClick={() => onFiltro(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="admin-reclamo-error">{error}</p>}

      {!error && lista.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14, marginTop: 20 }}>
          {filtro === 'pendientes' ? 'No hay reclamos pendientes.' : 'Aún no has respondido ningún reclamo.'}
        </p>
      ) : lista.map((r) => (
        <TarjetaReclamo key={r.id} r={r} abierto={abierto === r.id} {...tarjeta} />
      ))}
    </div>
  );
}
