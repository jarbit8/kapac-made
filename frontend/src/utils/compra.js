// Datos de la compra que pasan de una pantalla a otra (sessionStorage), el respaldo
// para cambiar de método de pago y el ajuste del carrito con el catálogo.

const RESPALDO = 'checkout_respaldo';
const REEMPLAZADOS = 'pedidos_reemplazados';

// La sesión anónima que deja una compra de invitado no es una cuenta: no tiene correo ni perfil
export const cuentaDe = (usuario) => (usuario && !usuario.isAnonymous && usuario.email ? usuario : null);

const guardado = (clave) => {
  try { return (sessionStorage.getItem(clave) || '').trim(); } catch (_) { return ''; }
};

// Correo del pedido y del cobro: el de la cuenta o el que quedó del checkout; nunca "null"
export function correoCompra(usuario) {
  const cuenta = cuentaDe(usuario);
  if (cuenta) return cuenta.email;
  const correo = guardado('checkout_email');
  return /^\S+@\S+\.\S+$/.test(correo) ? correo : '';
}

// Nombre del pedido: el que se escribió en el checkout
export function nombreCompra(usuario) {
  const nombre = guardado('checkout_nombre');
  return nombre && nombre !== 'null' && nombre !== 'undefined' ? nombre : (cuentaDe(usuario)?.displayName || '');
}

export function guardarRespaldo(datos) {
  try { sessionStorage.setItem(RESPALDO, JSON.stringify(datos)); } catch (_) {}
}

export function borrarRespaldo() {
  try { sessionStorage.removeItem(RESPALDO); } catch (_) {}
}

export function hayRespaldo() {
  try {
    const r = JSON.parse(sessionStorage.getItem(RESPALDO));
    return Array.isArray(r?.items) && r.items.length > 0;
  } catch (_) { return false; }
}

// Deja el checkout como estaba antes de crear el pedido y devuelve los productos del carrito
export function restaurarCheckout() {
  if (!hayRespaldo()) return null;
  try {
    const r = JSON.parse(sessionStorage.getItem(RESPALDO));
    if (r.envio) sessionStorage.setItem('checkout_envio', JSON.stringify(r.envio));
    sessionStorage.setItem('checkout_email', r.email || '');
    sessionStorage.setItem('checkout_nombre', r.nombre || '');
    return r.items;
  } catch (_) { return null; }
}

// Al cambiar de método el pedido anterior queda sin pagar: con "atrás" no se vuelve a ofrecer
export function marcarReemplazado(pedidoId) {
  try {
    const lista = JSON.parse(sessionStorage.getItem(REEMPLAZADOS)) || [];
    sessionStorage.setItem(REEMPLAZADOS, JSON.stringify([...lista, pedidoId].slice(-20)));
  } catch (_) {}
}

export function fueReemplazado(pedidoId) {
  try { return (JSON.parse(sessionStorage.getItem(REEMPLAZADOS)) || []).includes(pedidoId); } catch (_) { return false; }
}

// PagoEfectivo con el código ya generado y todavía sin pagar (aunque no haya tocado "Ya tengo mi código")
export const cipPendiente = (pedido) =>
  pedido?.metodoPago === 'efectivo' && ['procesando_pago', 'verificando_pago'].includes(pedido.estado) && !!pedido.codigoPago;

// Hasta cuándo se puede pagar el código (el servidor lo guarda en segundos), en hora de Lima
export function venceCIP(segundos, idioma) {
  if (!(Number(segundos) > 0)) return null;
  const fecha = new Date(Number(segundos) * 1000);
  return {
    texto: fecha.toLocaleString(idioma === 'en' ? 'en-US' : 'es-PE', {
      timeZone: 'America/Lima', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    }),
    vencido: fecha.getTime() < Date.now(),
  };
}

const CAMPOS = ['nombre', 'nombreEn', 'precio', 'moneda', 'imagenMochila', 'stock', 'cantidad'];

// Sin stock cargado se vende como hasta ahora (99); un valor roto cuenta como agotado
const stockDe = (p) => {
  const s = Number(p.stock ?? 99);
  return Number.isFinite(s) ? s : 0;
};

// Pone cada producto del carrito al día con el catálogo (nombre, precio, foto y stock).
// frescos: id → producto, o null si ya no existe; los que no se pudieron leer no vienen.
export function ajustarCarrito(items, frescos) {
  const avisos = [];
  let cambio = false;
  const nuevos = [];

  items.forEach((item) => {
    if (!frescos.has(item.id)) return nuevos.push(item);
    const p = frescos.get(item.id);
    const stock = p ? stockDe(p) : 0;
    const de = { id: item.id, nombre: item.nombre, nombreEn: item.nombreEn };

    if (!p || p.activo === false || stock < 1 || !(Number(p.precio) > 0)) {
      avisos.push({ ...de, tipo: p && p.activo !== false && stock < 1 ? 'agotado' : 'quitado' });
      cambio = true;
      return;
    }

    const cantidad = Math.min(item.cantidad, stock);
    if (cantidad < item.cantidad) avisos.push({ ...de, tipo: 'stock', stock });
    if (Number(p.precio) !== Number(item.precio)) {
      avisos.push({ ...de, tipo: 'precio', antes: item.precio, ahora: p.precio, moneda: p.moneda || item.moneda });
    }

    const nuevo = {
      ...item,
      nombre: p.nombre || item.nombre,
      nombreEn: p.nombreEn,
      precio: p.precio,
      moneda: p.moneda || item.moneda,
      imagenMochila: p.imagenMochila || item.imagenMochila,
      stock,
      cantidad,
    };
    if (CAMPOS.every((k) => nuevo[k] === item[k])) return nuevos.push(item);
    cambio = true;
    nuevos.push(nuevo);
  });

  return { items: nuevos, avisos, cambio };
}
