// Copia junto a la página las fotos de Storage que usa el sitio: GitHub Pages las entrega
// mucho más rápido. Deja el mapa en window.__FOTOS__ (lo lee src/utils/fotos.js).
// Si algo falla, la página se publica igual y las fotos salen de Storage.
const fs = require('fs');
const path = require('path');

const build = path.join(__dirname, '..', 'build');
const DOCS = 'https://firestore.googleapis.com/v1/projects/kapac-made/databases/(default)/documents';
const MAX_MB = 2; // lo más pesado son fotos viejas que ya no se muestran

async function urlsEnUso() {
  const urls = new Set();
  for (const ruta of ['contenido/sitio', 'contenido/textos', 'productos?pageSize=300']) {
    const r = await fetch(`${DOCS}/${ruta}`);
    if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
    const texto = await r.text();
    for (const u of texto.match(/https:\/\/firebasestorage\.googleapis\.com\/[^"\\\s]+/g) || []) urls.add(u);
  }
  return [...urls];
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
  const urls = await urlsEnUso();
  const mapa = {};
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map((u) => copiar(u, mapa).catch(() => {})));
  }
  const archivo = path.join(build, 'index.html');
  const script = `<script>window.__FOTOS__=${JSON.stringify(mapa).replace(/</g, '\\u003c')}</script>`;
  // Después del charset, que tiene que quedar en los primeros 1024 bytes
  const html = fs.readFileSync(archivo, 'utf8');
  const charset = html.match(/<meta charset="utf-8"\s*\/?>/i);
  fs.writeFileSync(archivo, charset ? html.replace(charset[0], charset[0] + script) : html.replace('<head>', `<head>${script}`));
  console.log(`${Object.keys(mapa).length} fotos copiadas de ${urls.length}`);
}

main().catch((e) => console.log(`Fotos sin copiar (salen de Storage): ${e.message}`));
