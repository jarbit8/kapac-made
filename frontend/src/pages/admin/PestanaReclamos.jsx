import React from 'react';
import { diasHabilesHasta } from '../../utils/diasHabiles';
import { formatoFecha } from './formatoFecha';

// Días hábiles que quedan para responder; en rojo si son 3 o menos o ya venció
const plazoReclamo = (r) => {
  if (r.estado === 'respondido' || !r.fechaLimite?.toDate) return null;
  const n = diasHabilesHasta(r.fechaLimite.toDate());
  const dias = (v) => `${v} día${v === 1 ? '' : 's'} hábil${v === 1 ? '' : 'es'}`;
  const texto = n < 0 ? `Vencido hace ${dias(-n)}` : n === 0 ? 'Vence hoy' : `Quedan ${dias(n)}`;
  return { texto, urgente: n <= 3 };
};

export default function PestanaReclamos({
  reclamosPendientes, reclamosRespondidos, reclamosError, filtroReclamos, setFiltroReclamos,
  reclamoAbierto, respuesta, setRespuesta, respondiendo, abrirReclamo, enviarRespuesta,
}) {
  return (
    <div className="admin-pedidos">
      <div className="admin-pedidos-filtros">
        {[
          { key: 'pendientes', label: `Pendientes (${reclamosPendientes.length})` },
          { key: 'respondidos', label: `Respondidos (${reclamosRespondidos.length})` },
        ].map((f) => (
          <button
            key={f.key}
            className={`admin-filtro-btn ${filtroReclamos === f.key ? 'activo' : ''}`}
            onClick={() => setFiltroReclamos(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reclamosError && <p className="admin-reclamo-error">{reclamosError}</p>}

      {(() => {
        const lista = filtroReclamos === 'pendientes' ? reclamosPendientes : reclamosRespondidos;
        if (!reclamosError && lista.length === 0) return (
          <p style={{ color: '#888', fontSize: 14, marginTop: 20 }}>
            {filtroReclamos === 'pendientes' ? 'No hay reclamos pendientes.' : 'Aún no has respondido ningún reclamo.'}
          </p>
        );

        return lista.map((r) => {
          const pendiente = r.estado !== 'respondido';
          const col = pendiente ? { bg: '#fff3cd', color: '#856404' } : { bg: '#d4edda', color: '#155724' };
          const plazo = plazoReclamo(r);
          const abierto = reclamoAbierto === r.id;
          return (
            <div key={r.id} className="admin-pedido-card">
              <div className="admin-pedido-top">
                <div>
                  <span className="admin-pedido-id">{r.codigo}</span>
                  <span className="admin-pedido-email">{r.tipo === 'queja' ? 'Queja' : 'Reclamo'}</span>
                </div>
                <span className="admin-pedido-estado" style={{ background: col.bg, color: col.color }}>
                  {pendiente ? 'Pendiente' : 'Respondido'}
                </span>
              </div>
              <p className="admin-pedido-fecha">{formatoFecha(r.fecha)} · {r.nombre} · {r.email}</p>
              {plazo && <p className={`admin-reclamo-plazo${plazo.urgente ? ' urgente' : ''}`}>{plazo.texto}</p>}
              <button type="button" className="admin-filtro-btn" onClick={() => abrirReclamo(r.id)}>
                {abierto ? 'Cerrar' : (pendiente ? 'Ver y responder' : 'Ver')}
              </button>

              {abierto && (
                <div className="admin-reclamo-detalle">
                  <dl>
                    {[
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
                      ['Tipo', r.tipo === 'queja' ? 'Queja' : 'Reclamo'],
                      ['Detalle', r.detalle],
                      ['Pedido del consumidor', r.pedido],
                      ['Idioma', r.idioma === 'en' ? 'Inglés' : 'Español'],
                      ['Fecha límite', r.fechaLimite?.toDate ? r.fechaLimite.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : ''],
                    ].filter(([, v]) => v).map(([k, v]) => (
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
                        onChange={(e) => setRespuesta(e.target.value)}
                      />
                      <button
                        type="button"
                        className="admin-reclamo-enviar"
                        onClick={() => enviarRespuesta(r)}
                        disabled={respondiendo}
                      >
                        {respondiendo ? 'Enviando…' : 'Enviar respuesta'}
                      </button>
                    </div>
                  ) : (
                    <div className="admin-reclamo-responder">
                      <p className="admin-reclamo-respuesta-fecha">Respondido el {formatoFecha(r.fechaRespuesta)}</p>
                      <p className="admin-reclamo-respuesta">{r.respuesta}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        });
      })()}
    </div>
  );
}
