// Suscripción al newsletter con verificación por código (vía Cloud Functions)
const BASE = 'https://us-central1-kapac-made.cloudfunctions.net';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Paso 1: pedir que envíen un código al correo
export async function pedirCodigo(email) {
  const correo = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(correo)) return { ok: false, mensaje: 'Ingresa un correo válido.' };
  try {
    const res = await fetch(`${BASE}/enviarCodigoNewsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true, yaExistia: !!data.yaExistia };
    return { ok: false, mensaje: data.mensaje || 'No se pudo enviar el código.' };
  } catch (e) {
    return { ok: false, mensaje: 'Error de conexión. Intenta más tarde.' };
  }
}

// Paso 2: confirmar el código → queda suscrito (correo verificado)
export async function confirmarCodigo(email, codigo) {
  const correo = (email || '').trim().toLowerCase();
  const cod = (codigo || '').trim();
  if (!cod) return { ok: false, mensaje: 'Ingresa el código.' };
  try {
    const res = await fetch(`${BASE}/verificarCodigoNewsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo, codigo: cod }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, mensaje: data.mensaje || 'Código incorrecto.' };
  } catch (e) {
    return { ok: false, mensaje: 'Error de conexión. Intenta más tarde.' };
  }
}
