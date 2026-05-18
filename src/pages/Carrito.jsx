import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { imagen } from '../firebase/imagenesProductos';
import '../styles/Carrito.css';

export default function Carrito() {
  const { items, quitar, cambiarCantidad, vaciar, totalPrecio } = useCart();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const finalizar = () => {
    if (!usuario) {
      navigate('/login');
      return;
    }
    alert('¡Pedido registrado! (El pago se integrará en la siguiente fase)');
    vaciar();
    navigate('/');
  };

  return (
    <>
      <Header />
      <main className="carrito-page">
        <h1>Tu carrito</h1>

        {items.length === 0 ? (
          <div className="carrito-vacio">
            <p>Tu carrito está vacío.</p>
            <button onClick={() => navigate('/catalogo')}>Ver catálogo</button>
          </div>
        ) : (
          <>
            <div className="carrito-lista">
              {items.map((item) => (
                <div key={item.id} className="carrito-item">
                  <img src={imagen(item.imagenMochila)} alt={item.nombre} />
                  <div className="carrito-item-info">
                    <h3>{item.nombre}</h3>
                    <p className="carrito-precio">{item.moneda}{item.precio}.00</p>
                  </div>
                  <div className="carrito-cantidad">
                    <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}>−</button>
                    <span>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}>+</button>
                  </div>
                  <p className="carrito-subtotal">
                    {item.moneda}{item.precio * item.cantidad}.00
                  </p>
                  <button className="carrito-quitar" onClick={() => quitar(item.id)}>✕</button>
                </div>
              ))}
            </div>

            <div className="carrito-resumen">
              <div className="carrito-total">
                <span>Total:</span>
                <strong>S/{totalPrecio}.00</strong>
              </div>
              <button className="carrito-finalizar" onClick={finalizar}>
                {usuario ? 'Finalizar compra' : 'Inicia sesión para comprar'}
              </button>
              <button className="carrito-vaciar" onClick={vaciar}>Vaciar carrito</button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
