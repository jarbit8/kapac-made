import React, { useEffect, useState } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { obtenerProductos } from '../firebase/productos';
import { imagen } from '../firebase/imagenesProductos';
import { useCart } from '../context/CartContext';
import '../styles/Catalogo.css';

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const { agregar } = useCart();

  useEffect(() => {
    obtenerProductos()
      .then((data) => {
        setProductos(data.filter(p => p.activo !== false));
        setCargando(false);
      })
      .catch((e) => {
        setError('No se pudieron cargar los productos.');
        setCargando(false);
        console.error(e);
      });
  }, []);

  return (
    <>
      <Header />
      <main className="catalogo-page">
        <h1 className="catalogo-page-title">Catálogo</h1>

        {cargando && <p style={{ color: '#666' }}>Cargando productos...</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        {!cargando && !error && (
          <div className="catalogo-page-grid">
            {productos.map((p) => (
              <div key={p.id} className="catalogo-page-card">
                <img src={imagen(p.imagenMochila)} alt={p.nombre} />
                <div className="catalogo-page-info">
                  <p className="catalogo-page-name">{p.nombre}</p>
                  <div className="catalogo-page-precios">
                    <span className="precio-actual">{p.moneda}{p.precio}.00</span>
                    {p.precioOriginal && (
                      <span className="precio-original">{p.moneda}{p.precioOriginal}.00</span>
                    )}
                  </div>
                  <button className="catalogo-add-btn" onClick={() => agregar(p)}>
                    Agregar al carrito
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
