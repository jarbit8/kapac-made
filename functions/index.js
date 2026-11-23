const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const { crearServicios } = require('./lib/servicios');

admin.initializeApp();

const culqiSecret  = defineSecret('CULQI_SECRET_KEY');
const resendSecret = defineSecret('RESEND_API_KEY');

const REGION = 'us-central1';
const CORS = ['https://jarbit8.github.io', 'https://www.kapac-made.com', 'https://kapac-made.com'];

const servicios = crearServicios({ admin, Resend, culqiSecret, resendSecret });
const notificaciones = require('./lib/notificaciones')(servicios);
const pagos = require('./lib/pagos')(servicios);
const boletin = require('./lib/boletin')(servicios);
const reclamos = require('./lib/reclamos')(servicios);
const { cortarFacturacion } = require('./lib/facturacion');

// Pedidos: stock y correo al cliente en cada cambio de estado
exports.notificarCambioEstado = onDocumentUpdated(
  { document: 'pedidos/{pedidoId}', region: REGION, secrets: [resendSecret] },
  notificaciones.notificarCambioEstado
);

// Pagos con Culqi
exports.cobrarCulqi = onRequest(
  { cors: CORS, invoker: 'public', region: REGION, secrets: [culqiSecret] },
  pagos.cobrarCulqi
);

exports.crearOrdenCulqi = onRequest(
  { cors: CORS, invoker: 'public', region: REGION, secrets: [culqiSecret] },
  pagos.crearOrdenCulqi
);

exports.culqiWebhook = onRequest(
  { cors: false, invoker: 'public', region: REGION, secrets: [culqiSecret] },
  pagos.culqiWebhook
);

// Newsletter
exports.enviarCodigoNewsletter = onRequest(
  { cors: CORS, invoker: 'public', region: REGION, secrets: [resendSecret] },
  boletin.enviarCodigoNewsletter
);

exports.verificarCodigoNewsletter = onRequest(
  { cors: CORS, invoker: 'public', region: REGION },
  boletin.verificarCodigoNewsletter
);

// Libro de Reclamaciones
exports.registrarReclamo = onRequest(
  { cors: CORS, invoker: 'public', region: REGION, secrets: [resendSecret] },
  reclamos.registrarReclamo
);

exports.responderReclamo = onDocumentUpdated(
  { document: 'reclamos/{codigo}', region: REGION, secrets: [resendSecret] },
  reclamos.responderReclamo
);

// Tope de gasto: apaga la facturación al llegar al presupuesto
exports.cortarFacturacion = onMessagePublished(
  { topic: 'corte-facturacion', region: REGION },
  cortarFacturacion
);
