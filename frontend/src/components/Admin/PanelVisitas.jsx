import React from 'react';
import Icono from '../Icono';
import { useIdioma } from '../../context/LanguageContext';
import { NOMBRES } from '../../config/admins';
import { nombreRuta } from '../../firebase/visitas';

const porValor = ([, a], [, b]) => b - a;

// Barras horizontales: una fila por clave de "datos", ordenadas con "orden"
function Barras({ datos, orden = porValor, limite, color, etiqueta = (clave) => clave, children }) {
  const max = Math.max(...Object.values(datos), 1);
  const filas = Object.entries(datos).sort(orden);
  return (
    <div className="admin-tabla-stats">
      {(limite ? filas.slice(0, limite) : filas).map(([clave, n]) => (
        <div key={clave} className="stat-row">
          <span className="stat-fecha">{etiqueta(clave)}</span>
          <div className="stat-bar-wrap">
            <div className="stat-bar" style={{ width: `${Math.max(8, (n / max) * 100)}%`, background: color }} />
          </div>
          <span className="stat-num">{n}</span>
        </div>
      ))}
      {children}
    </div>
  );
}

function tiempoRelativo(fecha) {
  const diff = (Date.now() - fecha.getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function Contador({ color, numero, etiqueta, sub }) {
  return (
    <div className="contador-card" style={{ borderTop: `4px solid ${color}` }}>
      <span className="contador-num">{numero}</span>
      <span className="contador-label">{etiqueta}</span>
      {sub && <span className="contador-sub">{sub}</span>}
    </div>
  );
}

function Visita({ v }) {
  const fecha = v.fecha?.toDate ? v.fecha.toDate() : null;
  const fechaTxt = fecha
    ? fecha.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';
  return (
    <div className="visita-row">
      <div className="visita-bandera"><Icono nombre="ubicacion" tam={18} /></div>
      <div className="visita-info">
        <div className="visita-quien">
          {v.email ? (
            <strong>{NOMBRES[v.email] ? `${NOMBRES[v.email]} · ${v.email}` : v.email}</strong>
          ) : (
            <span style={{ color: '#888' }}>Visitante anónimo</span>
          )}
        </div>
        <div className="visita-meta">
          {v.ciudad && v.ciudad !== 'Desconocida' ? `${v.ciudad}, ` : ''}{v.pais || '—'} · {v.dispositivo} · {v.navegador}
        </div>
        <div className="visita-recorrido">Vio: {v.recorrido.map(nombreRuta).join(' → ')}</div>
      </div>
      <div className="visita-ruta">
        <span className="visita-pagina">{nombreRuta(v.ruta)}</span>
        <span className="visita-fecha">{(fecha && tiempoRelativo(fecha)) || fechaTxt}</span>
      </div>
    </div>
  );
}

const Titulo = ({ children, sub, abajo = 4 }) => (
  <>
    <h3 style={{ marginTop: 32, marginBottom: abajo }}>{children}</h3>
    {sub && <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>{sub}</p>}
  </>
);

// Pestaña Visitas. recientes: las últimas entradas · limite: cuántas se pidieron
export default function PanelVisitas({ stats, recientes, limite, onVerMas }) {
  const { t } = useIdioma();
  const sinVisitas = (
    <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>
      {t('admin.sin_visitas')}
    </p>
  );

  return (
    <div className="admin-visitas">
      <div className="admin-contadores">
        <Contador color="#ff6b35" numero={stats.visitasHoy || 0} etiqueta="Hoy" sub="veces que entraron al sitio hoy" />
        <Contador color="#5f0a87" numero={stats.total} etiqueta="Últimos 30 días" sub="veces que entraron en el mes" />
        <Contador color="#2196f3" numero={stats.visitantesUnicos || 0} etiqueta="Visitantes únicos"
          sub="personas distintas (una que vuelve no se cuenta 2 veces)" />
        <Contador color="#4caf50" numero={stats.logueados} etiqueta="Identificados" sub="personas que entraron con su cuenta" />
        <Contador color="#f57c00" numero={Object.keys(stats.porPais).length} etiqueta="Países distintos" />
      </div>

      <Titulo sub="Cada vez que alguien entró al sitio (no cada página que recorrió después).">Actividad reciente</Titulo>
      <div className="admin-visitas-lista">
        {recientes.length === 0 && sinVisitas}
        {recientes.map((v) => <Visita key={v.id} v={v} />)}
      </div>
      {recientes.length >= limite && (
        <button type="button" className="admin-fila-agregar" style={{ marginTop: 12 }} onClick={onVerMas}>
          Ver más
        </button>
      )}

      <Titulo sub="Cuántas veces entraron al sitio cada día.">Visitas por día</Titulo>
      <Barras datos={stats.porDia} orden={([a], [b]) => b.localeCompare(a)} limite={30}>
        {Object.keys(stats.porDia).length === 0 && sinVisitas}
      </Barras>

      <Titulo sub="Qué páginas recorren dentro de una misma visita.">Páginas más visitadas</Titulo>
      <Barras datos={stats.porRuta} color="#5f0a87" etiqueta={nombreRuta} />

      <Titulo abajo={16}>Visitantes por país</Titulo>
      <Barras datos={stats.porPais} color="#4caf50" />

      {stats.porDispositivo && Object.keys(stats.porDispositivo).length > 0 && (
        <>
          <Titulo abajo={16}>Dispositivos</Titulo>
          <Barras datos={stats.porDispositivo} color="#2196f3" />
        </>
      )}

      <p style={{ marginTop: 30, fontSize: 13, color: '#888', lineHeight: 1.6, background: '#f5f5f5', padding: '14px 18px', borderRadius: 10 }}>
        <strong>Conforme a la Ley 29733 de Protección de Datos Personales</strong>: sin cookies. Los visitantes logueados se identifican
        por su correo (al cual nos dieron consentimiento al loguearse). Los anónimos quedan como "Desconocido".
        La ubicación (país/ciudad) se obtiene vía servicio externo sin guardar la IP cruda. Esto está informado
        en la página <a href="/legal">/legal</a>.
      </p>
    </div>
  );
}
