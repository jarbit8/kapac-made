// Traducción automática ES→EN con caché (en memoria + localStorage).
// Intenta Google y cae a MyMemory si falla. Si ambos fallan devuelve null
// (nunca el texto original, para no envenenar cachés con español).
const memoria = {};

async function viaGoogle(t) {
  const res = await fetch(
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=' + encodeURIComponent(t)
  );
  if (!res.ok) return null;
  const data = await res.json();
  const out = (data?.[0] || []).map((seg) => (seg && seg[0]) || '').join('');
  return out.trim() ? out : null;
}

async function viaMyMemory(t) {
  const res = await fetch(
    'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(t) + '&langpair=es|en'
  );
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  const fallo = !out || typeof out !== 'string' || data?.responseStatus !== 200 || /MYMEMORY WARNING/i.test(out);
  return fallo ? null : out;
}

export async function traducirEsEn(texto) {
  const t = (texto || '').trim();
  if (!t) return '';
  if (memoria[t]) return memoria[t];
  try {
    const guardado = localStorage.getItem('tr:' + t);
    if (guardado) { memoria[t] = guardado; return guardado; }
  } catch (e) { /* sin localStorage */ }

  let out = null;
  try { out = await viaGoogle(t); } catch (e) { /* offline o bloqueado */ }
  if (!out) {
    try { out = await viaMyMemory(t); } catch (e) { /* offline o límite alcanzado */ }
  }
  if (out) {
    memoria[t] = out;
    try { localStorage.setItem('tr:' + t, out); } catch (e) {}
  }
  return out;
}
