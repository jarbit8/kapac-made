import React from 'react';
import { NOMBRES } from '../../config/admins';
import { nombreRuta, SIN_VISITAS } from '../../firebase/visitas';
import { useIdioma } from '../../context/LanguageContext';
import Icono from '../../components/Icono';

const ZONAS = [
  { key: 'proximamente', label: 'Próximamente' },
  { key: 'login', label: 'Login' },
  { key: 'pagina', label: 'Página' },
];

const DESCRIPCION_ZONA = {
  proximamente: 'Gente que entró mientras la tienda estaba cerrada: solo vio el video de «Coming soon». Si escribió otra dirección, sale cuál quiso abrir.',
  login: 'Quienes abrieron el inicio de sesión y si lograron entrar con su cuenta.',
  pagina: 'Quienes vieron la página por dentro (con la tienda cerrada, solo los admins).',
};

const porClaveDesc = (a, b) => b[0].localeCompare(a[0]);
const porValorDesc = (a, b) => b[1] - a[1];

function BarraStat({ n, max, color }) {
  return (
    <div className="stat-bar-wrap">
      <div className="stat-bar" style={{ width: `${Math.max(8, (n / max) * 100)}%`, background: color }} />
    </div>
  );
}

function FilaStat({ etiqueta, n, max, color, clase }) {
  return (
    <div className={clase ? `stat-row ${clase}` : 'stat-row'}>
      <span className="stat-fecha">{etiqueta}</span>
      <BarraStat n={n} max={max} color={color} />
      <span className="stat-num">{n}</span>
    </div>
  );
}

function FilasStat({ datos, orden, nombre = (k) => k, color, limite }) {
  const max = Math.max(...Object.values(datos), 1);
  return Object.entries(datos)
    .sort(orden)
    .slice(0, limite)
    .map(([k, n]) => <FilaStat key={k} etiqueta={nombre(k)} n={n} max={max} color={color} />);
}

function FilaVisita({ v, zona }) {
  const fechaObj = v.fecha?.toDate ? v.fecha.toDate() : null;
  const fechaTxt = fechaObj
    ? fechaObj.toLocaleString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
    : '—';
  // Tiempo relativo (hace X minutos)
  let tiempoRelativo = '';
  if (fechaObj) {
    const diff = (Date.now() - fechaObj.getTime()) / 1000;
    if (diff < 60) tiempoRelativo = 'hace un momento';
    else if (diff < 3600) tiempoRelativo = `hace ${Math.floor(diff/60)} min`;
    else if (diff < 86400) tiempoRelativo = `hace ${Math.floor(diff/3600)} h`;
    else tiempoRelativo = `hace ${Math.floor(diff/86400)} d`;
  }
  const rutaNombre = nombreRuta(v.ruta);
  return (
    <div className="visita-row">
      <div className="visita-bandera"><Icono nombre="ubicacion" tam={18} /></div>
      <div className="visita-info">
        <div className="visita-quien">
          {v.correo ? (
            <strong>{NOMBRES[v.correo] ? `${NOMBRES[v.correo]} · ${v.correo}` : v.correo}</strong>
          ) : v.robot ? (
            <span style={{ color:'#888' }}>🤖 Entró un robot (un programa, no una persona)</span>
          ) : (
            <span style={{ color:'#888' }}>Visitante anónimo</span>
          )}
        </div>
        <div className="visita-meta">
          {v.ciudad && v.ciudad !== 'Desconocida' ? `${v.ciudad}, ` : ''}{v.pais || '—'} · {v.dispositivo} · {v.navegador}
        </div>
        {zona === 'pagina' && <div className="visita-recorrido">Vio: {v.recorrido.map(nombreRuta).join(' → ')}</div>}
        {zona === 'proximamente' && v.pidio && <div className="visita-recorrido">Quiso abrir: {v.pidio}</div>}
        {zona === 'login' && <div className="visita-recorrido">{v.entro ? 'Entró con su cuenta' : 'No entró'}</div>}
      </div>
      <div className="visita-ruta">
        <span className="visita-pagina">{rutaNombre}</span>
        <span className="visita-fecha">{tiempoRelativo || fechaTxt}</span>
      </div>
    </div>
  );
}

export default function PestanaVisitas({ stats, visitasRecientes, visitasLimite, zona, paisAbierto, setPaisAbierto, cambiarZona, verMasVisitas }) {
  const { t } = useIdioma();
  const datos = stats[zona] || SIN_VISITAS;

  return (
    <div className="admin-visitas">
      <div className="admin-pedidos-filtros">
        {ZONAS.map((z) => (
          <button
            key={z.key}
            className={`admin-filtro-btn ${zona === z.key ? 'activo' : ''}`}
            onClick={() => cambiarZona(z.key)}
          >
            {z.label} ({stats[z.key]?.total || 0})
          </button>
        ))}
      </div>
      <p style={{ color: '#999', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        {DESCRIPCION_ZONA[zona]}
      </p>

      <div className="admin-contadores">
        <div className="contador-card" style={{ borderTop: '4px solid #ff6b35' }}>
          <span className="contador-num">{datos.visitasHoy || 0}</span>
          <span className="contador-label">Hoy</span>
          <span className="contador-sub">veces que entraron al sitio hoy</span>
        </div>
        <div className="contador-card" style={{ borderTop: '4px solid #5f0a87' }}>
          <span className="contador-num">{datos.total}</span>
          <span className="contador-label">Últimos 30 días</span>
          <span className="contador-sub">veces que entraron en el mes</span>
        </div>
        <div className="contador-card" style={{ borderTop: '4px solid #2196f3' }}>
          <span className="contador-num">{datos.visitantesUnicos || 0}</span>
          <span className="contador-label">Visitantes únicos</span>
          <span className="contador-sub">
            personas distintas (una que vuelve no se cuenta 2 veces)
            {datos.robots > 0 && ` · ${datos.robots} ${datos.robots === 1 ? 'es robot' : 'son robots'}`}
          </span>
        </div>
        <div className="contador-card" style={{ borderTop: '4px solid #4caf50' }}>
          <span className="contador-num">{datos.logueados}</span>
          <span className="contador-label">Identificados</span>
          <span className="contador-sub">personas que entraron con su cuenta</span>
        </div>
        <div className="contador-card" style={{ borderTop: '4px solid #f57c00' }}>
          <span className="contador-num">{Object.keys(datos.porPais).length}</span>
          <span className="contador-label">Países distintos</span>
        </div>
      </div>

      <h3 style={{ marginTop: 32, marginBottom: 4 }}>Actividad reciente</h3>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Cada vez que alguien entró al sitio (no cada página que recorrió después).</p>
      <div className="admin-visitas-lista">
        {!visitasRecientes && <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>Cargando…</p>}
        {visitasRecientes?.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>
            {t('admin.sin_visitas')}
          </p>
        )}
        {visitasRecientes?.map((v) => <FilaVisita key={v.id} v={v} zona={zona} />)}
      </div>
      {visitasRecientes?.length >= visitasLimite && (
        <button type="button" className="admin-fila-agregar" style={{ marginTop: 12 }} onClick={verMasVisitas}>
          Ver más
        </button>
      )}

      <h3 style={{ marginTop: 32, marginBottom: 4 }}>Visitas por día</h3>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Cuántas veces entraron al sitio cada día.</p>
      <div className="admin-tabla-stats">
        <FilasStat datos={datos.porDia} orden={porClaveDesc} limite={30} />
        {Object.keys(datos.porDia).length === 0 && (
          <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>
            {t('admin.sin_visitas')}
          </p>
        )}
      </div>

      {zona === 'pagina' && (<>
      <h3 style={{ marginTop: 32, marginBottom: 4 }}>Páginas más visitadas</h3>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Qué páginas recorren dentro de una misma visita.</p>
      <div className="admin-tabla-stats">
        <FilasStat datos={datos.porRuta} orden={porValorDesc} nombre={nombreRuta} color="#5f0a87" />
      </div>
      </>)}

      <h3 style={{ marginTop: 32, marginBottom: 4 }}>Visitantes por país</h3>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Personas distintas. Toca un país para ver sus ciudades.</p>
      <div className="admin-tabla-stats">
        {Object.entries(datos.porPais)
          .sort(porValorDesc)
          .map(([pais, n]) => {
            const max = Math.max(...Object.values(datos.porPais), 1);
            const abierto = paisAbierto === pais;
            const ciudades = Object.entries(datos.ciudadesPorPais?.[pais] || {}).sort(porValorDesc);
            return (
              <div key={pais} className="stat-grupo">
                <button type="button" className={`stat-row stat-pais${abierto ? ' abierto' : ''}`} aria-expanded={abierto}
                  onClick={() => setPaisAbierto(abierto ? null : pais)}>
                  <span className="stat-fecha"><span className="stat-flecha">›</span>{pais}</span>
                  <BarraStat n={n} max={max} color="#4caf50" />
                  <span className="stat-num">{n}</span>
                </button>
                {abierto && ciudades.map(([ciudad, m]) => (
                  <FilaStat key={ciudad} etiqueta={ciudad} n={m} max={n} color="#a5d6a7" clase="stat-ciudad" />
                ))}
              </div>
            );
          })}
      </div>

      {/* Dispositivos */}
      {datos.porDispositivo && Object.keys(datos.porDispositivo).length > 0 && (
        <>
          <h3 style={{ marginTop: 32, marginBottom: 16 }}>Dispositivos</h3>
          <div className="admin-tabla-stats">
            <FilasStat datos={datos.porDispositivo} orden={porValorDesc} color="#2196f3" />
          </div>
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
