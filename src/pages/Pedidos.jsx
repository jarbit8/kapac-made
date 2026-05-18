import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useAuth } from '../context/AuthContext';
import { obtenerPedidosUsuario } from '../firebase/pedidos';
import '../styles/Pedidos.css';

export default function Pedidos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
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
    if (!ts?.toDate) return 'Recién creado';
    return ts.toDate().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const estadoLabel = (e) => {
    const mapa = {
      pendiente: '🕐 Pendiente de pago',
      pagado: '✅ Pagado',
      enviado: '📦 Enviado',
      entregado: '🎉 Entregado',
      cancelado: '❌ Cancelado',
    };
    return mapa[e] || e;
  };

  return (
    <>
      <Header />
      <main className="pedidos-page">
        <h1>Mis pedidos</h1>

        {cargando && <p style={{ color: '#666' }}>Cargando pedidos...</p>}

        {!cargando && error && (
          <p style={{ color: 'crimson' }}>{error}</p>
        )}

        {!cargando && !error && pedidos.length === 0 && (
          <div className="pedidos-vacio">
            <p>Aún no tienes pedidos.</p>
            <button onClick={() => navigate('/catalogo')}>Ver catálogo</button>
          </div>
        )}

        {!cargando && !error && pedidos.map((p) => (
          <div key={p.id} className="pedido-card">
            <div className="pedido-header">
              <span className="pedido-id">Pedido #{p.id.slice(0, 8)}</span>
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
            <div className="pedido-total">Total: <strong>S/{p.total}.00</strong></div>
          </div>
        ))}
      </main>
      <Footer />
    </>
  );
}
