// Newsletter: suscripción con código de verificación por correo
const { correoCodigo } = require('../correos');

module.exports = function boletin({ admin, base, permitirIP, mandarCorreo }) {
  // Envía el código de verificación al correo
  async function enviarCodigoNewsletter(req, res) {
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

      const correo = correoCodigo(codigo);
      const error = await mandarCorreo(email, correo);
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

  // Verifica el código y suscribe
  async function verificarCodigoNewsletter(req, res) {
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

  return { enviarCodigoNewsletter, verificarCodigoNewsletter };
};
