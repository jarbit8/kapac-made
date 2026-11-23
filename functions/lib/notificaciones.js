// Cambio de estado de un pedido: stock y aviso al cliente por correo
const { correoPedido } = require('../correos');
const pedidos = require('./pedidos');

module.exports = function notificaciones({ base, recalcularPedido, mandarCorreo }) {
  // Las plantillas están en correos.js
  async function enviarCorreo({ to, ...pedido }) {
    const correo = correoPedido(pedido);
    if (!correo) return;
    try {
      const error = await mandarCorreo([to], correo);
      if (error) console.error('Resend rechazó el correo:', to, error);
    } catch (e) {
      console.error('Error enviando correo:', e);
    }
  }

  async function notificarCambioEstado(event) {
    const antes   = event.data.before.data();
    const despues = event.data.after.data();
    const pedidoId = event.params.pedidoId;

    // El cliente activa el aviso en la confirmación, cuando el pago con tarjeta o
    // Yape ya se confirmó: en ese caso se le manda al momento el correo del estado actual.
    const activoAviso = antes.canalNotificacion !== 'email' && despues.canalNotificacion === 'email';
    if (antes.estado === despues.estado && !activoAviso) return;

    const nuevoEstado = despues.estado;
    let total = despues.total || 0;
    let items = despues.items || [];

    // Yape con QR: el cliente avisa que pagó y el admin compara con lo que le llegó.
    // El total y los items los mandó el navegador, así que se rehacen con la base
    // para que el admin y el correo vean el precio real.
    if (antes.estado !== despues.estado && nuevoEstado === 'verificando_pago') {
      try {
        const real = await recalcularPedido(items, { revisarStock: false });
        total = real.centimos / 100;
        items = real.items;
        await event.data.after.ref.update({ total, items });
      } catch (e) {
        console.error('No se pudo recalcular el pedido', pedidoId, e.message);
      }
    }

    // ── Stock: una sola vez por pedido ───────────────────────────────────────
    // Lo hace el servidor con el Admin SDK: los clientes no pueden escribir en
    // productos. Se reserva apenas el cliente avisa que pagó (Yape QR) o que ya
    // tiene su código (PagoEfectivo), para que nadie más compre esa unidad mientras
    // tanto; con tarjeta o Yape con código se descuenta al confirmarse el pago.
    // Si el pedido se cancela (o el código vence sin pagarse), el stock vuelve.
    const signo = ['verificando_pago', 'pendiente_envio'].includes(nuevoEstado) && !despues.stockDescontado ? -1
      : nuevoEstado === 'cancelado' && despues.stockDescontado ? 1 : 0;
    if (antes.estado !== despues.estado && signo) {
      try {
        await pedidos.moverStock(base(), event.data.after.ref, signo);
      } catch (e) {
        console.error(`No se pudo ${signo < 0 ? 'descontar' : 'devolver'} el stock del pedido`, pedidoId, e);
      }
    }

    // ── Notificar al CLIENTE por CORREO (una vez por estado) ────────────────
    if (despues.canalNotificacion === 'email' && despues.email && despues.ultimoAviso !== nuevoEstado) {
      await enviarCorreo({
        to: despues.email,
        pedidoId,
        estado: nuevoEstado,
        total,
        items,
        envio: despues.envio,
        metodoPago: despues.metodoPago,
        codigoPago: despues.codigoPago,
        codigoPagoVence: despues.codigoPagoVence,
      });
      await event.data.after.ref.update({ ultimoAviso: nuevoEstado });
    }
  }

  return { notificarCambioEstado };
};
