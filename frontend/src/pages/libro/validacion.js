export const VACIO = {
  nombre: '', documentoTipo: 'DNI', documento: '', domicilio: '', telefono: '', email: '',
  menorDeEdad: false, apoderado: '',
  bienTipo: 'producto', bienDescripcion: '', monto: '', pedidoId: '',
  tipo: '', detalle: '', pedido: '',
};

export const DOCUMENTOS = ['DNI', 'CE', 'Pasaporte', 'RUC'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const limpiar = (v) => v.trim().replace(/\s+/g, ' ');
const letras = (v) => (v.match(/\p{L}/gu) || []).length;
const fuera = (v, min, max) => v.length < min || v.length > max;

// Devuelve los datos ya limpios y, por campo, la clave del mensaje de error
export function validar(f) {
  const d = {
    tipo: f.tipo,
    nombre: limpiar(f.nombre),
    documentoTipo: f.documentoTipo,
    documento: f.documentoTipo === 'DNI' || f.documentoTipo === 'RUC' ? f.documento.trim() : f.documento.trim().toUpperCase(),
    domicilio: limpiar(f.domicilio),
    telefono: limpiar(f.telefono),
    email: f.email.trim(),
    menorDeEdad: f.menorDeEdad,
    apoderado: f.menorDeEdad ? limpiar(f.apoderado) : '',
    bienTipo: f.bienTipo,
    bienDescripcion: limpiar(f.bienDescripcion),
    monto: null,
    pedidoId: f.pedidoId.trim(),
    detalle: f.detalle.trim(),
    pedido: f.pedido.trim(),
  };
  const e = {};
  if (fuera(d.nombre, 2, 120) || letras(d.nombre) < 2) e.nombre = 'libro.err_nombre';
  const reglaDoc = d.documentoTipo === 'DNI' ? /^\d{8}$/ : d.documentoTipo === 'RUC' ? /^\d{11}$/ : /^[A-Z0-9]{6,15}$/;
  if (!reglaDoc.test(d.documento)) {
    e.documento = d.documentoTipo === 'DNI' ? 'libro.err_doc_dni' : d.documentoTipo === 'RUC' ? 'libro.err_doc_ruc' : 'libro.err_doc_otro';
  }
  if (fuera(d.domicilio, 5, 200)) e.domicilio = 'libro.err_domicilio';
  if (d.telefono.length > 20) e.telefono = 'libro.err_telefono';
  if (fuera(d.email, 1, 120) || !EMAIL_RE.test(d.email)) e.email = 'libro.err_correo';
  if (d.menorDeEdad && fuera(d.apoderado, 2, 120)) e.apoderado = 'libro.err_apoderado';
  if (fuera(d.bienDescripcion, 3, 300)) e.bienDescripcion = 'libro.err_bien_desc';
  const monto = f.monto.trim();
  if (monto) {
    if (/^\d{1,6}([.,]\d{1,2})?$/.test(monto) && Number(monto.replace(',', '.')) <= 100000) d.monto = Number(monto.replace(',', '.'));
    else e.monto = 'libro.err_monto';
  }
  if (d.pedidoId.length > 40) e.pedidoId = 'libro.err_pedido_id';
  if (!d.tipo) e.tipo = 'libro.err_tipo';
  if (fuera(d.detalle, 10, 3000)) e.detalle = 'libro.err_detalle';
  if (fuera(d.pedido, 3, 1500)) e.pedido = 'libro.err_pedido';
  return { datos: d, errores: e };
}
