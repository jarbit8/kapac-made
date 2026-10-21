const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { Resend } = require('resend');

admin.initializeApp();

const culqiSecret  = defineSecret('CULQI_SECRET_KEY');
const resendSecret = defineSecret('RESEND_API_KEY');

const REMITENTE = 'Kapac Made <onboarding@resend.dev>';

// Recalcula el pedido REAL leyendo cada producto desde la base de datos:
// precio Y nombre salen de la BD, nunca de lo que mandó el cliente. Así no se
// puede ni pagar de menos ni listar un producto distinto al que se cobra.
// Devuelve { centimos, items } ya saneados.
async function recalcularPedido(items) {
  const db = admin.firestore();
  let soles = 0;
  const limpios = [];
  for (const it of (items || [])) {
    if (!it?.id) throw new Error('Item sin id de producto');
    const snap = await db.collection('productos').doc(it.id).get();
    if (!snap.exists) throw new Error('Producto inexistente: ' + it.id);
    const prod = snap.data();
    const precio = Number(prod.precio);
    const cant = Math.min(Math.max(parseInt(it.cantidad, 10) || 0, 1), 99);
    if (!(precio > 0)) throw new Error('Precio inválido: ' + it.id);
    const stock = Number(prod.stock);
    if (Number.isFinite(stock) && cant > stock) throw new Error('Sin stock suficiente: ' + (prod.nombre || it.id));
    soles += precio * cant;
    limpios.push({ id: it.id, nombre: prod.nombre || '', precio, cantidad: cant });
  }
  const centimos = Math.round(soles * 100);
  if (!Number.isInteger(centimos) || centimos <= 0) throw new Error('Monto inválido');
  return { centimos, items: limpios };
}

// Límite por IP: true si se permite, false si llamó hace menos de `segundos`.
// Usa la colección `limites_ip` (solo accesible por el Admin SDK).
async function permitirIP(req, segundos) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'na';
  const id = (ip.replace(/[^\w.:-]/g, '_').slice(0, 60)) || 'na';
  const ref = admin.firestore().collection('limites_ip').doc(id);
  const snap = await ref.get();
  if (snap.exists && Date.now() - (snap.data().ultimo || 0) < segundos * 1000) return false;
  await ref.set({ ultimo: Date.now() });
  return true;
}

// ─── Correos para el cliente (Resend) ─────────────────────────────────────────
const ASUNTOS_EMAIL = {
  verificando_pago: (id) => `🔍 Verificando tu pago — Pedido #${id}`,
  pendiente_envio:  (id) => `✅ Pago confirmado — Pedido #${id}`,
  enviado:          (id) => `🚚 Tu pedido va en camino — #${id}`,
  entregado:        (id) => `🎉 Pedido entregado — #${id}`,
  cancelado:        (id) => `❌ Pedido cancelado — #${id}`,
};

const TITULOS_EMAIL = {
  verificando_pago: 'Pago recibido, verificando',
  pendiente_envio:  '¡Pago confirmado!',
  enviado:          '¡Tu pedido va en camino!',
  entregado:        '¡Pedido entregado!',
  cancelado:        'Pedido cancelado',
};

const MENSAJES_EMAIL = {
  verificando_pago: 'Recibimos tu pago. Estamos verificándolo y te avisaremos cuando sea confirmado.',
  pendiente_envio:  'Tu pago fue confirmado exitosamente. Ahora está pendiente de envío — lo prepararemos pronto.',
  enviado:          'Tu pedido fue enviado y pronto llegará a tu dirección.',
  entregado:        '¡Gracias por comprar en Kapac Made! Tu pedido fue entregado con éxito.',
  cancelado:        'Tu pedido fue cancelado. Para más información: +51 997 050 752',
};

function htmlEmail({ titulo, mensaje, idCorto, total, items, nuevoEstado }) {
  const itemsHtml = (items || []).map(i =>
    `<tr><td style="padding:6px 0;color:#555">${i.cantidad}× ${i.nombre}</td><td style="padding:6px 0;text-align:right;color:#111;font-weight:600">S/${i.precio * i.cantidad}.00</td></tr>`
  ).join('');

  const colorEstado = {
    verificando_pago: '#856404',
    pendiente_envio:  '#155724',
    enviado:          '#004085',
    entregado:        '#0f5132',
    cancelado:        '#842029',
  }[nuevoEstado] || '#111';

  const LOGO_URL = 'https://jarbit8.github.io/kapac-made/kapac_made_3.png';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Kapac Made</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">

    <!-- Header con logo -->
    <div style="background:#0f0f0f;padding:40px 24px 32px;text-align:center;">
      <img src="${LOGO_URL}" alt="Kapac Made" width="280" style="max-width:80%;height:auto;display:block;margin:0 auto;filter:brightness(0) invert(1);" />
      <p style="margin:18px 0 0;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Arequipa · Perú</p>
    </div>

    <!-- Contenido -->
    <div style="padding:36px 30px 28px;">
      <p style="margin:0 0 10px;font-size:12px;color:${colorEstado};font-weight:700;text-transform:uppercase;letter-spacing:2px;">${nuevoEstado.replace(/_/g,' ')}</p>
      <h2 style="margin:0 0 18px;font-size:24px;color:#111;font-weight:600;letter-spacing:-0.3px;">${titulo}</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.65;">${mensaje}</p>

      <!-- Tarjeta del pedido -->
      <div style="background:#fafafa;border:1px solid #eee;border-radius:12px;padding:22px 22px;margin:24px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:14px;">
          <span style="font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;">Pedido</span>
          <strong style="font-size:16px;color:#111;letter-spacing:1px;">#${idCorto}</strong>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${itemsHtml}
        </table>
        <div style="border-top:1px solid #eee;margin-top:14px;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:#777;text-transform:uppercase;letter-spacing:1.5px;">Total</span>
          <strong style="font-size:20px;color:#111;">S/${total}.00</strong>
        </div>
      </div>

      <!-- Contacto -->
      <div style="margin:30px 0 0;padding:18px 20px;background:#f5f5f5;border-radius:10px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;">¿Tienes alguna consulta?</p>
        <p style="margin:0;font-size:16px;color:#111;font-weight:600;">+51 997 050 752</p>
      </div>
    </div>

    <!-- Footer con logo más chico -->
    <div style="background:#0f0f0f;padding:30px 24px 22px;text-align:center;">
      <img src="${LOGO_URL}" alt="Kapac Made" width="160" style="max-width:50%;height:auto;display:block;margin:0 auto 14px;filter:brightness(0) invert(1);opacity:0.85;" />
      <p style="margin:8px 0 4px;color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:2px;">MOCHILAS HECHAS A MANO</p>
      <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:1px;">© 2025 Kapac Made · Arequipa, Perú</p>
    </div>

  </div>

  <!-- Pie fuera del card -->
  <p style="text-align:center;margin:14px 0 30px;font-size:11px;color:#bbb;letter-spacing:0.5px;">
    Recibiste este correo porque hiciste un pedido en Kapac Made.
  </p>
</body>
</html>`;
}

async function enviarCorreo({ to, nuevoEstado, idCorto, total, items }) {
  try {
    const resend = new Resend(resendSecret.value());
    const html = htmlEmail({
      titulo:   TITULOS_EMAIL[nuevoEstado],
      mensaje:  MENSAJES_EMAIL[nuevoEstado],
      idCorto, total, items, nuevoEstado,
    });
    await resend.emails.send({
      from: REMITENTE,
      to: [to],
      subject: ASUNTOS_EMAIL[nuevoEstado](idCorto),
      html,
    });
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
    const idCorto  = pedidoId.slice(0, 8).toUpperCase();

    if (antes.estado === despues.estado) return;

    const nuevoEstado = despues.estado;
    const total = despues.total || 0;

    // ── Descontar stock al confirmarse el pago (una sola vez por pedido) ────
    // Lo hace el servidor con el Admin SDK: los clientes no pueden escribir
    // en productos. Cubre todos los métodos: tarjeta/yape-código (cobrarCulqi),
    // PagoEfectivo (webhook) y yape QR (confirmación manual del admin).
    if (nuevoEstado === 'pendiente_envio' && !despues.stockDescontado) {
      const db = admin.firestore();
      try {
        await db.runTransaction(async (tx) => {
          const pedidoRef = event.data.after.ref;
          const pedidoSnap = await tx.get(pedidoRef);
          if (pedidoSnap.data()?.stockDescontado) return; // ya lo hizo otra ejecución
          const itemsPedido = pedidoSnap.data()?.items || [];
          const refs = itemsPedido.map((i) => db.collection('productos').doc(i.id));
          const snaps = await Promise.all(refs.map((r) => tx.get(r)));
          snaps.forEach((s, idx) => {
            if (!s.exists) return;
            const actual = Number(s.data().stock);
            if (!Number.isFinite(actual)) return;
            const nuevo = Math.max(0, actual - (parseInt(itemsPedido[idx].cantidad, 10) || 0));
            tx.update(refs[idx], { stock: nuevo });
          });
          tx.update(pedidoRef, { stockDescontado: true });
        });
      } catch (e) {
        console.error('No se pudo descontar stock del pedido', pedidoId, e);
      }
    }

    // ── Notificar al CLIENTE por CORREO ─────────────────────────────────────
    if (despues.canalNotificacion === 'email' && despues.email && MENSAJES_EMAIL[nuevoEstado]) {
      await enviarCorreo({
        to: despues.email,
        nuevoEstado,
        idCorto,
        total,
        items: despues.items || [],
      });
    }
  }
);

// ─── Cobro con Culqi ──────────────────────────────────────────────────────────
exports.cobrarCulqi = onRequest(
  {
    cors: ['https://jarbit8.github.io', 'https://www.kapac-made.com', 'https://kapac-made.com'],
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
      const pedidoRef = admin.firestore().collection('pedidos').doc(pedidoId);
      const pedidoSnap = await pedidoRef.get();
      if (!pedidoSnap.exists) {
        res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado.' });
        return;
      }
      const pedido = pedidoSnap.data();
      if (pedido.estado === 'pendiente_envio' || pedido.culqiChargeId) {
        res.status(409).json({ ok: false, mensaje: 'Este pedido ya fue pagado.' });
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
          email: email || pedido.email || 'cliente@kapacmade.com',
          source_id: token,
          description: `Kapac Made - Pedido #${pedidoId.slice(0, 8)}`,
        }),
      });

      const culqiData = await culqiRes.json();

      if (culqiData.object === 'error') {
        res.status(400).json({ ok: false, mensaje: culqiData.user_message || 'Tarjeta rechazada.' });
        return;
      }

      await admin.firestore().collection('pedidos').doc(pedidoId).update({
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
    cors: ['https://jarbit8.github.io', 'https://www.kapac-made.com', 'https://kapac-made.com'],
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
      const db = admin.firestore();

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
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'na';
      const ipRef = db.collection('limites_ip').doc(ip.replace(/[^\w.:-]/g, '_').slice(0, 60) || 'na');
      const ipSnap = await ipRef.get();
      if (ipSnap.exists && Date.now() - (ipSnap.data().ultimo || 0) < 30 * 1000) {
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
      await ipRef.set({ ultimo: Date.now() });

      // Código de 6 dígitos, válido 15 min
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      const expira = Date.now() + 15 * 60 * 1000;

      await codRef.set({
        email, codigo, expira, intentos: 0,
        enviado: Date.now(),
        creado: admin.firestore.FieldValue.serverTimestamp(),
      });

      const resend = new Resend(resendSecret.value());
      await resend.emails.send({
        from: REMITENTE,
        to: email,
        subject: `Tu código de verificación: ${codigo}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f4efe3;border-radius:14px;color:#1d1b15;">
            <h1 style="font-size:22px;margin:0 0 8px;color:#1a3a26;">Kapac Made 🎒</h1>
            <p style="font-size:15px;line-height:1.6;color:#4a463c;margin:0 0 24px;">
              ¡Casi listo! Usa este código para confirmar tu correo y unirte a la tribu Kapac:
            </p>
            <div style="font-size:40px;font-weight:800;letter-spacing:10px;text-align:center;color:#1a3a26;background:#fff;border-radius:12px;padding:20px;border:1px dashed #b0532e;">
              ${codigo}
            </div>
            <p style="font-size:13px;color:#8c8676;margin:24px 0 0;text-align:center;">
              El código vence en 15 minutos. Si no fuiste tú, ignora este correo.
            </p>
          </div>
        `,
      });

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
    cors: ['https://jarbit8.github.io', 'https://www.kapac-made.com', 'https://kapac-made.com'],
    invoker: 'public',
    region: 'us-central1',
  },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ ok: false, mensaje: 'Método no permitido' }); return; }
    const email  = (req.body?.email || '').trim().toLowerCase();
    const codigo = (req.body?.codigo || '').trim();
    if (!email || !codigo) { res.status(400).json({ ok: false, mensaje: 'Faltan datos' }); return; }

    try {
      const db = admin.firestore();
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
    cors: ['https://jarbit8.github.io', 'https://www.kapac-made.com', 'https://kapac-made.com'],
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
      const pedidoSnap = await admin.firestore().collection('pedidos').doc(pedidoId).get();
      if (!pedidoSnap.exists) {
        res.status(404).json({ ok: false, mensaje: 'No encontramos tu pedido. Vuelve al carrito e intenta de nuevo.' });
        return;
      }

      // Si el pedido ya tiene un código vigente, se reutiliza (recargas de página)
      // en vez de crear otra orden en Culqi.
      const ped = pedidoSnap.data();

      // El invitado no tiene email en su sesión anónima: se toma el que dejó
      // en el checkout (guardado en el pedido) para no rechazar la compra.
      const emailCliente = email || ped.email || 'cliente@kapacmade.com';
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
        ({ centimos: amount, items: itemsReales } = await recalcularPedido(pedidoSnap.data().items));
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

      // Culqi exige nombres válidos (mínimo 2 caracteres, sin números)
      const nombrePartes = (nombreCliente || 'Cliente Kapac').split(' ').filter(Boolean);
      const firstName = (nombrePartes[0] || 'Cliente').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g,'').padEnd(2, 'a');
      const lastName  = (nombrePartes.slice(1).join(' ') || 'Kapac').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g,'').padEnd(2, 'a');

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
      await admin.firestore().collection('pedidos').doc(pedidoId).update({
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
      const evento = req.body || {};
      const datos  = evento.data || evento.object || {};
      const orderId = datos.id;

      if (!orderId) { res.status(200).send('OK (sin id)'); return; }

      // NO confiamos en el cuerpo del webhook (cualquiera puede falsificarlo).
      // Volvemos a pedir la orden a Culqi y verificamos su estado real ahí.
      const verif = await fetch(`https://api.culqi.com/v2/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${culqiSecret.value()}` },
      });
      const orden = await verif.json();

      if (orden.object === 'error' || orden.state !== 'paid') {
        res.status(200).send('OK (no confirmada por Culqi)');
        return;
      }

      // Buscar el pedido por el id de orden Culqi confirmado.
      const snap = await admin.firestore().collection('pedidos').get();
      let target = null;
      snap.forEach(d => { if (d.data().culqiOrderId === orderId) target = d; });

      if (!target) {
        console.log('Pedido no encontrado para orden Culqi', orderId);
        res.status(200).send('OK (pedido no encontrado)');
        return;
      }

      // Defensa extra: el monto pagado debe coincidir con el precio real recalculado.
      let esperado;
      try {
        ({ centimos: esperado } = await recalcularPedido(target.data().items));
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

