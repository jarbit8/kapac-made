// Firebase y Resend llegan desde index.js: así las pruebas los cambian por falsos
const pedidos = require('./pedidos');

const REMITENTE = 'Kapac Made <pedidos@kapac-made.com>';
// Si el cliente responde el correo, le llega aquí (pedidos@ solo envía)
const RESPONDER_A = 'jarb2299@gmail.com';

function crearServicios({ admin, Resend, culqiSecret, resendSecret }) {
  const base = () => admin.firestore();
  return {
    admin,
    base,
    culqiSecret,
    recalcularPedido: (items, opciones) => pedidos.recalcularPedido(base(), items, opciones),
    permitirIP: (req, segundos, prefijo) => pedidos.permitirIP(base(), req, segundos, prefijo),
    // Resend no lanza el error: lo devuelve (por ejemplo, remitente sin dominio verificado)
    mandarCorreo: async (to, correo) => {
      const resend = new Resend(resendSecret.value());
      const { error } = await resend.emails.send({ from: REMITENTE, replyTo: RESPONDER_A, to, subject: correo.asunto, html: correo.html });
      return error;
    },
  };
}

module.exports = { crearServicios, RESPONDER_A };
