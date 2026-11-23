// Cobros con Culqi: tarjeta, PagoEfectivo y el webhook que confirma el pago
const { correoValido, nombreCulqi, ordenDelAviso } = require('./validar');

module.exports = function pagos({ admin, base, culqiSecret, recalcularPedido, permitirIP }) {
  // Cobro con tarjeta
  async function cobrarCulqi(req, res) {
    const CULQI_SECRET_KEY = culqiSecret.value();

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }

    const { token, pedidoId, email } = req.body;
    if (!token || !pedidoId) {
      res.status(400).json({ error: 'Faltan datos requeridos' });
      return;
    }

    // Límite por IP: frena el abuso de cargos / prueba de tarjetas robadas.
    if (!(await permitirIP(req, 5))) {
      res.status(429).json({ ok: false, mensaje: 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.' });
      return;
    }

    try {
      // El monto SIEMPRE se toma del pedido guardado, nunca del cliente.
      const pedidoRef = base().collection('pedidos').doc(pedidoId);
      const pedidoSnap = await pedidoRef.get();
      if (!pedidoSnap.exists) {
        res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado.' });
        return;
      }
      const pedido = pedidoSnap.data();
      if (pedido.estado !== 'procesando_pago' || pedido.culqiChargeId) {
        res.status(409).json({ ok: false, mensaje: 'Este pedido ya fue pagado o cancelado.' });
        return;
      }
      // Tope de intentos por pedido: frena a quien prueba tarjetas robadas una tras otra.
      if ((pedido.intentosCobro || 0) >= 5) {
        res.status(429).json({ ok: false, mensaje: 'Demasiados intentos con este pedido. Vuelve al carrito y empieza de nuevo.' });
        return;
      }
      // Pedido recalculado desde los productos reales (anti-fraude).
      let amount, itemsReales;
      try {
        ({ centimos: amount, items: itemsReales } = await recalcularPedido(pedido.items));
      } catch (e) {
        res.status(400).json({ ok: false, mensaje: 'No se pudo validar el monto del pedido.' });
        return;
      }

      const culqiRes = await fetch('https://api.culqi.com/v2/charges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency_code: 'PEN',
          email: correoValido(email, pedido.email),
          source_id: token,
          description: `Kapac Made - Pedido #${pedidoId.slice(0, 8)}`,
        }),
      });

      const culqiData = await culqiRes.json();

      if (culqiData.object === 'error') {
        await pedidoRef.update({ intentosCobro: admin.firestore.FieldValue.increment(1) });
        res.status(400).json({ ok: false, mensaje: culqiData.user_message || 'Tarjeta rechazada.' });
        return;
      }

      await base().collection('pedidos').doc(pedidoId).update({
        estado: 'pendiente_envio',
        culqiChargeId: culqiData.id,
        total: amount / 100,   // total real verificado en servidor
        items: itemsReales,    // items saneados desde la BD
        pagoFecha: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ ok: true, chargeId: culqiData.id });

    } catch (err) {
      console.error('Error interno:', err);
      res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
    }
  }

  // PagoEfectivo: crea la orden en Culqi.
  // Genera un código CIP que el cliente paga en agentes BCP/BBVA/etc.
  async function crearOrdenCulqi(req, res) {
    const CULQI_SECRET_KEY = culqiSecret.value();

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }

    const { pedidoId, email, nombre } = req.body;
    if (!pedidoId) {
      res.status(400).json({ ok: false, mensaje: 'No se pudo identificar tu pedido. Vuelve al carrito e intenta de nuevo.' });
      return;
    }

    // Límite por IP: frena el spam de creación de órdenes a Culqi.
    if (!(await permitirIP(req, 5))) {
      res.status(429).json({ ok: false, mensaje: 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.' });
      return;
    }

    try {
      // Monto recalculado desde los precios reales de los productos (anti-fraude).
      const pedidoSnap = await base().collection('pedidos').doc(pedidoId).get();
      if (!pedidoSnap.exists) {
        res.status(404).json({ ok: false, mensaje: 'No encontramos tu pedido. Vuelve al carrito e intenta de nuevo.' });
        return;
      }

      // Si el pedido ya tiene un código vigente, se reutiliza (recargas de página)
      // en vez de crear otra orden en Culqi.
      const ped = pedidoSnap.data();
      // verificando_pago: el cliente ya generó su CIP y vuelve a la página a verlo
      if (!['procesando_pago', 'verificando_pago'].includes(ped.estado)) {
        res.status(409).json({ ok: false, mensaje: 'Este pedido ya fue pagado o cancelado.' });
        return;
      }

      // El invitado no tiene email en su sesión anónima: se toma el que dejó
      // en el checkout (guardado en el pedido) para no rechazar la compra.
      const emailCliente = correoValido(email, ped.email);
      const nombreCliente = nombre || ped.nombre || '';

      if (ped.codigoPago && ped.codigoPagoVence && ped.codigoPagoVence * 1000 > Date.now()) {
        res.status(200).json({
          ok: true,
          orderId: ped.culqiOrderId || '',
          codigoPago: ped.codigoPago,
          expiration: ped.codigoPagoVence,
          qr: ped.codigoPagoQR || '',
          urlPe: ped.codigoPagoUrl || '',
        });
        return;
      }

      let amount, itemsReales;
      try {
        ({ centimos: amount, items: itemsReales } = await recalcularPedido(ped.items, { revisarStock: !ped.stockDescontado }));
      } catch (e) {
        res.status(400).json({ ok: false, mensaje: /stock/i.test(e.message) ? 'No hay stock suficiente para tu pedido.' : 'No se pudo validar el monto del pedido.' });
        return;
      }
      await pedidoSnap.ref.update({ total: amount / 100, items: itemsReales });

      // PagoEfectivo exige un mínimo de S/ 6.00 (validación de Culqi)
      if (amount < 600) {
        res.status(400).json({ ok: false, mensaje: 'PagoEfectivo requiere una compra mínima de S/ 6.00. Elige otro método de pago.' });
        return;
      }

      const { nombre: firstName, apellido: lastName } = nombreCulqi(nombreCliente);

      // Expira en 48h
      const expiration = Math.floor(Date.now() / 1000) + (48 * 60 * 60);

      const culqiRes = await fetch('https://api.culqi.com/v2/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          currency_code: 'PEN',
          description: `Kapac Made - Pedido #${pedidoId.slice(0, 8)}`,
          order_number: pedidoId.slice(0, 12),
          client_details: {
            first_name: firstName,
            last_name: lastName,
            email: emailCliente,
            phone_number: '999999999',
          },
          expiration_date: expiration,
          confirm: false,
        }),
      });

      const culqiData = await culqiRes.json();

      if (culqiData.object === 'error') {
        console.error('Error Culqi Order:', culqiData);
        res.status(400).json({ ok: false, mensaje: culqiData.user_message || culqiData.merchant_message || 'No se pudo generar el código.' });
        return;
      }

      // La orden nace SIN código de pago (payment_code null): hay que
      // confirmarla para que PagoEfectivo genere el CIP, el QR y el link.
      const confRes = await fetch(`https://api.culqi.com/v2/orders/${culqiData.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const confData = await confRes.json();

      if (confData.object === 'error' || !confData.payment_code) {
        console.error('Error Culqi Confirm:', confData);
        res.status(400).json({ ok: false, mensaje: confData.user_message || confData.merchant_message || 'No se pudo generar el código.' });
        return;
      }

      // Guardar info en Firestore para que el cliente pueda recargar la página
      await base().collection('pedidos').doc(pedidoId).update({
        culqiOrderId: confData.id,
        codigoPago: confData.payment_code,
        codigoPagoVence: confData.expiration_date,
        codigoPagoQR: confData.qr || '',
        codigoPagoUrl: confData.url_pe || '',
        metodoPago: 'efectivo',
      });

      res.status(200).json({
        ok: true,
        orderId: confData.id,
        codigoPago: confData.payment_code,
        expiration: confData.expiration_date,
        qr: confData.qr || '',
        urlPe: confData.url_pe || '',
      });

    } catch (err) {
      console.error('Error crearOrdenCulqi:', err);
      res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
    }
  }

  // Webhook de Culqi: recibe la confirmación cuando el cliente paga con PagoEfectivo
  async function culqiWebhook(req, res) {
    try {
      const orderId = ordenDelAviso(req.body);

      if (!orderId) { res.status(200).send('OK (sin id)'); return; }

      // NO confiamos en el cuerpo del webhook (cualquiera puede falsificarlo).
      // Volvemos a pedir la orden a Culqi y verificamos su estado real ahí.
      const verif = await fetch(`https://api.culqi.com/v2/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${culqiSecret.value()}` },
      });
      const orden = await verif.json();

      if (orden.object === 'error' || !['paid', 'expired'].includes(orden.state)) {
        res.status(200).send('OK (no confirmada por Culqi)');
        return;
      }

      // Buscar el pedido por el id de orden Culqi confirmado.
      const snap = await base().collection('pedidos').where('culqiOrderId', '==', orderId).limit(1).get();
      const target = snap.docs[0];

      if (!target) {
        console.log('Pedido no encontrado para orden Culqi', orderId);
        res.status(200).send('OK (pedido no encontrado)');
        return;
      }
      // Avisos repetidos (o reenviados por alguien) no reviven un pedido cancelado
      // ni vuelven a descontar stock.
      if (!['procesando_pago', 'verificando_pago'].includes(target.data().estado)) {
        res.status(200).send('OK (ya procesado)');
        return;
      }

      // El código venció sin pagarse: se cancela y la unidad reservada vuelve a la tienda
      if (orden.state === 'expired') {
        await target.ref.update({ estado: 'cancelado' });
        console.log('Pedido', target.id, 'cancelado: el código de PagoEfectivo venció sin pagarse');
        res.status(200).send('OK (vencido)');
        return;
      }

      // Defensa extra: el monto pagado debe coincidir con el precio real recalculado.
      let esperado;
      try {
        ({ centimos: esperado } = await recalcularPedido(target.data().items, { revisarStock: !target.data().stockDescontado }));
      } catch (e) {
        console.error('No se pudo recalcular monto en webhook', orderId, e.message);
        res.status(200).send('OK (monto no validable)');
        return;
      }
      if (Number(orden.amount) !== esperado) {
        console.error('Monto no coincide en webhook Culqi', orderId, orden.amount, esperado);
        res.status(200).send('OK (monto no coincide)');
        return;
      }

      await target.ref.update({
        estado: 'pendiente_envio',
        pagoFecha: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✓ Pedido', target.id, 'pagado vía PagoEfectivo (verificado con Culqi)');

      res.status(200).send('OK');

    } catch (err) {
      console.error('Error en culqiWebhook:', err);
      res.status(200).send('OK'); // siempre 200 para que Culqi no reintente eternamente
    }
  }

  return { cobrarCulqi, crearOrdenCulqi, culqiWebhook };
};
