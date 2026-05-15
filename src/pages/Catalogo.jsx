import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import mochila1 from '../assets/images/mochila 1.png';
import mochila2 from '../assets/images/mochila 2.png';
import mochila3 from '../assets/images/mochila 3.png';
import mochila4 from '../assets/images/mochila 4.png';
import '../styles/Catalogo.css';

const productos = [
  { id: 1, img: mochila1, nombre: 'Kapac Explorer', precio: 'S/129.00', original: 'S/149.00' },
  { id: 2, img: mochila2, nombre: 'Kapac Atoms',    precio: 'S/129.00', original: 'S/159.00' },
  { id: 3, img: mochila3, nombre: 'Kapac Trail',    precio: 'S/119.00', original: 'S/139.00' },
  { id: 4, img: mochila4, nombre: 'Kapac Summit',   precio: 'S/149.00', original: 'S/169.00' },
];

export default function Catalogo() {
  return (
    <>
      <Header />
      <main className="catalogo-page">
        <h1 className="catalogo-page-title">Catálogo</h1>
        <div className="catalogo-page-grid">
          {productos.map((p) => (
            <div key={p.id} className="catalogo-page-card">
              <img src={p.img} alt={p.nombre} />
              <div className="catalogo-page-info">
                <p className="catalogo-page-name">{p.nombre}</p>
                <div className="catalogo-page-precios">
                  <span className="precio-actual">{p.precio}</span>
                  <span className="precio-original">{p.original}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
