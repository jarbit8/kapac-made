// Arma pedidos.html, visitas.html y reclamos.html con los textos de textos-pedidos.json
// y las plantillas reales de los correos (functions/correos.js)
const fs = require('fs');
const path = require('path');

const AQUI = __dirname;
const RAIZ = path.join(AQUI, '..');
const ARCHIVO = path.join(AQUI, 'textos-pedidos.json');

function leerTextos() {
  const crudo = fs.readFileSync(ARCHIVO, 'utf8');
  try {
    return JSON.parse(crudo);
  } catch (e) {
    const pos = Number((e.message.match(/position (\d+)/) || [])[1]);
    const linea = Number.isFinite(pos) ? crudo.slice(0, pos).split('\n').length : null;
    console.log('\n  Hay un error en textos-pedidos.json' + (linea ? ` cerca de la linea ${linea}` : '') + '.');
    console.log('  Revisa que no falte una coma o unas comillas.\n');
    process.exit(1);
  }
}

const TEXTOS = leerTextos();
const CAMPOS = ['nombre', 'nombre_en', 'pagina_titulo', 'pagina_titulo_en', 'pagina_texto', 'pagina_texto_en'];
const faltan = [];
for (const [estado, casos] of Object.entries(TEXTOS.estados)) {
  for (const [caso, t] of Object.entries(casos)) {
    CAMPOS.forEach((c) => { if (typeof t[c] !== 'string') faltan.push(`${estado} > ${caso} > ${c}`); });
    if (t.correo) ['asunto', 'titulo', 'mensaje'].forEach((c) => { if (typeof t.correo[c] !== 'string') faltan.push(`${estado} > ${caso} > correo > ${c}`); });
  }
}
if (faltan.length) {
  console.log('\n  Falta este texto en textos-pedidos.json:\n   ' + faltan.join('\n   ') + '\n');
  process.exit(1);
}

// La página y los correos usan su propia copia
fs.copyFileSync(ARCHIVO, path.join(RAIZ, 'functions', 'textos-pedidos.json'));
fs.copyFileSync(ARCHIVO, path.join(RAIZ, 'frontend', 'src', 'config', 'textosPedidos.json'));
const { correoPedido, correoReclamo, correoRespuestaReclamo } = require(path.join(RAIZ, 'functions', 'correos.js'));

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// Íconos de la página (los mismos trazos de components/Icono.jsx)
const ICONOS = {};
const fuenteIconos = fs.readFileSync(path.join(RAIZ, 'frontend', 'src', 'components', 'Icono.jsx'), 'utf8');
for (const m of fuenteIconos.matchAll(/^\s+(\w+): (<.*>),$/gm)) {
  if (!ICONOS[m[1]]) ICONOS[m[1]] = m[2].replace(/<\/?>/g, '');
}
const icono = (n, tam = 20) => `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ''}</svg>`;

const ESTILO_BASE = `
:root{--tinta:#111;--gris:#6b6760;--linea:#e7e3dc;--fondo:#f4f2ee;--blanco:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--tinta);font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px;line-height:1.5}
.envoltura{max-width:1180px;margin:0 auto;padding:28px 16px 80px}
h1{font-family:'Archivo',sans-serif;font-stretch:125%;font-weight:900;font-size:clamp(28px,6vw,46px);line-height:1;letter-spacing:-.5px;margin:0 0 12px;text-transform:uppercase}
h2{font-size:18px;margin:36px 0 10px}
.intro{max-width:760px;color:#3f3c37;margin:0 0 22px}
.menu{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 22px}
.menu a{padding:7px 12px;border:1px solid var(--tinta);color:var(--tinta);text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:1px}
.menu a.activo{background:var(--tinta);color:#fff}
.nota{background:#fff;border-left:4px solid var(--tinta);padding:12px 16px;margin:0 0 18px;font-size:13px}
.tarjeta{background:#fff;border:1px solid var(--linea);padding:18px;margin:0 0 16px}
.etiqueta{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gris);margin:0 0 8px}
iframe.correo{width:100%;border:1px solid var(--linea);background:#f2efe9;display:block;height:700px}
.asunto{font-size:13px;margin:0 0 8px;padding:8px 10px;background:#faf8f4;border:1px solid var(--linea)}
.asunto b{font-weight:700}
.sin-correo{padding:22px;border:1px dashed #c9c4bb;color:var(--gris);text-align:center}
img.captura{width:100%;height:auto;display:block;border:1px solid var(--linea)}
.capturas{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1.1fr);gap:14px;align-items:start}
@media (max-width:760px){.capturas{grid-template-columns:1fr}}
`;

function pagina({ titulo, activo, cuerpo, script = '' }) {
  const enlaces = [['pedidos.html', 'Pedidos'], ['visitas.html', 'Visitas'], ['reclamos.html', 'Reclamos']]
    .map(([href, nombre]) => `<a href="${href}"${activo === href ? ' class="activo"' : ''}>${nombre}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Kapac Made</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${ESTILO_BASE}</style>
<script>function ajustar(f){try{f.style.height=(f.contentDocument.documentElement.scrollHeight+4)+'px'}catch(e){}}</script>
</head>
<body>
<div class="envoltura">
<nav class="menu">${enlaces}</nav>
${cuerpo}
</div>
<script>
${script}
</script>
</body>
</html>`;
}

const correoFrame = (c) => (c
  ? `<p class="asunto"><b>Asunto:</b> ${esc(c.asunto)}</p><iframe class="correo" loading="lazy" onload="ajustar(this)" srcdoc="${esc(c.html)}"></iframe>`
  : '<div class="sin-correo">No llega correo en este paso</div>');

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
const METODOS = {
  yape: { nombre: 'Yape (QR)', panel: 'Yape (QR)', icono: 'celular' },
  'yape-codigo': { nombre: 'Yape (código de aprobación)', panel: 'Yape (código de aprobación)', icono: 'celular' },
  tarjeta: { nombre: 'Tarjeta', panel: 'Tarjeta', icono: 'tarjeta' },
  efectivo: { nombre: 'PagoEfectivo', panel: 'PagoEfectivo', icono: 'billete' },
};
const ENTREGAS = {
  domicilio: { nombre: 'Envío a domicilio', envio: { tipo: 'envio', direccion: 'Calle Mercaderes 123', distrito: 'Cercado, Arequipa', telefono: '987654321' } },
  recojo: { nombre: 'Recojo en Arequipa', envio: { tipo: 'recojo', telefono: '987654321' } },
};

// Quién cambia cada estado y qué pasa además, según el método
function pasos(metodo) {
  const lista = [{ estado: 'procesando_pago', quien: 'El sistema', cuando: 'El cliente eligió cómo pagar y está en la pantalla de pago.', extra: 'Si cierra sin pagar, el pedido se queda así en "Mis pedidos" y en tu panel.' }];
  if (metodo === 'yape') lista.push({ estado: 'verificando_pago', quien: 'El cliente', cuando: 'Escaneó el QR, yapeó y tocó "Ya realicé el pago".', extra: 'Tú revisas tu Yape y, si llegó la plata, lo pasas a pagado en el panel.' });
  if (metodo === 'efectivo') lista.push({ estado: 'verificando_pago', quien: 'El cliente', cuando: 'Generó su código CIP y tocó "Ya tengo mi código".', extra: 'Tiene 48 horas para pagarlo. No tienes que hacer nada: cuando pague, Culqi avisa solo.' });
  lista.push({
    estado: 'pendiente_envio',
    quien: metodo === 'yape' ? 'Tú, en el panel' : 'Automático',
    cuando: metodo === 'yape' ? 'Confirmaste que te llegó el Yape.' : metodo === 'efectivo' ? 'El cliente pagó su CIP y Culqi lo confirmó.' : 'Culqi aprobó el pago al instante.',
    extra: 'Se descuenta el stock del producto.',
  });
  lista.push({ estado: 'enviado', quien: 'Tú, en el panel', cuando: 'domicilio:Mandaste la mochila.|recojo:La mochila ya está lista en Arequipa.' });
  lista.push({ estado: 'entregado', quien: 'Tú, en el panel', cuando: 'domicilio:Le llegó al cliente.|recojo:El cliente la recogió.' });
  lista.push({ estado: 'cancelado', quien: 'Tú, en el panel', cuando: 'En cualquier momento antes de entregarlo.', extra: 'Si ya estaba pagado, el stock vuelve solo. La devolución del dinero la haces tú (desde Culqi o por Yape).' });
  return lista;
}

function textosEstado(estado, metodo, entrega) {
  const casos = TEXTOS.estados[estado];
  return casos[metodo === 'efectivo' ? 'pagoefectivo' : 'yape_qr'] || casos[entrega] || casos.todos;
}

const vence = Math.floor(Date.now() / 1000) + 48 * 3600;
const correos = {};
const flujos = {};
for (const metodo of Object.keys(METODOS)) {
  for (const entrega of Object.keys(ENTREGAS)) {
    flujos[`${metodo}|${entrega}`] = pasos(metodo).map((p) => {
      const t = textosEstado(p.estado, metodo, entrega);
      const c = correoPedido({
        pedidoId: 'K7Q2M9XAp1', estado: p.estado, total: 180, items: [{ nombre: 'Mochila Kapac Test', precio: 180, cantidad: 1 }],
        envio: ENTREGAS[entrega].envio, metodoPago: metodo, codigoPago: '12345678', codigoPagoVence: vence,
      });
      let idCorreo = null;
      if (c) {
        idCorreo = Object.keys(correos).find((k) => correos[k].html === c.html);
        if (!idCorreo) { idCorreo = 'c' + Object.keys(correos).length; correos[idCorreo] = c; }
      }
      const cuando = p.cuando.includes('|') ? p.cuando.split('|').find((x) => x.startsWith(entrega)).split(':')[1] : p.cuando;
      return { estado: p.estado, quien: p.quien, cuando, extra: p.extra || '', t, correo: idCorreo };
    });
  }
}

const COLORES_PANEL = {
  procesando_pago: ['#fff3cd', '#856404'], verificando_pago: ['#fff3cd', '#856404'], pendiente_envio: ['#d4edda', '#155724'],
  enviado: ['#cce5ff', '#004085'], entregado: ['#d1e7dd', '#0f5132'], cancelado: ['#f8d7da', '#842029'],
};
const COLORES_CLIENTE = {
  procesando_pago: ['#fff3cd', '#856404'], verificando_pago: ['#e8d5f5', '#5f0a87'], pendiente_envio: ['#d4edda', '#155724'],
  enviado: ['#cce5ff', '#004085'], entregado: ['#d1e7dd', '#0f5132'], cancelado: ['#f8d7da', '#842029'],
};

// Todas las palabras: una fila por estado y caso
const NOMBRE_CASO = { todos: 'Todos', yape_qr: 'Yape (QR)', pagoefectivo: 'PagoEfectivo', domicilio: 'Envío a domicilio', recojo: 'Recojo en Arequipa' };
const filasTabla = Object.entries(TEXTOS.estados).flatMap(([estado, casos]) => Object.entries(casos).map(([caso, t]) => `
  <tr>
    <td><code>${estado}</code><br><span class="gris">${esc(NOMBRE_CASO[caso] || caso)}</span></td>
    <td><b>${esc(t.nombre)}</b><br><span class="gris">${esc(t.nombre_en)}</span></td>
    <td><b>${esc(t.pagina_titulo)}</b><br>${esc(t.pagina_texto)}</td>
    <td>${t.correo ? `<b>${esc(t.correo.asunto)}</b><br>${esc(t.correo.titulo)}<br><span class="gris">${esc(t.correo.mensaje)}</span>` : '<span class="gris">Sin correo</span>'}</td>
  </tr>`)).join('');

const cuerpoPedidos = `
<h1>Pedidos</h1>
<p class="intro">Elige cómo paga el cliente y cómo recibe su pedido. Abajo sale cada paso en orden: quién lo cambia, lo que se ve en la página, lo que ves tú en el panel y el correo que le llega al cliente, igualito al real.</p>
<div class="nota">Los textos salen de <b>textos-pedidos.json</b> (en esta misma carpeta). Cámbialos ahí y haz doble clic en <b>Ver cambios.bat</b> para ver cómo quedan. El cliente recibe correos solo si en la confirmación eligió <b>"¿Te avisamos por correo?"</b>; al elegirlo le llega al toque el correo del paso en que está.</div>

<div class="selector">
  <div><p class="etiqueta">Cómo paga</p><div class="botones" id="metodos"></div></div>
  <div><p class="etiqueta">Cómo recibe</p><div class="botones" id="entregas"></div></div>
  <div><p class="etiqueta">Página en</p><div class="botones" id="idiomas"></div></div>
</div>
<div id="flujo"></div>

<h2>Todas las palabras del pedido</h2>
<p class="intro">Cada estado con sus variantes. "Página" es lo que sale en la confirmación del pedido; el nombre sale también en "Mis pedidos" y en tu panel.</p>
<div class="tabla-caja"><table class="tabla">
  <thead><tr><th>Estado</th><th>Nombre</th><th>Página</th><th>Correo</th></tr></thead>
  <tbody>${filasTabla}</tbody>
</table></div>
<h2>Palabras fijas de los correos de pedido</h2>
<div class="tabla-caja"><table class="tabla"><tbody>
${Object.entries(TEXTOS.correo_comun).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(v)}</td></tr>`).join('')}
</tbody></table></div>`;

const estiloPedidos = `
.selector{display:grid;grid-template-columns:repeat(3,auto);gap:14px 28px;justify-content:start;margin:0 0 22px;position:sticky;top:0;background:var(--fondo);padding:10px 0;z-index:2;border-bottom:1px solid var(--linea)}
.botones{display:flex;gap:6px;flex-wrap:wrap}
.botones button{font:inherit;font-size:13px;padding:9px 12px;min-height:42px;border:1px solid var(--tinta);background:#fff;color:var(--tinta);cursor:pointer}
.botones button.on{background:var(--tinta);color:#fff}
@media (max-width:760px){.selector{grid-template-columns:1fr;position:static}}
.paso{background:#fff;border:1px solid var(--linea);margin:0 0 18px}
.paso-cab{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-bottom:1px solid var(--linea)}
.paso-num{flex:0 0 34px;height:34px;border-radius:50%;background:var(--tinta);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
.paso-cab p{margin:0}
.quien{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gris)}
.extra{color:var(--gris);font-size:13px;margin-top:4px!important}
.paso-cuerpo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:18px;padding:18px}
@media (max-width:860px){.paso-cuerpo{grid-template-columns:1fr}}
.vista{border:1px solid var(--linea);padding:14px;margin:0 0 12px;background:#fff}
.conf{text-align:center;padding:10px 6px 4px}
.conf-icono{display:flex;justify-content:center;margin-bottom:10px;color:var(--tinta)}
.conf-icono.ok{color:#2e7d32}.conf-icono.no{color:#b42318}
.conf h3{font-size:22px;font-weight:800;margin:0 0 8px;font-family:'IBM Plex Mono',monospace}
.conf p{margin:0;color:#555;font-size:13.5px;line-height:1.6}
.recibo{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--linea);margin-top:14px;padding-top:10px;font-size:13px}
.recibo span:first-child{color:#888}
.ok-txt{color:#2e7d32}.no-txt{color:#b42318}
.fila{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.chip{font-size:12px;padding:4px 12px;border-radius:12px;white-space:nowrap}
.chip-panel{font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;letter-spacing:.3px}
.sub{color:#999;font-size:12px}
.tabla-caja{overflow-x:auto;background:#fff;border:1px solid var(--linea)}
.tabla{border-collapse:collapse;width:100%;min-width:720px;font-size:13px}
.tabla th,.tabla td{border-bottom:1px solid var(--linea);padding:10px 12px;text-align:left;vertical-align:top}
.tabla th{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gris)}
.gris{color:var(--gris)}
code{font-size:12px;background:#f3f1ec;padding:1px 5px}
`;

const scriptPedidos = `
const METODOS=${json(METODOS)}, ENTREGAS=${json(Object.fromEntries(Object.entries(ENTREGAS).map(([k, v]) => [k, v.nombre])))};
const FLUJOS=${json(flujos)}, CORREOS=${json(correos)};
const PANEL=${json(COLORES_PANEL)}, CLIENTE=${json(COLORES_CLIENTE)};
const ICONOS=${json({ ok: icono('checkCirculo', 44), espera: icono('reloj', 44), no: icono('alerta', 44) })};
const PAGADOS=['pendiente_envio','enviado','entregado'];
let metodo='yape', entrega='domicilio', idioma='es';
const e=(t)=>String(t??'').replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const en=(t,c)=>(idioma==='en'&&t[c+'_en'])||t[c];
function botones(id,opciones,actual,fn){
  const caja=document.getElementById(id); caja.innerHTML='';
  Object.entries(opciones).forEach(([k,v])=>{const b=document.createElement('button');b.type='button';b.textContent=v.nombre||v;if(k===actual)b.className='on';b.onclick=()=>fn(k);caja.appendChild(b);});
}
function pintar(){
  botones('metodos',METODOS,metodo,(k)=>{metodo=k;pintar();});
  botones('entregas',ENTREGAS,entrega,(k)=>{entrega=k;pintar();});
  botones('idiomas',{es:'Español',en:'Inglés'},idioma,(k)=>{idioma=k;pintar();});
  const pasos=FLUJOS[metodo+'|'+entrega];
  document.getElementById('flujo').innerHTML=pasos.map((p,i)=>{
    const t=p.t, pagado=PAGADOS.includes(p.estado), cancelado=p.estado==='cancelado';
    const [pb,pc]=PANEL[p.estado], [cb,cc]=CLIENTE[p.estado];
    const correo=CORREOS[p.correo];
    const entregaTxt=entrega==='domicilio'?(idioma==='en'?'Ship to':'Envío a')+'</span><span>Calle Mercaderes 123, Cercado, Arequipa':(idioma==='en'?'Delivery':'Entrega')+'</span><span>'+(idioma==='en'?'Pickup in Arequipa':'Recojo en Arequipa');
    return '<section class="paso">'
      +'<div class="paso-cab"><span class="paso-num">'+(cancelado?'×':i+1)+'</span><div>'
      +'<p class="quien">'+e(p.quien)+'</p><p>'+e(p.cuando)+'</p>'+(p.extra?'<p class="extra">'+e(p.extra)+'</p>':'')+'</div></div>'
      +'<div class="paso-cuerpo"><div>'
      +'<p class="etiqueta">Página del pedido (confirmación)</p>'
      +'<div class="vista"><div class="conf"><div class="conf-icono '+(pagado?'ok':cancelado?'no':'')+'">'+(pagado?ICONOS.ok:cancelado?ICONOS.no:ICONOS.espera)+'</div>'
      +'<h3>'+e(en(t,'pagina_titulo'))+'</h3><p>'+e(en(t,'pagina_texto'))+'</p></div>'
      +'<div class="recibo"><span>'+(idioma==='en'?'Status':'Estado')+'</span><span class="'+(pagado?'ok-txt':cancelado?'no-txt':'')+'">'+e(en(t,'nombre'))+'</span></div>'
      +'<div class="recibo"><span>'+entregaTxt+'</span></div></div>'
      +'<p class="etiqueta">Mis pedidos (cliente)</p>'
      +'<div class="vista"><div class="fila"><b>'+(idioma==='en'?'Order':'Pedido')+' #K7Q2M9XA</b><span class="chip" style="background:'+cb+';color:'+cc+'">'+e(en(t,'nombre'))+'</span></div><p class="sub">1× Mochila Kapac Test — S/180.00</p></div>'
      +'<p class="etiqueta">Tu panel (Admin → Pedidos)</p>'
      +'<div class="vista"><div class="fila"><b>#K7Q2M9XA</b><span class="chip-panel" style="background:'+pb+';color:'+pc+'">'+e(t.nombre)+'</span></div><p class="sub">'+e(METODOS[metodo].panel)+' · '+e(ENTREGAS[entrega])+'</p></div>'
      +'</div><div><p class="etiqueta">Correo que le llega al cliente</p>'
      +(correo?'<p class="asunto"><b>Asunto:</b> '+e(correo.asunto)+'</p><iframe class="correo" onload="ajustar(this)" srcdoc="'+e(correo.html)+'"></iframe>':'<div class="sin-correo">No llega correo en este paso</div>')
      +'</div></div></section>';
  }).join('');
}
pintar();
`;

fs.writeFileSync(path.join(AQUI, 'pedidos.html'), pagina({
  titulo: 'Pedidos', activo: 'pedidos.html', cuerpo: `<style>${estiloPedidos}</style>${cuerpoPedidos}`, script: scriptPedidos,
}));

// ─── VISITAS ──────────────────────────────────────────────────────────────────
const existe = (f) => fs.existsSync(path.join(AQUI, f));
const captura = (pc, cel, alt) => `<div class="capturas">
  ${existe(pc) ? `<div><p class="etiqueta">PC</p><img class="captura" src="${pc}" alt="${esc(alt)} en PC"></div>` : ''}
  ${existe(cel) ? `<div><p class="etiqueta">Celular</p><img class="captura" src="${cel}" alt="${esc(alt)} en celular"></div>` : ''}
</div>`;

const PARTES_VISITAS = [
  ['Hoy', 'Cuántas veces entraron al sitio hoy. Una entrada cuenta una vez aunque recorran varias páginas.'],
  ['Últimos 30 días', 'Entradas al sitio en el último mes.'],
  ['Visitantes únicos', 'Personas distintas: si alguien vuelve, no se cuenta dos veces.'],
  ['Identificados', 'Personas que entraron con su cuenta; salen con su correo. Cristhian sale como "Cristhian · correo". Tú no cuentas.'],
  ['Países distintos', 'De cuántos países entraron.'],
  ['Actividad reciente', 'Cada entrada: quién (correo o "Visitante anónimo"), ciudad y país, celular o PC, navegador, por dónde entró, hace cuánto y todo lo que vio ("Vio: Inicio → Tienda → ..."). Con "Ver más" salen más.'],
  ['Visitas por día', 'Barras con las entradas de cada día (últimos 30).'],
  ['Páginas más visitadas', 'Qué páginas recorren dentro de una visita.'],
  ['Visitantes por país y Dispositivos', 'De dónde entran y si es celular, PC o tablet.'],
  ['Con la tienda cerrada', 'Las entradas a la pantalla "Próximamente" salen como "Próximamente (tienda cerrada)".'],
];

fs.writeFileSync(path.join(AQUI, 'visitas.html'), pagina({
  titulo: 'Visitas', activo: 'visitas.html',
  cuerpo: `<h1>Visitas</h1>
<p class="intro">Así se ve la pestaña Visitas de tu panel con datos de ejemplo (personas, ciudades y fechas inventadas). No manda correos.</p>
${captura('capturas/visitas_pc.png', 'capturas/visitas_cel.png', 'Pestaña Visitas')}
<h2>Qué es cada parte</h2>
<div class="tabla-caja"><table class="tabla" style="min-width:0"><tbody>
${PARTES_VISITAS.map(([n, d]) => `<tr><td style="width:30%"><b>${esc(n)}</b></td><td>${esc(d)}</td></tr>`).join('')}
</tbody></table></div>
<style>.tabla{border-collapse:collapse;width:100%;font-size:13px}.tabla td{border-bottom:1px solid var(--linea);padding:10px 12px;vertical-align:top}.tabla-caja{background:#fff;border:1px solid var(--linea)}</style>`,
}));

// ─── RECLAMOS ─────────────────────────────────────────────────────────────────
const ahora = new Date();
const limite = new Date(ahora.getTime() + 21 * 86400000);
const reclamo = {
  codigo: '000001-2026', tipo: 'reclamo', nombre: 'Ana Quispe Mamani', documentoTipo: 'DNI', documento: '45678912',
  domicilio: 'Calle Mercaderes 123, Cercado, Arequipa', telefono: '987654321', email: 'ana@ejemplo.com', menorDeEdad: false, apoderado: '',
  bienTipo: 'producto', bienDescripcion: 'Mochila Kapac Test', monto: 180, pedidoId: 'K7Q2M9XA',
  detalle: 'La costura del tirante se soltó a la semana de uso.', pedido: 'Que me cambien la mochila o me devuelvan el dinero.',
  fecha: ahora, fechaLimite: limite,
};
const respuesta = { ...reclamo, respuesta: 'Hola Ana, lamentamos lo del tirante. Te cambiamos la mochila sin costo: escríbenos por WhatsApp para coordinar el recojo.', fechaRespuesta: ahora };

const PASOS_RECLAMO = [
  ['El cliente llena la hoja', 'Entra a "Libro de Reclamaciones" desde el pie de cualquier página. Llena sus datos, el producto y qué pasó, y elige si es reclamo o queja.', captura('capturas/reclamo_form_pc.png', 'capturas/reclamo_form_cel.png', 'Hoja de reclamación'), null],
  ['Ve su número de reclamo', 'Al enviarla le sale el número (ej. 000001-2026) y puede descargarla o imprimirla.', captura('capturas/reclamo_ok_pc.png', 'capturas/reclamo_ok_cel.png', 'Reclamo enviado'), null],
  ['Le llega su copia', 'Al mismo tiempo le llega al cliente la copia de su hoja con la fecha límite de respuesta (15 días hábiles).', '', correoReclamo(reclamo)],
  ['Te llega el aviso a ti', 'A la tienda le llega el aviso con la hoja completa y la fecha límite. Hoy llega a jarb2299@gmail.com; al abrir la tienda pasa a Cristhian.', '', correoReclamo(reclamo, { paraTienda: true })],
  ['Lo respondes en el panel', 'En Admin → Reclamos ves los pendientes con los días hábiles que quedan (en rojo si quedan 3 o menos). Abres el reclamo, escribes la respuesta y la mandas. Solo se responde una vez.', captura('capturas/reclamo_admin_pc.png', 'capturas/reclamo_admin_cel.png', 'Pestaña Reclamos'), null],
  ['Le llega tu respuesta', 'El cliente recibe tu respuesta junto con su hoja.', '', correoRespuestaReclamo(respuesta)],
];

fs.writeFileSync(path.join(AQUI, 'reclamos.html'), pagina({
  titulo: 'Reclamos', activo: 'reclamos.html',
  cuerpo: `<h1>Reclamos</h1>
<p class="intro">El Libro de Reclamaciones paso a paso, con un reclamo de ejemplo: lo que ve el cliente, lo que ves tú y cada correo, igualitos a los reales.</p>
${PASOS_RECLAMO.map(([titulo, texto, imagenes, correo], i) => `
<section class="tarjeta">
  <p class="etiqueta">Paso ${i + 1}</p>
  <h2 style="margin:0 0 6px">${esc(titulo)}</h2>
  <p style="margin:0 0 14px;color:#3f3c37">${esc(texto)}</p>
  ${imagenes}
  ${correo ? correoFrame(correo) : ''}
</section>`).join('')}`,
}));

console.log('\n  Listo: pedidos.html, visitas.html y reclamos.html actualizados.\n');
