import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { obtenerPedidosUsuario } from '../firebase/pedidos';
import Cargando from '../components/Cargando/Cargando';
import { nombreEstado } from '../i18n/estadosPedido';
import { cipPendiente, venceCIP } from '../utils/compra';
import { soles, fechaHora } from '../utils/formato';
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
        // Los que siguen en procesando_pago son intentos de pago que el cliente dejó,
        // salvo un PagoEfectivo con su código ya generado (todavía lo puede pagar)
        setPedidos(data.filter((p) => p.estado !== 'procesando_pago' || cipPendiente(p)));
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        setError('carga');
        setCargando(false);
      });
  }, [usuario, cargandoAuth, navigate]);

  const formatoFecha = (ts) => {
    if (!ts?.toDate) return idioma === 'en' ? 'Just created' : 'Recién creado';
    return fechaHora(ts.toDate(), idioma);
  };

  return (
    <>
      <Header />
      <main className="pedidos-page">
        <h1><span>{t('pedidos.titulo')}</span></h1>

        {cargando && <Cargando />}

        {!cargando && error && (
          <p style={{ color: 'crimson' }}>{t('pedidos.error_cargar')}</p>
        )}

        {!cargando && !error && pedidos.length === 0 && (
          <div className="pedidos-vacio">
            <p><span>{t('pedidos.vacio')}</span></p>
            <button onClick={() => navigate('/shop')}><span>{t('pedidos.ver_tienda')}</span></button>
          </div>
        )}

        {!cargando && !error && pedidos.map((p) => (
          <div key={p.id} className="pedido-card">
            <div className="pedido-header">
              <span className="pedido-id"><span>{t('pedidos.pedido')}</span> #{p.id.slice(0, 8)}</span>
              <span className={`pedido-estado estado-${p.estado}`}>{nombreEstado(p, idioma)}</span>
            </div>
            <p className="pedido-fecha">{formatoFecha(p.fecha)}</p>
            {cipPendiente(p) && (() => {
              const vence = venceCIP(p.codigoPagoVence, idioma);
              return (
                <p className="pedido-cip">
                  {t('pago.ef.codigo_label')}: <strong>{p.codigoPago}</strong>
                  {vence && <span> · {t(vence.vencido ? 'conf.cip_vencio' : 'conf.cip_vence')} {vence.texto}</span>}
                </p>
              );
            })()}
            <ul className="pedido-items">
              {p.items.map((it, i) => (
                <li key={i}>
                  {it.cantidad}× {it.nombre} — {soles(it.precio * it.cantidad)}
                </li>
              ))}
            </ul>
            <div className="pedido-total"><span>{t('pedidos.total')}</span>: <strong>{soles(p.total)}</strong></div>
          </div>
        ))}
      </main>
      <Footer />
    </>
  );
}
