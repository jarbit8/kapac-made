// Libro de Reclamaciones
// La hoja la arma el servidor: número correlativo por año, copia por correo al
// consumidor y aviso a la tienda. Los reclamos no se borran (se guardan 2 años).
const { correoReclamo, correoRespuestaReclamo } = require('../correos');
const { leerReclamo, sumarDiasHabiles } = require('./validar');
const { RESPONDER_A } = require('./servicios');

module.exports = function reclamos({ admin, base, permitirIP, mandarCorreo }) {
  async function enviar(para, correo) {
    const error = await mandarCorreo([para], correo);
    if (error) throw new Error(`Resend: ${error.message || error.name}`);
  }

  async function registrarReclamo(req, res) {
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

  // El admin responde desde el panel: se le manda la respuesta al consumidor
  async function responderReclamo(event) {
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

  return { registrarReclamo, responderReclamo };
};
