// Traducción automática ES→EN con caché (en memoria + localStorage).
// Usa la API gratuita de MyMemory. Si falla, devuelve el texto original.
const memoria = {};

export async function traducirEsEn(texto) {
  const t = (texto || '').trim();
  if (!t) return '';
  if (memoria[t]) return memoria[t];
  try {
    const guardado = localStorage.getItem('tr:' + t);
    if (guardado) { memoria[t] = guardado; return guardado; }
  } catch (e) { /* sin localStorage */ }

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=es|en`
    );
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (out && typeof out === 'string') {
      memoria[t] = out;
      try { localStorage.setItem('tr:' + t, out); } catch (e) {}
      return out;
    }
  } catch (e) { /* offline o límite alcanzado */ }
  return t;
}
