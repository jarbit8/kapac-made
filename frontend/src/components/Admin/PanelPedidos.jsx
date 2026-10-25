import React from 'react';
import Icono from '../Icono';
import { useIdioma } from '../../context/LanguageContext';
import { nombreEstado } from '../../i18n/estadosPedido';
import { soles, numeroPedido, fechaPanel } from '../../utils/formato';

const ESTADOS_PEDIDO = ['procesando_pago', 'verificando_pago', 'pendiente_envio', 'enviado', 'entregado'];

// Solo se avanza o se cancela: volver atrás le mandaría otra vez el correo al cliente.
// "Procesando pago" lo pone el sistema mientras el cliente paga.
const estadosPosibles = (estado) => {
  if (estado === 'cancelado') return ['cancelado'];
  const i = ESTADOS_PEDIDO.indexOf(estado);
  const siguientes = ESTADOS_PEDIDO.slice(Math.max(i + 1, 1));
  return [estado, ...siguientes, ...(estado === 'entregado' ? [] : ['cancelado'])];
};

// Los mismos nombres que ve el cliente (descripcion/textos-pedidos.json)
export const etiquetaEstado = (estado, pedido) => nombreEstado(pedido, 'es', estado);

const METODO_PAGO = {
  yape:          { texto: 'Yape (QR)', icono: 'celular' },
  'yape-codigo': { texto: 'Yape (código de aprobación)', icono: 'celular' },
  tarjeta:       { texto: 'Tarjeta', icono: 'tarjeta' },
  efectivo:      { texto: 'PagoEfectivo', icono: 'billete' },
};

const ESTADO_COLORES = {
  procesando_pago: { bg: '#fff3cd', color: '#856404' },
  verificando_pago: { bg: '#fff3cd', color: '#856404' },
  pendiente_envio: { bg: '#d4edda', color: '#155724' },
  enviado:         { bg: '#cce5ff', color: '#004085' },
  entregado:       { bg: '#d1e7dd', color: '#0f5132' },
  cancelado:       { bg: '#f8d7da', color: '#842029' },
};

// PagoEfectivo se confirma solo: solo el Yape con QR lo revisa el admin
export const porVerificar = (pedidos) => pedidos.filter((p) => p.estado === 'verificando_pago' && p.metodoPago !== 'efectivo');

const ESTADOS_PENDIENTE = ['verificando_pago', 'pendiente_envio', 'enviado'];

function TarjetaPedido({ p, t, onCambiarEstado }) {
  const col = ESTADO_COLORES[p.estado] || { bg: '#eee', color: '#333' };
  const metodo = METODO_PAGO[p.metodoPago];
  return (
    <div className="admin-pedido-card">
      <div className="admin-pedido-top">
        <div>
          <span className="admin-pedido-id">#{numeroPedido(p.id)}</span>
          <span className="admin-pedido-email">{[p.envio?.nombre || p.nombre, p.email].filter(Boolean).join(' · ')}</span>
        </div>
        <span
          className="admin-pedido-estado"
          style={{ background: col.bg, color: col.color }}
        >
          {etiquetaEstado(p.estado, p)}
        </span>
      </div>
      <p className="admin-pedido-fecha">{fechaPanel(p.fecha)}</p>
      <p className="admin-pedido-metodo">
        <Icono nombre={metodo?.icono || 'info'} tam={16} />
        {metodo?.texto || p.metodoPago || 'Sin método de pago'}
      </p>
      <ul className="admin-pedido-items">
        {p.items?.map((it, i) => (
          <li key={i}>{it.cantidad}× {it.nombre} — {soles(it.precio * it.cantidad)}</li>
        ))}
      </ul>
      {p.envio && (
        <p className="admin-pedido-envio">
          <Icono nombre={p.envio.tipo === 'envio' ? 'camion' : 'tienda'} tam={16} />
          {p.envio.tipo === 'envio'
            ? `${t('admin.dominio_envio')}: ${p.envio.direccion}, ${p.envio.distrito}${p.envio.referencia ? ` (${p.envio.referencia})` : ''}`
            : t('admin.recojo')}
          {p.envio.telefono ? ` · Tel. ${p.envio.telefono}` : ''}
        </p>
      )}
      {p.metodoPago === 'yape' && p.codigoAprobacion && (
        <p className="admin-pedido-codigo-yape">
          {t('admin.codigo_yape')} <strong>{p.codigoAprobacion}</strong>
        </p>
      )}
      <div className="admin-pedido-footer">
        <strong>Total: {soles(p.total)}</strong>
        <select
          value={p.estado}
          onChange={(e) => onCambiarEstado(p, e.target.value)}
          className="admin-pedido-select"
          disabled={p.estado === 'cancelado'}
        >
          {estadosPosibles(p.estado).map((est) => (
            <option key={est} value={est}>{etiquetaEstado(est, p)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Pestaña Pedidos. filtro: 'pendientes' | 'completados' | 'cancelados'
export default function PanelPedidos({ pedidos, filtro, onFiltro, onCambiarEstado }) {
  const { t } = useIdioma();
  const verificando = porVerificar(pedidos);
  const pendientes = pedidos.filter((p) => ESTADOS_PENDIENTE.includes(p.estado));
  const completados = pedidos.filter((p) => p.estado === 'entregado');
  const cancelados = pedidos.filter((p) => p.estado === 'cancelado');
  const lista = { pendientes, completados, cancelados }[filtro];

  return (
    <div className="admin-pedidos">

      {/* Resumen de contadores */}
      <div className="admin-pedidos-resumen">
        <div className="admin-resumen-card pendientes" onClick={() => onFiltro('pendientes')}>
          <span className="admin-resumen-num">{pendientes.length}</span>
          <span className="admin-resumen-label">{t('admin.pendientes')}</span>
          {verificando.length > 0 && (
            <span className="admin-resumen-alerta"><Icono nombre="alerta" tam={14} /> {verificando.length} {t(verificando.length === 1 ? 'admin.verificar_uno' : 'admin.verificar')}</span>
          )}
        </div>
        <div className="admin-resumen-card completados" onClick={() => onFiltro('completados')}>
          <span className="admin-resumen-num">{completados.length}</span>
          <span className="admin-resumen-label">{t('admin.completados')}</span>
        </div>
        <div className="admin-resumen-card cancelados" onClick={() => onFiltro('cancelados')}>
          <span className="admin-resumen-num">{cancelados.length}</span>
          <span className="admin-resumen-label">{t('admin.cancelados')}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="admin-pedidos-filtros">
        {[
          { key: 'pendientes',  label: `${t('admin.filtro_pendientes')} (${pendientes.length})` },
          { key: 'completados', label: `${t('admin.filtro_completados')} (${completados.length})` },
          { key: 'cancelados',  label: `${t('admin.filtro_cancelados')} (${cancelados.length})` },
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

      {lista.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14, marginTop: 20 }}>
          {t('admin.no_pedidos')}
        </p>
      ) : lista.map((p) => <TarjetaPedido key={p.id} p={p} t={t} onCambiarEstado={onCambiarEstado} />)}
    </div>
  );
}
