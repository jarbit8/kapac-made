// Plantillas de los correos al cliente. Tablas y estilos en línea: es lo único que
// Gmail, Outlook y Apple Mail muestran igual. Las imágenes viven en la página
// (frontend/public/correo/).
const SITIO = 'https://www.kapac-made.com';
const LOGO = `${SITIO}/correo/logo-blanco.png`;
const CABECERA = `${SITIO}/correo/cabecera.jpg`;
const INSTAGRAM = 'https://www.instagram.com/kapac.made/';
const WHATSAPP = '51997050752';
const LETRA = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const TINTA = '#111111';
const GRIS = '#6b6760';
const LINEA = '#e7e3dc';

const ESTADOS = {
  verificando_pago: {
    paso: 1, color: '#9a6700',
    etiqueta: () => 'Pago en verificación',
    asunto: (id) => `Recibimos tu pedido #${id}`,
    titulo: () => 'Recibimos tu pedido',
    mensaje: () => 'Estamos verificando tu pago. Te escribiremos apenas se confirme, normalmente en pocas horas.',
  },
  pendiente_envio: {
    paso: 2, color: '#1a7d3b',
    etiqueta: () => 'Pago confirmado',
    asunto: (id) => `Pago confirmado · Pedido #${id}`,
    titulo: () => 'Gracias por tu compra',
    mensaje: (recojo) => (recojo
      ? 'Tu pago está confirmado y ya estamos preparando tu pedido. Te avisaremos cuando esté listo para recoger en Arequipa.'
      : 'Tu pago está confirmado y ya estamos preparando tu pedido. Te avisaremos cuando salga hacia tu dirección.'),
  },
  enviado: {
    paso: 3, color: '#1f5fbf',
    etiqueta: (recojo) => (recojo ? 'Listo para recoger' : 'En camino'),
    asunto: (id, recojo) => (recojo ? `Tu pedido #${id} está listo para recoger` : `Tu pedido #${id} está en camino`),
    titulo: (recojo) => (recojo ? 'Tu pedido está listo' : 'Tu pedido está en camino'),
    mensaje: (recojo) => (recojo
      ? 'Ya puedes recogerlo en Arequipa. Escríbenos por WhatsApp para coordinar el día y la hora.'
      : 'Tu mochila ya salió hacia tu dirección. Si necesitas algo, escríbenos por WhatsApp.'),
  },
  entregado: {
    paso: 4, color: '#1a7d3b',
    etiqueta: () => 'Entregado',
    asunto: (id) => `Pedido #${id} entregado`,
    titulo: () => 'Que la disfrutes',
    mensaje: () => 'Tu pedido fue entregado. Gracias por elegir Kapac Made: cada mochila está hecha a mano en Arequipa para acompañarte en cada ruta.',
  },
  cancelado: {
    paso: 0, color: '#b42318',
    etiqueta: () => 'Cancelado',
    asunto: (id) => `Pedido #${id} cancelado`,
    titulo: () => 'Tu pedido fue cancelado',
    mensaje: () => 'Si tienes dudas o crees que se trata de un error, escríbenos por WhatsApp y lo revisamos.',
  },
};

const html = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

// Marco común: cabecera negra con el logo, foto de los Andes, contenido y pie
function marco({ previa, contenido, foto = true }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kapac Made</title>
</head>
<body style="margin:0;padding:0;background:#f2efe9;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${html(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2efe9;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;">
    <tr><td align="center" style="background:#0f0f0f;padding:30px 24px;">
      <a href="${SITIO}" style="text-decoration:none;"><img src="${LOGO}" width="200" alt="KAPAC MADE" style="display:block;width:200px;max-width:60%;height:auto;border:0;color:#ffffff;font:700 20px ${LETRA};letter-spacing:4px;"></a>
    </td></tr>
    ${foto ? `<tr><td style="padding:0;line-height:0;"><img src="${CABECERA}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>` : ''}
    <tr><td style="padding:40px 40px 36px;font-family:${LETRA};color:${TINTA};">
      ${contenido}
    </td></tr>
    <tr><td align="center" style="background:#0f0f0f;padding:32px 24px 28px;font-family:${LETRA};">
      <img src="${LOGO}" width="120" alt="KAPAC MADE" style="display:block;width:120px;height:auto;border:0;margin:0 auto 14px;color:#ffffff;font:700 14px ${LETRA};letter-spacing:3px;">
      <p style="margin:0 0 16px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a8a39a;">Hecho a mano en Arequipa, Perú</p>
      <p style="margin:0 0 18px;font-size:13px;">
        <a href="${SITIO}" style="color:#ffffff;text-decoration:none;">Tienda</a>
        <span style="color:#55524d;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
        <a href="${INSTAGRAM}" style="color:#ffffff;text-decoration:none;">Instagram</a>
        <span style="color:#55524d;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
        <a href="https://wa.me/${WHATSAPP}" style="color:#ffffff;text-decoration:none;">WhatsApp</a>
      </p>
      <p style="margin:0;font-size:11px;color:#7d7870;">© ${new Date().getFullYear()} Kapac Made</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// Barra de avance del pedido: Recibido → Pago confirmado → En camino → Entregado
function avance(paso, recojo) {
  const pasos = ['Recibido', 'Pago confirmado', recojo ? 'Listo para recoger' : 'En camino', 'Entregado'];
  const celdas = pasos.map((nombre, i) => {
    const hecho = i < paso;
    return `<td width="25%" valign="top" style="padding:0 3px;">
      <div style="height:4px;line-height:4px;font-size:0;background:${hecho ? TINTA : LINEA};">&nbsp;</div>
      <p style="margin:8px 0 0;font-size:11px;line-height:1.35;color:${hecho ? TINTA : '#a29d94'};font-weight:${i === paso - 1 ? 700 : 400};">${nombre}</p>
    </td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;"><tr>${celdas}</tr></table>`;
}

function boton(texto, enlace) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr><td align="center" style="background:${TINTA};">
      <a href="${enlace}" style="display:inline-block;padding:15px 30px;font-family:${LETRA};font-size:14px;font-weight:700;letter-spacing:0.5px;color:#ffffff;text-decoration:none;">${texto}</a>
    </td></tr>
  </table>`;
}

// Correo de cada cambio de estado del pedido. null si ese estado no lleva correo.
function correoPedido({ pedidoId, estado, total, items, envio }) {
  const e = ESTADOS[estado];
  if (!e) return null;
  const id = String(pedidoId).slice(0, 8).toUpperCase();
  const recojo = envio?.tipo !== 'envio';
  const mensaje = e.mensaje(recojo);

  const filas = (items || []).map((it) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${LINEA};font-size:14px;color:${TINTA};">
        ${html(it.nombre)}<br><span style="font-size:12px;color:${GRIS};">Cantidad: ${Number(it.cantidad) || 1}</span>
      </td>
      <td align="right" valign="top" style="padding:14px 0;border-bottom:1px solid ${LINEA};font-size:14px;color:${TINTA};white-space:nowrap;">${soles(it.precio * it.cantidad)}</td>
    </tr>`).join('');

  const entrega = recojo
    ? 'Recojo en Arequipa'
    : `Envío a domicilio<br><span style="color:${GRIS};">${html(envio?.direccion)}${envio?.distrito ? `, ${html(envio.distrito)}` : ''}</span>`;

  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, tengo una consulta sobre mi pedido #${id}`)}`;

  const contenido = `
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${e.color};">${e.etiqueta(recojo)}</p>
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;font-weight:700;color:${TINTA};">${e.titulo(recojo)}</h1>
    <p style="margin:0 0 30px;font-size:15px;line-height:1.65;color:#45423d;">${mensaje}</p>
    ${e.paso ? avance(e.paso, recojo) : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${TINTA};">
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${LINEA};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${GRIS};">Resumen del pedido</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid ${LINEA};font-size:14px;font-weight:700;letter-spacing:1px;color:${TINTA};">#${id}</td>
      </tr>
      ${filas}
      <tr>
        <td valign="top" style="padding:14px 0;border-bottom:1px solid ${LINEA};font-size:13px;color:${GRIS};">Entrega</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid ${LINEA};font-size:13px;line-height:1.5;color:${TINTA};">${entrega}</td>
      </tr>
      <tr>
        <td style="padding:18px 0 0;font-size:15px;font-weight:700;color:${TINTA};">Total</td>
        <td align="right" style="padding:18px 0 0;font-size:20px;font-weight:700;color:${TINTA};white-space:nowrap;">${soles(total)}</td>
      </tr>
    </table>
    <div style="height:36px;line-height:36px;font-size:0;">&nbsp;</div>
    ${boton('Escríbenos por WhatsApp', wa)}
    <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${LINEA};font-size:11px;line-height:1.6;color:#9a958c;">Recibes este correo porque hiciste un pedido en kapac-made.com y pediste que te avisáramos de su estado.</p>`;

  return { asunto: e.asunto(id, recojo), html: marco({ previa: mensaje, contenido }) };
}

// Código de 6 dígitos para confirmar la suscripción al boletín
function correoCodigo(codigo) {
  const contenido = `
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${GRIS};">Boletín Kapac Made</p>
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;font-weight:700;color:${TINTA};">Confirma tu correo</h1>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#45423d;">Escribe este código en la página para recibir nuestros lanzamientos, rutas y novedades.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="padding:24px 12px;border:1px solid ${LINEA};background:#faf8f4;font-size:38px;font-weight:700;letter-spacing:12px;color:${TINTA};">${html(codigo)}</td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${GRIS};text-align:center;">El código vence en 15 minutos. Si no lo pediste, puedes ignorar este correo.</p>`;
  return { asunto: `${codigo} es tu código de Kapac Made`, html: marco({ previa: `Tu código es ${codigo}`, contenido, foto: false }) };
}

// ─── Libro de Reclamaciones ──────────────────────────────────────────────────
const EMPRESA = {
  razonSocial: 'QHAPAQ BRANDS S.A.C.S.',
  nombreComercial: 'Kapac Made',
  ruc: '20613661604',
  domicilio: 'Av. Lambramani Mz. D Lote 3, Urb. Lambramani, Arequipa - Arequipa',
};

const fechaLima = (d) => new Date(d).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric' });
const parrafos = (t) => html(t).replace(/\n/g, '<br>');

function fila(nombre, valor) {
  return `<tr>
    <td valign="top" width="38%" style="padding:10px 12px 10px 0;border-bottom:1px solid ${LINEA};font-size:12px;color:${GRIS};">${nombre}</td>
    <td valign="top" style="padding:10px 0;border-bottom:1px solid ${LINEA};font-size:14px;line-height:1.5;color:${TINTA};">${valor}</td>
  </tr>`;
}

function seccion(titulo, filas) {
  return `<p style="margin:26px 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${TINTA};">${titulo}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${TINTA};">${filas}</table>`;
}

// La hoja completa: la copia para el consumidor y el aviso para la tienda
function hojaReclamo(r) {
  const tipo = r.tipo === 'queja' ? 'Queja' : 'Reclamo';
  return seccion('Proveedor', [
      fila('Razón social', html(EMPRESA.razonSocial)),
      fila('Nombre comercial', html(EMPRESA.nombreComercial)),
      fila('RUC', EMPRESA.ruc),
      fila('Domicilio', html(EMPRESA.domicilio)),
    ].join(''))
    + seccion('1. Identificación del consumidor', [
      fila('Nombre', html(r.nombre)),
      fila(html(r.documentoTipo), html(r.documento)),
      fila('Domicilio', html(r.domicilio)),
      r.telefono ? fila('Teléfono', html(r.telefono)) : '',
      fila('Correo', html(r.email)),
      r.menorDeEdad ? fila('Padre, madre o apoderado', html(r.apoderado)) : '',
    ].join(''))
    + seccion('2. Identificación del bien contratado', [
      fila('Tipo', r.bienTipo === 'servicio' ? 'Servicio' : 'Producto'),
      fila('Descripción', html(r.bienDescripcion)),
      r.monto !== null ? fila('Monto reclamado', soles(r.monto)) : '',
      r.pedidoId ? fila('N.º de pedido', html(r.pedidoId)) : '',
    ].join(''))
    + seccion('3. Detalle de la reclamación', [
      fila('Tipo', tipo),
      fila('Detalle', parrafos(r.detalle)),
      fila('Pedido del consumidor', parrafos(r.pedido)),
    ].join(''))
    + `<p style="margin:26px 0 0;font-size:11px;line-height:1.6;color:#9a958c;">Reclamo: disconformidad relacionada con los productos o servicios. Queja: disconformidad no relacionada con los productos o servicios, o malestar o descontento respecto a la atención al público.<br><br>La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI. El proveedor deberá dar respuesta al reclamo o queja en un plazo no mayor a quince (15) días hábiles improrrogables.</p>`;
}

function correoReclamo(r, { paraTienda = false } = {}) {
  const tipo = r.tipo === 'queja' ? 'queja' : 'reclamo';
  const mensaje = paraTienda
    ? `Llegó un${tipo === 'queja' ? 'a' : ''} ${tipo} nuevo${tipo === 'queja' ? 'a' : ''} el ${fechaLima(r.fecha)}. Hay que responder desde el panel (pestaña Reclamos) a más tardar el ${fechaLima(r.fechaLimite)}.`
    : `Registramos tu ${tipo} el ${fechaLima(r.fecha)}. Esta es tu copia de la hoja de reclamación. Te responderemos a este correo a más tardar el ${fechaLima(r.fechaLimite)}.`;
  const contenido = `
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${GRIS};">Libro de Reclamaciones</p>
    <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:700;color:${TINTA};">Hoja de reclamación N.º ${html(r.codigo)}</h1>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.65;color:#45423d;">${mensaje}</p>
    ${hojaReclamo(r)}`;
  return {
    asunto: paraTienda ? `${tipo === 'queja' ? 'Nueva queja' : 'Nuevo reclamo'} N.º ${r.codigo} · Libro de Reclamaciones` : `Tu ${tipo} N.º ${r.codigo} · Kapac Made`,
    html: marco({ previa: mensaje, contenido, foto: false }),
  };
}

function correoRespuestaReclamo(r) {
  const tipo = r.tipo === 'queja' ? 'queja' : 'reclamo';
  const contenido = `
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${GRIS};">Libro de Reclamaciones</p>
    <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:700;color:${TINTA};">Respuesta a tu ${tipo} N.º ${html(r.codigo)}</h1>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.65;color:#45423d;">Hola ${html(r.nombre)}, esta es nuestra respuesta del ${fechaLima(r.fechaRespuesta)}.</p>
    ${seccion('4. Observaciones y acciones adoptadas por el proveedor', fila('Respuesta', parrafos(r.respuesta)))}
    ${hojaReclamo(r)}`;
  return {
    asunto: `Respuesta a tu ${tipo} N.º ${r.codigo} · Kapac Made`,
    html: marco({ previa: `Respuesta a tu ${tipo} N.º ${r.codigo}`, contenido, foto: false }),
  };
}

module.exports = { correoPedido, correoCodigo, correoReclamo, correoRespuestaReclamo };
