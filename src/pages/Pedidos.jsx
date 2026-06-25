import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { obtenerPedidosUsuario } from '../firebase/pedidos';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Pedidos.css';

export default function Pedidos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const { t, idioma } = useIdioma();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) {
      navigate('/login');
      return;
    }
    obtenerPedidosUsuario(usuario.uid)
      .then((data) => {
        setPedidos(data);
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        setError('No se pudieron cargar los pedidos. Intenta recargar la página.');
        setCargando(false);
      });
  }, [usuario, cargandoAuth, navigate]);

  const formatoFecha = (ts) => {
    const locale = idioma === 'en' ? 'en-US' : 'es-PE';
    if (!ts?.toDate) return idioma === 'en' ? 'Just created' : 'Recién creado';
    return ts.toDate().toLocaleDateString(locale, {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const estadoLabel = (e) => {
    const iconos = {
      procesando_pago: '🔄', verificando_pago: '🔍',
      pendiente_envio: '📦', enviado: '🚚',
      entregado: '🎉', cancelado: '❌',
      pendiente: '🕐', verificando: '🔄', pagado: '📦',
    };
    const mapa = {
      procesando_pago:  t('estado.procesando_pago'),
      verificando_pago: t('estado.verificando_pago'),
      pendiente_envio:  t('estado.pendiente_envio'),
      enviado:          t('estado.enviado'),
      entregado:        t('estado.entregado'),
      cancelado:        t('estado.cancelado'),
      pendiente:   t('estado.verificando_pago'),
      verificando: t('estado.procesando_pago'),
      pagado:      t('estado.pendiente_envio'),
    };
    return `${iconos[e] || ''} ${mapa[e] || e}`;
  };

  return (
    <>
      <Header />
      <main className="pedidos-page">
        <h1>{t('pedidos.titulo')}</h1>

        {cargando && <Cargando />}

        {!cargando && error && (
          <p style={{ color: 'crimson' }}>{error}</p>
        )}

        {!cargando && !error && pedidos.length === 0 && (
          <div className="pedidos-vacio">
            <p>{t('pedidos.vacio')}</p>
            <button onClick={() => navigate('/catalogo')}>{t('pedidos.ver_tienda')}</button>
          </div>
        )}

        {!cargando && !error && pedidos.map((p) => (
          <div key={p.id} className="pedido-card">
            <div className="pedido-header">
              <span className="pedido-id">{t('pedidos.pedido')} #{p.id.slice(0, 8)}</span>
              <span className={`pedido-estado estado-${p.estado}`}>{estadoLabel(p.estado)}</span>
            </div>
            <p className="pedido-fecha">{formatoFecha(p.fecha)}</p>
            <ul className="pedido-items">
              {p.items.map((it, i) => (
                <li key={i}>
                  {it.cantidad}× {it.nombre} — S/{it.precio * it.cantidad}.00
                </li>
              ))}
            </ul>
            <div className="pedido-total">{t('pedidos.total')}: <strong>S/{p.total}.00</strong></div>
          </div>
        ))}
      </main>
      <Footer />
    </>
  );
}
