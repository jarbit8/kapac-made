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
        setCargando(false);
      });
  }, [usuario, cargandoAuth, navigate]);

  const formatoFecha = (ts) => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  };

  return (
    <>
      <Header />
      <main className="pedidos-page">
        <h1>Mis pedidos</h1>

        {cargando && <p style={{ color: '#666' }}>Cargando pedidos...</p>}

        {!cargando && pedidos.length === 0 && (
          <div className="pedidos-vacio">
            <p>Aún no tienes pedidos.</p>
            <button onClick={() => navigate('/catalogo')}>Ver catálogo</button>
          </div>
        )}

        {!cargando && pedidos.map((p) => (
          <div key={p.id} className="pedido-card">
            <div className="pedido-header">
              <span className="pedido-id">Pedido #{p.id.slice(0, 8)}</span>
              <span className={`pedido-estado estado-${p.estado}`}>{p.estado}</span>
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
