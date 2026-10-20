// GitHub Pages sirve /catalogo desde catalogo.html con 200; lo demás (productos,
// pagos) cae en 404.html, que es la misma app y resuelve la ruta en el navegador.
const fs = require('fs');
const path = require('path');

const build = path.join(__dirname, '..', 'build');
const index = fs.readFileSync(path.join(build, 'index.html'), 'utf8');
// En Google solo aparece el inicio: las demás páginas no se indexan
const sinIndexar = index.replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex, follow"');
const RUTAS = ['shop', 'kapac-made', 'b2b', 'info', 'legal', 'zone', 'login', 'carrito', 'pedidos', 'checkout', 'metodo-pago', 'perfil', 'admin',
  'catalogo', 'alma', 'contacto'];

for (const r of RUTAS) fs.writeFileSync(path.join(build, `${r}.html`), sinIndexar);
fs.writeFileSync(path.join(build, '404.html'), sinIndexar);
console.log(`${RUTAS.length} páginas + 404.html`);
