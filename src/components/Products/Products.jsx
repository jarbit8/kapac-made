import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Products.css';
import ET from '../ET';
import { obtenerProductos } from '../../firebase/productos';
import { imagen } from '../../firebase/imagenesProductos';
import { useCart } from '../../context/CartContext';
import { useIdioma } from '../../context/LanguageContext';
import { nombreProducto } from '../../i18n/producto';

export default function Products() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { agregar } = useCart();
  const { t, idioma } = useIdioma();

  useEffect(() => {
    obtenerProductos()
      .then((data) => {
        setProductos(data.filter(p => p.activo !== false).slice(0, 4));
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  if (cargando) return (
    <section className="products-grid-section">
      <p className="products-cargando"><ET k="productos.cargando" /></p>
    </section>
  );

  return (
    <section className="products-grid-section">
      <div className="products-grid">
        {productos.map((producto) => {
          const descuento = producto.precioOriginal
            ? Math.round((1 - producto.precio / producto.precioOriginal) * 100)
            : null;

          return (
            <Link key={producto.id} to={`/producto/${producto.id}`} className="pgrid-card">
              <div className="pgrid-img-wrap">
                <img
                  src={imagen(producto.imagenMochila)}
                  alt={nombreProducto(producto, idioma)}
                  className="pgrid-img"
                />
                {descuento && <span className="pgrid-badge">-{descuento}%</span>}
              </div>
              <div className="pgrid-info">
                {producto.categoria && (
                  <span className="pgrid-cat">{producto.categoria}</span>
                )}
                <h3 className="pgrid-nombre">{nombreProducto(producto, idioma)}</h3>
                <div className="pgrid-precios">
                  <span className="pgrid-precio">{producto.moneda}{producto.precio}.00</span>
                  {producto.precioOriginal && (
                    <span className="pgrid-original">{producto.moneda}{producto.precioOriginal}.00</span>
                  )}
                </div>
                <button
                  className="pgrid-btn"
                  disabled={Number(producto.stock ?? 0) <= 0}
                  onClick={(e) => { e.preventDefault(); agregar(producto); }}
                >
                  {Number(producto.stock ?? 0) <= 0
                    ? <ET k="productos.sin_stock" sinColor />
                    : <ET k="productos.agregar" sinColor />}
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
