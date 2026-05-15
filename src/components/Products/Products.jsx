import React from 'react';
import '../../styles/Products.css';
import foto1 from '../../assets/images/foto 1.png';
import foto2 from '../../assets/images/foto 2.png';
import foto3 from '../../assets/images/foto 3.png';
import foto4 from '../../assets/images/foto 4.png';
import mochila1 from '../../assets/images/mochila 1.png';
import mochila2 from '../../assets/images/mochila 2.png';
import mochila3 from '../../assets/images/mochila 3.png';
import mochila4 from '../../assets/images/mochila 4.png';

export default function Products() {
  const productos = [
    { id: 1, foto: foto1, mochila: mochila1, nombre: 'Mochila', precio: '$89.99' },
    { id: 2, foto: foto2, mochila: mochila2, nombre: 'Mochila', precio: '$94.99' },
    { id: 3, foto: foto3, mochila: mochila3, nombre: 'Mochila', precio: '$79.99' },
    { id: 4, foto: foto4, mochila: mochila4, nombre: 'Mochila', precio: '$99.99' }
  ];

  return (
    <section className="products">
      <div className="products-container">
        {productos.map((producto) => (
          <div key={producto.id} className="product-row">
            <div className="product-left">
              <img src={producto.mochila} alt={producto.nombre} className="mochila-img" />
              <div className="product-info">
                <h3 className="product-name">{producto.nombre}</h3>
                <p className="product-price">{producto.precio}</p>
              </div>
            </div>
            <div className="product-right">
              <img src={producto.foto} alt="Foto contexto" className="foto-img" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
