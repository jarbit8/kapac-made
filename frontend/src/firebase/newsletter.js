// Suscripción al newsletter con verificación por código (vía Cloud Functions)
// Los errores propios vuelven como `error` (el Footer los pone en el idioma activo);
// los del servidor, como `mensaje`.
const BASE = 'https://us-central1-kapac-made.cloudfunctions.net';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Paso 1: pedir que envíen un código al correo
export async function pedirCodigo(email) {
  const correo = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(correo)) return { ok: false, error: 'correo' };
  try {
    const res = await fetch(`${BASE}/enviarCodigoNewsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true, yaExistia: !!data.yaExistia };
    return { ok: false, mensaje: data.mensaje };
  } catch (e) {
    return { ok: false, error: 'conexion' };
  }
}

// Paso 2: confirmar el código → queda suscrito (correo verificado)
export async function confirmarCodigo(email, codigo) {
  const correo = (email || '').trim().toLowerCase();
  const cod = (codigo || '').trim();
  if (!cod) return { ok: false, error: 'codigo_vacio' };
  try {
    const res = await fetch(`${BASE}/verificarCodigoNewsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo, codigo: cod }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, mensaje: data.mensaje };
  } catch (e) {
    return { ok: false, error: 'conexion' };
  }
}
