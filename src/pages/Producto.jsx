import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { obtenerProducto } from '../firebase/productos';
import { imagen } from '../firebase/imagenesProductos';
import { useCart } from '../context/CartContext';
import '../styles/Producto.css';

export default function Producto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agregar } = useCart();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    obtenerProducto(id)
      .then((p) => {
        if (!p) setError('Producto no encontrado.');
        else setProducto(p);
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        setError('No se pudo cargar el producto.');
        setCargando(false);
      });
  }, [id]);

  const handleAgregar = () => {
    agregar(producto);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  return (
    <>
      <Header />
      <main className="producto-page">
        {cargando && <p className="producto-msg">Cargando...</p>}
        {error && <p className="producto-msg">{error}</p>}

        {producto && (
          <div className="producto-detalle">
            <div className="producto-galeria">
              <img src={imagen(producto.imagenMochila)} alt={producto.nombre} className="producto-img-principal" />
              <img src={imagen(producto.imagenContexto)} alt={producto.nombre} className="producto-img-secundaria" />
            </div>

            <div className="producto-info">
              <button className="producto-volver" onClick={() => navigate(-1)}>← Volver</button>
              <h1>{producto.nombre}</h1>

              <div className="producto-precios">
                <span className="producto-precio">{producto.moneda}{producto.precio}.00</span>
                {producto.precioOriginal && (
                  <span className="producto-precio-original">{producto.moneda}{producto.precioOriginal}.00</span>
                )}
              </div>

              {producto.categoria && (
                <span className="producto-categoria">{producto.categoria}</span>
              )}

              <p className="producto-descripcion">{producto.descripcion}</p>

              <p className="producto-stock">
                {producto.stock > 0
                  ? `✅ Disponible (${producto.stock} en stock)`
                  : '❌ Agotado'}
              </p>

              <button
                className="producto-add"
                onClick={handleAgregar}
                disabled={producto.stock <= 0}
              >
                {agregado ? '✓ Agregado al carrito' : 'Agregar al carrito'}
              </button>

              <button className="producto-ir-carrito" onClick={() => navigate('/carrito')}>
                Ir al carrito
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
