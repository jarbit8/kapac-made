// Copia junto a la página las fotos de Storage que usa el sitio: GitHub Pages las entrega
// mucho más rápido. Deja el mapa en window.__FOTOS__ (lo lee src/utils/fotos.js) y el
// contenido y los textos del momento en window.__CONTENIDO__, para que la primera visita
// no espere a Firestore. Si algo falla, la página se publica igual y todo sale de Firebase.
const fs = require('fs');
const path = require('path');

const build = path.join(__dirname, '..', 'build');
const DOCS = 'https://firestore.googleapis.com/v1/projects/kapac-made/databases/(default)/documents';
const MAX_MB = 2; // lo más pesado son fotos viejas que ya no se muestran

// Valores de la API REST de Firestore -> JSON normal
function valor(v) {
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, valor(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('nullValue' in v) return null;
  return Object.values(v)[0];
}

async function leerFirestore() {
  const urls = new Set();
  const docs = {};
  for (const ruta of ['contenido/sitio', 'contenido/textos', 'productos?pageSize=300']) {
    const r = await fetch(`${DOCS}/${ruta}`);
    if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
    const texto = await r.text();
    docs[ruta] = JSON.parse(texto);
  }
  const contenido = {
    sitio: valor({ mapValue: docs['contenido/sitio'] }),
    textos: valor({ mapValue: docs['contenido/textos'] }),
    // Los borradores no van en la página publicada
    productos: (docs['productos?pageSize=300'].documents || [])
      .map((d) => ({ id: d.name.split('/').pop(), ...valor({ mapValue: d }) }))
      .filter((p) => p.activo !== false),
  };
  for (const u of JSON.stringify(contenido).match(/https:\/\/firebasestorage\.googleapis\.com\/[^"\\\s]+/g) || []) urls.add(u);
  return { urls: [...urls], contenido };
}

async function copiar(url, mapa) {
  const ruta = decodeURIComponent((url.split('/o/')[1] || '').split('?')[0]);
  if (!ruta || mapa[ruta]) return;
  const r = await fetch(url);
  const tipo = r.headers.get('content-type') || '';
  if (!r.ok || !tipo.startsWith('image/')) return;
  const datos = Buffer.from(await r.arrayBuffer());
  if (datos.length > MAX_MB * 1024 * 1024) return;
  const nombre = ruta.replace(/[^\w.-]/g, '-');
  fs.writeFileSync(path.join(build, 'f', nombre), datos);
  mapa[ruta] = `/f/${nombre}`;
}

async function main() {
  fs.mkdirSync(path.join(build, 'f'), { recursive: true });
  const { urls, contenido } = await leerFirestore();
  const mapa = {};
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map((u) => copiar(u, mapa).catch(() => {})));
  }
  const archivo = path.join(build, 'index.html');
  const json = (x) => JSON.stringify(x).replace(/</g, '\\u003c');
  const script = `<script>window.__FOTOS__=${json(mapa)};window.__CONTENIDO__=${json(contenido)}</script>`;
  // Después del charset, que tiene que quedar en los primeros 1024 bytes
  const html = fs.readFileSync(archivo, 'utf8');
  const charset = html.match(/<meta charset="utf-8"\s*\/?>/i);
  fs.writeFileSync(archivo, charset ? html.replace(charset[0], charset[0] + script) : html.replace('<head>', `<head>${script}`));
  console.log(`${Object.keys(mapa).length} fotos copiadas de ${urls.length}`);
}

main().catch((e) => console.log(`Fotos sin copiar (salen de Storage): ${e.message}`));
