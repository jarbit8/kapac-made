const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const { correoPedido, correoCodigo, correoReclamo, correoRespuestaReclamo } = require('./correos');
const { correoValido, nombreCulqi, ordenDelAviso, leerReclamo, sumarDiasHabiles } = require('./lib/validar');
const pedidos = require('./lib/pedidos');

admin.initializeApp();

const culqiSecret  = defineSecret('CULQI_SECRET_KEY');
const resendSecret = defineSecret('RESEND_API_KEY');

const REMITENTE = 'Kapac Made <pedidos@kapac-made.com>';
// Si el cliente responde el correo, le llega aquí (pedidos@ solo envía)
const RESPONDER_A = 'jarb2299@gmail.com';
const CORS = ['https://jarbit8.github.io', 'https://www.kapac-made.com', 'https://kapac-made.com'];

const base = () => admin.firestore();
const recalcularPedido = (items, opciones) => pedidos.recalcularPedido(base(), items, opciones);
const permitirIP = (req, segundos, prefijo) => pedidos.permitirIP(base(), req, segundos, prefijo);

// ─── Correos para el cliente (Resend) ─────────────────────────────────────────
// Las plantillas están en correos.js
async function enviarCorreo({ to, ...pedido }) {
  const correo = correoPedido(pedido);
  if (!correo) return;
  try {
    const resend = new Resend(resendSecret.value());
    // Resend no lanza el error: lo devuelve (por ejemplo, remitente sin dominio verificado)
    const { error } = await resend.emails.send({ from: REMITENTE, replyTo: RESPONDER_A, to: [to], subject: correo.asunto, html: correo.html });
    if (error) console.error('Resend rechazó el correo:', to, error);
  } catch (e) {
    console.error('Error enviando correo:', e);
  }
}

// ─── Trigger: cambio de estado → notificar admin y/o cliente ─────────────────
exports.notificarCambioEstado = onDocumentUpdated(
  {
    document: 'pedidos/{pedidoId}',
    region: 'us-central1',
    secrets: [resendSecret],
  },
  async (event) => {
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
);

// ─── Cobro con Culqi ──────────────────────────────────────────────────────────
exports.cobrarCulqi = onRequest(
  {
    cors: CORS,
    invoker: 'public',
    region: 'us-central1',
    secrets: [culqiSecret],
  },
  async (req, res) => {
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
);

// ─── Newsletter: enviar código de verificación al correo ──────────────────────
exports.enviarCodigoNewsletter = onRequest(
  {
    cors: CORS,
    invoker: 'public',
    region: 'us-central1',
    secrets: [resendSecret],
  },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ ok: false, mensaje: 'Método no permitido' }); return; }
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ ok: false, mensaje: 'Correo inválido' });
      return;
    }

    try {
      const db = base();

      // ¿Ya está suscrito?
      const yaSnap = await db.collection('newsletter').where('email', '==', email).limit(1).get();
      if (!yaSnap.empty) { res.status(200).json({ ok: true, yaExistia: true }); return; }

      // Enfriamiento anti-spam: no reenviar a un correo si ya se le mandó hace < 60s.
      const codRef = db.collection('newsletter_codigos').doc(email);
      const codPrev = await codRef.get();
      if (codPrev.exists) {
        const enviadoHace = Date.now() - ((codPrev.data().enviado) || 0);
        if (enviadoHace < 60 * 1000) {
          res.status(429).json({ ok: false, mensaje: 'Ya te enviamos un código. Espera un momento.' });
          return;
        }
      }

      // Límite por IP: 1 envío cada 30s desde la misma IP (frena el flood de un atacante).
      if (!(await permitirIP(req, 30, 'news_'))) {
        res.status(429).json({ ok: false, mensaje: 'Demasiados intentos. Espera un momento.' });
        return;
      }

      // Tope global diario: protege tu cuota de Resend aunque el ataque venga de
      // mil correos/IPs distintas. Más de N envíos en un día → se corta.
      const hoy = new Date().toISOString().slice(0, 10);
      const diaRef = db.collection('limites').doc('newsletter_dia');
      const permitido = await db.runTransaction(async (tx) => {
        const d = await tx.get(diaRef);
        const data = d.exists ? d.data() : {};
        const count = data.dia === hoy ? (data.count || 0) : 0;
        if (count >= 80) return false;
        tx.set(diaRef, { dia: hoy, count: count + 1 });
        return true;
      });
      if (!permitido) {
        res.status(429).json({ ok: false, mensaje: 'Suscripción no disponible por ahora. Intenta más tarde.' });
        return;
      }
      // Código de 6 dígitos, válido 15 min
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      const expira = Date.now() + 15 * 60 * 1000;

      await codRef.set({
        email, codigo, expira, intentos: 0,
        enviado: Date.now(),
        creado: admin.firestore.FieldValue.serverTimestamp(),
      });

      const resend = new Resend(resendSecret.value());
      const correo = correoCodigo(codigo);
      const { error } = await resend.emails.send({ from: REMITENTE, replyTo: RESPONDER_A, to: email, subject: correo.asunto, html: correo.html });
      if (error) {
        // Sin esto la página decía "te enviamos el código" aunque no saliera
        await codRef.delete().catch(() => {});
        throw new Error(`Resend: ${error.message || error.name}`);
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('enviarCodigoNewsletter error:', err);
      res.status(500).json({ ok: false, mensaje: 'No se pudo enviar el código. Intenta más tarde.' });
    }
  }
);

// ─── Newsletter: verificar código y suscribir ─────────────────────────────────
exports.verificarCodigoNewsletter = onRequest(
  {
    cors: CORS,
    invoker: 'public',
    region: 'us-central1',
  },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ ok: false, mensaje: 'Método no permitido' }); return; }
    const email  = (req.body?.email || '').trim().toLowerCase();
    const codigo = (req.body?.codigo || '').trim();
    if (!email || !codigo) { res.status(400).json({ ok: false, mensaje: 'Faltan datos' }); return; }

    try {
      const db = base();
      const ref = db.collection('newsletter_codigos').doc(email);
      const snap = await ref.get();
      if (!snap.exists) { res.status(400).json({ ok: false, mensaje: 'Solicita un código primero.' }); return; }

      const data = snap.data();
      if (Date.now() > data.expira) { await ref.delete(); res.status(400).json({ ok: false, mensaje: 'El código expiró. Pide uno nuevo.' }); return; }
      if ((data.intentos || 0) >= 5) { await ref.delete(); res.status(400).json({ ok: false, mensaje: 'Demasiados intentos. Pide un código nuevo.' }); return; }

      if (data.codigo !== codigo) {
        await ref.update({ intentos: (data.intentos || 0) + 1 });
        res.status(400).json({ ok: false, mensaje: 'Código incorrecto.' });
        return;
      }

      // Correcto → suscribir (verificado) y limpiar el código
      await db.collection('newsletter').add({
        email,
        verificado: true,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
      });
      await ref.delete();

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('verificarCodigoNewsletter error:', err);
      res.status(500).json({ ok: false, mensaje: 'Error verificando el código.' });
    }
  }
);

// ─── PagoEfectivo: crear Culqi Order ──────────────────────────────────────────
// Genera un código CIP que el cliente paga en agentes BCP/BBVA/etc.
exports.crearOrdenCulqi = onRequest(
  {
    cors: CORS,
    invoker: 'public',
    region: 'us-central1',
    secrets: [culqiSecret],
  },
  async (req, res) => {
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
);

// ─── Webhook de Culqi: recibe confirmación cuando cliente paga PagoEfectivo ──
exports.culqiWebhook = onRequest(
  {
    cors: false,
    invoker: 'public',
    region: 'us-central1',
    secrets: [culqiSecret],
  },
  async (req, res) => {
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
);

// ─── Libro de Reclamaciones ───────────────────────────────────────────────────
// La hoja la arma el servidor: número correlativo por año, copia por correo al
// consumidor y aviso a la tienda. Los reclamos no se borran (se guardan 2 años).

async function enviar(para, correo) {
  const resend = new Resend(resendSecret.value());
  const { error } = await resend.emails.send({ from: REMITENTE, replyTo: RESPONDER_A, to: [para], subject: correo.asunto, html: correo.html });
  if (error) throw new Error(`Resend: ${error.message || error.name}`);
}

exports.registrarReclamo = onRequest(
  {
    cors: CORS,
    invoker: 'public',
    region: 'us-central1',
    secrets: [resendSecret],
  },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ ok: false, mensaje: 'Método no permitido' }); return; }
    const r = leerReclamo(req.body || {});
    if (!r) { res.status(400).json({ ok: false, mensaje: 'Revisa los datos del formulario.' }); return; }

    try {
      if (!(await permitirIP(req, 20, 'reclamo_'))) {
        res.status(429).json({ ok: false, mensaje: 'Demasiados intentos. Espera un momento.' });
        return;
      }
      const db = base();
      const ahora = new Date();
      const anio = Number(ahora.toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' }));
      const hoy = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const limite = sumarDiasHabiles(ahora, 15);

      // Número correlativo del año y tope diario (protege la cuota de correos)
      const codigo = await db.runTransaction(async (tx) => {
        const contRef = db.collection('contadores').doc('reclamos');
        const cont = await tx.get(contRef);
        const c = cont.exists ? cont.data() : {};
        const delDia = c.dia === hoy ? (c.delDia || 0) : 0;
        if (delDia >= 50) return null;
        const n = c.anio === anio ? (c.n || 0) + 1 : 1;
        const nuevo = `${String(n).padStart(6, '0')}-${anio}`;
        tx.set(contRef, { anio, n, dia: hoy, delDia: delDia + 1 });
        tx.create(db.collection('reclamos').doc(nuevo), {
          ...r,
          codigo: nuevo,
          fecha: admin.firestore.Timestamp.fromDate(ahora),
          fechaLimite: admin.firestore.Timestamp.fromDate(limite),
          estado: 'pendiente',
          respuesta: null,
          fechaRespuesta: null,
        });
        return nuevo;
      });
      if (!codigo) {
        res.status(503).json({ ok: false, mensaje: 'El libro no está disponible en este momento. Escríbenos por WhatsApp.' });
        return;
      }

      const hoja = { ...r, codigo, fecha: ahora, fechaLimite: limite };
      const [copia] = await Promise.allSettled([
        enviar(r.email, correoReclamo(hoja)),
        enviar(RESPONDER_A, correoReclamo(hoja, { paraTienda: true })),
      ]);
      if (copia.status === 'rejected') console.error('No se pudo enviar la copia del reclamo', codigo, copia.reason);
      await db.collection('reclamos').doc(codigo).update({ copiaEnviada: copia.status === 'fulfilled' });

      res.status(200).json({ ok: true, codigo, fecha: ahora.toISOString(), fechaLimite: limite.toISOString() });
    } catch (err) {
      console.error('registrarReclamo error:', err);
      res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
    }
  }
);

// El admin responde desde el panel: se le manda la respuesta al consumidor
exports.responderReclamo = onDocumentUpdated(
  {
    document: 'reclamos/{codigo}',
    region: 'us-central1',
    secrets: [resendSecret],
  },
  async (event) => {
    const antes = event.data.before.data();
    const despues = event.data.after.data();
    if (antes.respuesta || !despues.respuesta) return;
    const r = {
      ...despues,
      fecha: despues.fecha.toDate(),
      fechaRespuesta: despues.fechaRespuesta?.toDate() || new Date(),
    };
    try {
      await enviar(r.email, correoRespuestaReclamo(r));
      await event.data.after.ref.update({ respuestaEnviada: true });
    } catch (e) {
      console.error('No se pudo enviar la respuesta del reclamo', event.params.codigo, e);
      await event.data.after.ref.update({ respuestaEnviada: false });
    }
  }
);

// ─── Corte de facturación ─────────────────────────────────────────────────────
// El presupuesto de Cloud Billing publica el gasto del mes en este tema varias
// veces al día. Si llega al monto del presupuesto, se desvincula la facturación
// del proyecto y todo el servidor se apaga hasta reactivarla a mano.
const PROYECTO = 'kapac-made';

async function tokenDeServicio() {
  const r = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  return (await r.json()).access_token;
}

exports.cortarFacturacion = onMessagePublished(
  { topic: 'corte-facturacion', region: 'us-central1' },
  async (event) => {
    const aviso = event.data.message.json || {};
    const gasto = Number(aviso.costAmount);
    const tope  = Number(aviso.budgetAmount);
    if (!(gasto >= tope)) return;

    const url = `https://cloudbilling.googleapis.com/v1/projects/${PROYECTO}/billingInfo`;
    const headers = {
      Authorization: `Bearer ${await tokenDeServicio()}`,
      'Content-Type': 'application/json',
    };

    const info = await (await fetch(url, { headers })).json();
    if (!info.billingEnabled) return;

    const r = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ billingAccountName: '' }),
    });
    if (!r.ok) throw new Error(`No se pudo cortar la facturación: ${r.status} ${await r.text()}`);
    console.log(`Facturación cortada: gasto ${gasto} >= tope ${tope} ${aviso.currencyCode}`);
  }
);

