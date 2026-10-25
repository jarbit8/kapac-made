// Sirve la copia compilada como lo hace GitHub Pages: archivo exacto, luego ruta.html y si no 404.html
// (con estado 404, que es la misma página). Uso: node servidor.js <carpeta> <puerto>
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RAIZ = process.argv[2];
const PUERTO = Number(process.argv[3] || 6019);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

const archivoDe = (ruta) => {
  const f = path.join(RAIZ, ruta);
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
};

http.createServer((req, res) => {
  let ruta;
  try { ruta = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'; } catch (_) { ruta = '404.html'; }
  if (ruta.includes('..')) { res.writeHead(400); res.end(); return; }
  let archivo = archivoDe(ruta) || archivoDe(`${ruta}.html`);
  let estado = 200;
  if (!archivo) { archivo = path.join(RAIZ, '404.html'); estado = 404; }
  const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
  let cuerpo = fs.readFileSync(archivo);
  const cab = { 'Content-Type': tipo, 'Cache-Control': 'max-age=600' };
  if (/text|javascript|json|svg/.test(tipo) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    cuerpo = zlib.gzipSync(cuerpo);
    cab['Content-Encoding'] = 'gzip';
  }
  cab['Content-Length'] = cuerpo.length;
  res.writeHead(estado, cab);
  res.end(cuerpo);
}).listen(PUERTO, '127.0.0.1', () => console.log(`listo ${PUERTO}`));
