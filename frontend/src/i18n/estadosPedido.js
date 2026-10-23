import TEXTOS from '../config/textosPedidos.json';

// Estados viejos → su equivalente
const VIEJOS = { pendiente: 'verificando_pago', verificando: 'procesando_pago', pagado: 'pendiente_envio' };

// El texto de un estado depende del método (Yape QR o PagoEfectivo) o de la entrega
export function textosEstado(pedido, estado = pedido?.estado) {
  const casos = TEXTOS.estados[VIEJOS[estado] || estado];
  if (!casos) return null;
  const recojo = pedido?.envio?.tipo !== 'envio';
  return casos[pedido?.metodoPago === 'efectivo' ? 'pagoefectivo' : 'yape_qr'] || casos[recojo ? 'recojo' : 'domicilio'] || casos.todos;
}

const enIdioma = (t, campo, idioma) => (idioma === 'en' && t[`${campo}_en`]) || t[campo];

export function nombreEstado(pedido, idioma, estado) {
  const t = textosEstado(pedido, estado);
  return t ? enIdioma(t, 'nombre', idioma) : (estado || pedido?.estado || '—');
}

export function textoPagina(pedido, idioma) {
  const t = textosEstado(pedido);
  return t ? { titulo: enIdioma(t, 'pagina_titulo', idioma), texto: enIdioma(t, 'pagina_texto', idioma) } : null;
}
