// Los textos de los pedidos se editan en descripcion/textos-pedidos.json; la página
// compila con una copia en src/config
const fs = require('fs');
const path = require('path');

const origen = path.join(__dirname, '..', '..', 'descripcion', 'textos-pedidos.json');
const destino = path.join(__dirname, '..', 'src', 'config', 'textosPedidos.json');
JSON.parse(fs.readFileSync(origen, 'utf8'));
fs.copyFileSync(origen, destino);
console.log('textos de pedidos copiados');
