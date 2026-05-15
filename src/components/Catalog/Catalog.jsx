import React from 'react';
import '../../styles/Catalog.css';
import mochila1 from '../../assets/images/mochila 1.png';
import mochila2 from '../../assets/images/mochila 2.png';
import mochila3 from '../../assets/images/mochila 3.png';
import mochila4 from '../../assets/images/mochila 4.png';

export default function Catalog() {
  const items = [
    { id: 1, imagen: mochila1, nombre: 'Mochila', precio: '$89.99' },
    { id: 2, imagen: mochila2, nombre: 'Mochila', precio: '$94.99' },
    { id: 3, imagen: mochila3, nombre: 'Mochila', precio: '$79.99' },
    { id: 4, imagen: mochila4, nombre: 'Mochila', precio: '$99.99' },
  ];

  return (
    <section className="catalog">
      <h2 className="catalog-title">ESTO ES TODO LO QUE HACEMOS ◯</h2>
      <div className="catalog-grid">
        {items.map((item) => (
          <div key={item.id} className="catalog-item">
            <img src={item.imagen} alt={item.nombre} />
            <p className="catalog-name">{item.nombre}</p>
            <p className="catalog-price">{item.precio}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
