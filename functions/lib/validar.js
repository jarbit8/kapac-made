// Lo que llega del navegador o de Culqi se valida aquí (sin Firebase: se prueba solo)
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RELLENO = 'pedidos@kapac-made.com';

// El primer correo válido de la lista (el navegador a veces manda "null")
const correoValido = (...lista) => lista.map((c) => String(c || '').trim()).find((c) => CORREO.test(c)) || RELLENO;

// IP real del cliente: Google agrega la verdadera al FINAL de x-forwarded-for;
// lo que viene antes lo puede inventar cualquiera.
function ipCliente(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.ip || 'na';
  return (ip.replace(/[^\w.:-]/g, '_').slice(0, 60)) || 'na';
}

// Culqi exige nombre y apellido de al menos 2 letras, sin números
function nombreCulqi(nombre) {
  const partes = (nombre || 'Cliente Kapac').split(' ').filter(Boolean);
  const limpio = (v) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '').padEnd(2, 'a');
  return { nombre: limpio(partes[0] || 'Cliente'), apellido: limpio(partes.slice(1).join(' ') || 'Kapac') };
}

// Id de la orden que avisa el webhook (Culqi manda "data" como texto JSON, no como objeto)
function ordenDelAviso(cuerpo) {
  let datos = cuerpo?.data || {};
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos); } catch { datos = {}; }
  }
  return datos?.id || null;
}

// Hoja del Libro de Reclamaciones: valida y limpia lo que manda la página. null si falta algo obligatorio.
function leerReclamo(b) {
  const linea = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
  const parrafo = (v) => String(v ?? '').trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  const letras = (v) => (v.match(/\p{L}/gu) || []).length;
  const largo = (v, min, max) => v.length >= min && v.length <= max;
  const r = {
    tipo: ['reclamo', 'queja'].includes(b.tipo) ? b.tipo : '',
    nombre: linea(b.nombre),
    documentoTipo: ['DNI', 'CE', 'Pasaporte', 'RUC'].includes(b.documentoTipo) ? b.documentoTipo : '',
    documento: linea(b.documento).toUpperCase(),
    domicilio: linea(b.domicilio),
    telefono: linea(b.telefono),
    email: linea(b.email).toLowerCase(),
    menorDeEdad: b.menorDeEdad === true,
    apoderado: b.menorDeEdad === true ? linea(b.apoderado) : '',
    bienTipo: b.bienTipo === 'servicio' ? 'servicio' : 'producto',
    bienDescripcion: linea(b.bienDescripcion),
    monto: b.monto === null || b.monto === undefined || b.monto === '' ? null : Number(b.monto),
    pedidoId: linea(b.pedidoId),
    detalle: parrafo(b.detalle),
    pedido: parrafo(b.pedido),
    idioma: b.idioma === 'en' ? 'en' : 'es',
  };
  const documento = { DNI: /^\d{8}$/, RUC: /^\d{11}$/, CE: /^[A-Z0-9]{6,15}$/, Pasaporte: /^[A-Z0-9]{6,15}$/ }[r.documentoTipo];
  const valido = r.tipo
    && largo(r.nombre, 2, 120) && letras(r.nombre) >= 2
    && documento && documento.test(r.documento)
    && largo(r.domicilio, 5, 200)
    && r.telefono.length <= 20
    && r.email.length <= 120 && CORREO.test(r.email)
    && (!r.menorDeEdad || (largo(r.apoderado, 2, 120) && letras(r.apoderado) >= 2))
    && largo(r.bienDescripcion, 3, 300)
    && (r.monto === null || (Number.isFinite(r.monto) && r.monto >= 0 && r.monto <= 100000))
    && r.pedidoId.length <= 40
    && largo(r.detalle, 10, 3000)
    && largo(r.pedido, 3, 1500);
  return valido ? r : null;
}

// Días hábiles de lunes a viernes en hora de Lima (los feriados no se descuentan)
function sumarDiasHabiles(desde, dias) {
  const d = new Date(desde);
  let sumados = 0;
  while (sumados < dias) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dia = new Date(d.getTime() - 5 * 3600 * 1000).getUTCDay();
    if (dia !== 0 && dia !== 6) sumados++;
  }
  return d;
}

module.exports = { correoValido, ipCliente, nombreCulqi, ordenDelAviso, leerReclamo, sumarDiasHabiles };
