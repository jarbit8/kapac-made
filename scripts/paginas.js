// GitHub Pages sirve /catalogo desde catalogo.html con 200; lo demás (productos,
// pagos) cae en 404.html, que es la misma app y resuelve la ruta en el navegador.
const fs = require('fs');
const path = require('path');

const build = path.join(__dirname, '..', 'build');
const index = fs.readFileSync(path.join(build, 'index.html'));
const RUTAS = ['shop', 'kapac-made', 'b2b', 'info', 'legal', 'zone', 'login', 'carrito', 'pedidos', 'checkout', 'metodo-pago', 'perfil', 'admin',
  'catalogo', 'alma', 'contacto'];

for (const r of RUTAS) fs.writeFileSync(path.join(build, `${r}.html`), index);
fs.writeFileSync(path.join(build, '404.html'), index);
console.log(`${RUTAS.length} páginas + 404.html`);
