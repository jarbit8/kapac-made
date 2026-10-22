// Los mensajes que devuelve el servidor vienen en español: en inglés se traducen los conocidos
// y el resto se reemplaza por el texto genérico que se pase.
const EN = {
  'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.': 'Too many requests. Wait a few seconds and try again.',
  'Pedido no encontrado.': 'Order not found.',
  'Este pedido ya fue pagado o cancelado.': 'This order has already been paid or cancelled.',
  'Demasiados intentos con este pedido. Vuelve al carrito y empieza de nuevo.': 'Too many attempts with this order. Go back to your cart and start over.',
  'No se pudo validar el monto del pedido.': 'We couldn\'t verify the order amount.',
  'Tarjeta rechazada.': 'Card declined.',
  'Error interno del servidor.': 'Internal server error.',
  'No se pudo identificar tu pedido. Vuelve al carrito e intenta de nuevo.': 'We couldn\'t identify your order. Go back to your cart and try again.',
  'No encontramos tu pedido. Vuelve al carrito e intenta de nuevo.': 'We couldn\'t find your order. Go back to your cart and try again.',
  'No hay stock suficiente para tu pedido.': 'There isn\'t enough stock for your order.',
  'PagoEfectivo requiere una compra mínima de S/ 6.00. Elige otro método de pago.': 'PagoEfectivo requires a minimum purchase of S/ 6.00. Choose another payment method.',
  'No se pudo generar el código.': 'We couldn\'t generate the code.',
  'Correo inválido': 'Invalid email address.',
  'Ya te enviamos un código. Espera un momento.': 'We already sent you a code. Please wait a moment.',
  'Demasiados intentos. Espera un momento.': 'Too many attempts. Please wait a moment.',
  'Suscripción no disponible por ahora. Intenta más tarde.': 'Subscription is not available right now. Try again later.',
  'No se pudo enviar el código. Intenta más tarde.': 'We couldn\'t send the code. Try again later.',
  'Solicita un código primero.': 'Request a code first.',
  'El código expiró. Pide uno nuevo.': 'The code has expired. Request a new one.',
  'Demasiados intentos. Pide un código nuevo.': 'Too many attempts. Request a new code.',
  'Código incorrecto.': 'Wrong code.',
  'Error verificando el código.': 'Error verifying the code.',
  'Revisa los datos del formulario.': 'Check the information in the form.',
  'El libro no está disponible en este momento. Escríbenos por WhatsApp.': 'The complaints book is not available right now. Message us on WhatsApp.',
};

export function mensajeServidor(mensaje, idioma, generico) {
  if (!mensaje) return generico;
  return idioma === 'en' ? (EN[mensaje] || generico) : mensaje;
}
