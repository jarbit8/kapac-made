import React from 'react';
import { actualizarEstadoPedido } from '../../firebase/pedidos';
import { nombreEstado } from '../../i18n/estadosPedido';
import { useIdioma } from '../../context/LanguageContext';
import Icono from '../../components/Icono';
import { formatoFecha } from './formatoFecha';

const ESTADOS_PEDIDO = ['procesando_pago', 'verificando_pago', 'pendiente_envio', 'enviado', 'entregado'];
// Estados viejos → su equivalente, para saber desde dónde puede avanzar
const ESTADO_EQUIVALENTE = { pendiente: 'verificando_pago', verificando: 'procesando_pago', pagado: 'pendiente_envio' };
const ESTADOS_PENDIENTE = ['verificando_pago', 'pendiente_envio', 'enviado', 'pendiente', 'verificando', 'pagado'];

// Solo se avanza o se cancela: volver atrás le mandaría otra vez el correo al cliente.
// "Procesando pago" lo pone el sistema mientras el cliente paga.
const estadosPosibles = (estado) => {
  if (estado === 'cancelado') return ['cancelado'];
  const i = ESTADOS_PEDIDO.indexOf(ESTADO_EQUIVALENTE[estado] || estado);
  const siguientes = ESTADOS_PEDIDO.slice(Math.max(i + 1, 1));
  return [estado, ...siguientes, ...(estado === 'entregado' ? [] : ['cancelado'])];
};

// Los mismos nombres que ve el cliente (descripcion/textos-pedidos.json)
const etiquetaEstado = (estado, pedido) => nombreEstado(pedido, 'es', estado);

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
  // viejos
  pendiente:   { bg: '#fff3cd', color: '#856404' },
  verificando: { bg: '#fff3cd', color: '#856404' },
  pagado:      { bg: '#d4edda', color: '#155724' },
};

export default function PestanaPedidos({ pedidos, pedidosVerificando, filtroPedidos, setFiltroPedidos, cargarPedidos, setMsg }) {
  const { t } = useIdioma();

  const cambiarEstadoPedido = async (p, nuevoEstado) => {
    const numero = `#${p.id.slice(0, 8).toUpperCase()}`;
    const etiqueta = etiquetaEstado(nuevoEstado, p);
    const correo = p.canalNotificacion === 'email' && p.email ? '\n\nSe le avisará al cliente por correo.' : '';
    const stock = nuevoEstado === 'cancelado' && p.stockDescontado ? '\nEl stock de este pedido vuelve a la tienda.' : '';
    if (!window.confirm(`¿Cambiar el pedido ${numero} a «${etiqueta}»?${correo}${stock}`)) return;
    try {
      await actualizarEstadoPedido(p.id, nuevoEstado);
    } catch (e) {
      setMsg(`No se pudo actualizar el pedido: ${e?.message || ''}`);
      return;
    }
    setMsg(`Pedido ${numero} actualizado: ${etiqueta}`);
    cargarPedidos();
  };

  const pedidosPendientes  = pedidos.filter(p => ESTADOS_PENDIENTE.includes(p.estado));
  const pedidosCompletados = pedidos.filter(p => p.estado === 'entregado');
  const pedidosCancelados  = pedidos.filter(p => p.estado === 'cancelado');

  return (
    <div className="admin-pedidos">

      {/* Resumen de contadores */}
      <div className="admin-pedidos-resumen">
        <div className="admin-resumen-card pendientes" onClick={() => setFiltroPedidos('pendientes')}>
          <span className="admin-resumen-num">{pedidosPendientes.length}</span>
          <span className="admin-resumen-label">{t('admin.pendientes')}</span>
          {pedidosVerificando.length > 0 && (
            <span className="admin-resumen-alerta"><Icono nombre="alerta" tam={14} /> {pedidosVerificando.length} {t(pedidosVerificando.length === 1 ? 'admin.verificar_uno' : 'admin.verificar')}</span>
          )}
        </div>
        <div className="admin-resumen-card completados" onClick={() => setFiltroPedidos('completados')}>
          <span className="admin-resumen-num">{pedidosCompletados.length}</span>
          <span className="admin-resumen-label">{t('admin.completados')}</span>
        </div>
        <div className="admin-resumen-card cancelados" onClick={() => setFiltroPedidos('cancelados')}>
          <span className="admin-resumen-num">{pedidosCancelados.length}</span>
          <span className="admin-resumen-label">{t('admin.cancelados')}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="admin-pedidos-filtros">
        {[
          { key: 'pendientes',  label: `${t('admin.filtro_pendientes')} (${pedidosPendientes.length})` },
          { key: 'completados', label: `${t('admin.filtro_completados')} (${pedidosCompletados.length})` },
          { key: 'cancelados',  label: `${t('admin.filtro_cancelados')} (${pedidosCancelados.length})` },
        ].map(f => (
          <button
            key={f.key}
            className={`admin-filtro-btn ${filtroPedidos === f.key ? 'activo' : ''}`}
            onClick={() => setFiltroPedidos(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista filtrada */}
      {(() => {
        const lista = filtroPedidos === 'pendientes' ? pedidosPendientes
                    : filtroPedidos === 'completados' ? pedidosCompletados
                    : pedidosCancelados;

        if (lista.length === 0) return (
          <p style={{ color: '#888', fontSize: 14, marginTop: 20 }}>
            {t('admin.no_pedidos')}
          </p>
        );

        return lista.map((p) => {
          const col = ESTADO_COLORES[p.estado] || { bg: '#eee', color: '#333' };
          return (
            <div key={p.id} className="admin-pedido-card">
              <div className="admin-pedido-top">
                <div>
                  <span className="admin-pedido-id">#{p.id.slice(0, 8).toUpperCase()}</span>
                  <span className="admin-pedido-email">{[p.envio?.nombre || p.nombre, p.email].filter(Boolean).join(' · ')}</span>
                </div>
                <span
                  className="admin-pedido-estado"
                  style={{ background: col.bg, color: col.color }}
                >
                  {etiquetaEstado(p.estado, p)}
                </span>
              </div>
              <p className="admin-pedido-fecha">{formatoFecha(p.fecha)}</p>
              <p className="admin-pedido-metodo">
                <Icono nombre={METODO_PAGO[p.metodoPago]?.icono || 'info'} tam={16} />
                {METODO_PAGO[p.metodoPago]?.texto || p.metodoPago || 'Sin método de pago'}
              </p>
              {p.metodoPago === 'efectivo' && ['procesando_pago', 'verificando_pago'].includes(p.estado)
                && p.codigoPagoVence && p.codigoPagoVence * 1000 < Date.now() && (
                <p className="admin-pedido-vencido">
                  <Icono nombre="alerta" tam={14} /> El código de PagoEfectivo venció sin pagarse: cancela el pedido para devolver el stock.
                </p>
              )}
              <ul className="admin-pedido-items">
                {p.items?.map((it, i) => (
                  <li key={i}>{it.cantidad}× {it.nombre} — S/{it.precio * it.cantidad}.00</li>
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
                <strong>Total: S/{p.total}.00</strong>
                <select
                  value={p.estado}
                  onChange={(e) => cambiarEstadoPedido(p, e.target.value)}
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
        });
      })()}
    </div>
  );
}
