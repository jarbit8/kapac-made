import React, { useEffect, useState } from 'react';
import '../../styles/Products.css';
import { obtenerProductos } from '../../firebase/productos';
import { imagen } from '../../firebase/imagenesProductos';
import { useCart } from '../../context/CartContext';

export default function Products() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { agregar } = useCart();

  useEffect(() => {
    obtenerProductos()
      .then((data) => {
        setProductos(data.filter(p => p.activo !== false));
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        setCargando(false);
      });
  }, []);

  if (cargando) {
    return (
      <section className="products">
        <div className="products-container">
          <p style={{ color: '#666', textAlign: 'center' }}>Cargando productos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="products">
      <div className="products-container">
        {productos.map((producto) => (
          <div key={producto.id} className="product-row">
            <div className="product-left">
              <img src={imagen(producto.imagenMochila)} alt={producto.nombre} className="mochila-img" />
              <div className="product-info">
                <h3 className="product-name">{producto.nombre}</h3>
                <p className="product-price">{producto.moneda}{producto.precio}.00</p>
                <button className="product-add-btn" onClick={() => agregar(producto)}>
                  Agregar al carrito
                </button>
              </div>
            </div>
            <div className="product-right">
              <img src={imagen(producto.imagenContexto)} alt="Foto contexto" className="foto-img" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
