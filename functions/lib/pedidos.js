// Monto, items y stock de un pedido: siempre desde la base, nunca lo que manda el navegador.
// Reciben la base (db) para poder probarlas con una falsa.
const { ipCliente } = require('./validar');

// Recalcula el pedido REAL leyendo cada producto: precio y nombre salen de la base,
// así no se puede ni pagar de menos ni listar un producto distinto al que se cobra.
// Devuelve { centimos, items } ya saneados.
async function recalcularPedido(db, items, { revisarStock = true } = {}) {
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
    if (revisarStock && Number.isFinite(stock) && cant > stock) throw new Error('Sin stock suficiente: ' + (prod.nombre || it.id));
    soles += precio * cant;
    limpios.push({ id: it.id, nombre: prod.nombre || '', precio, cantidad: cant });
  }
  const centimos = Math.round(soles * 100);
  if (!Number.isInteger(centimos) || centimos <= 0) throw new Error('Monto inválido');
  return { centimos, items: limpios };
}

// Descuenta (signo -1, al pagarse) o devuelve (+1, al cancelar) el stock del pedido,
// una sola vez aunque el trigger se ejecute dos veces.
async function moverStock(db, pedidoRef, signo) {
  await db.runTransaction(async (tx) => {
    const pedido = (await tx.get(pedidoRef)).data() || {};
    if (!!pedido.stockDescontado === (signo < 0)) return; // ya lo hizo otra ejecución
    const items = pedido.items || [];
    const refs = items.map((i) => db.collection('productos').doc(i.id));
    const productos = await Promise.all(refs.map((r) => tx.get(r)));
    productos.forEach((p, i) => {
      if (!p.exists) return;
      const actual = Number(p.data().stock);
      if (!Number.isFinite(actual)) return;
      const cantidad = parseInt(items[i].cantidad, 10) || 0;
      tx.update(refs[i], { stock: Math.max(0, actual + signo * cantidad) });
    });
    tx.update(pedidoRef, { stockDescontado: signo < 0 });
  });
}

// Límite por IP: true si se permite, false si llamó hace menos de `segundos`.
// Usa la colección `limites_ip` (solo la lee y escribe el servidor).
async function permitirIP(db, req, segundos, prefijo = '') {
  const ref = db.collection('limites_ip').doc(prefijo + ipCliente(req));
  const snap = await ref.get();
  if (snap.exists && Date.now() - (snap.data().ultimo || 0) < segundos * 1000) return false;
  await ref.set({ ultimo: Date.now() });
  return true;
}

module.exports = { recalcularPedido, moverStock, permitirIP };
