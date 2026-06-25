import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { nombreProducto } from '../i18n/producto';
import { imagen } from '../firebase/imagenesProductos';
import '../styles/Carrito.css';

export default function Carrito() {
  const { items, quitar, cambiarCantidad, vaciar, totalPrecio } = useCart();
  const { usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const navigate = useNavigate();
  const finalizar = () => {
    sessionStorage.setItem('checkout_items', JSON.stringify(items));
    sessionStorage.setItem('checkout_total', totalPrecio);
    navigate('/checkout');
  };

  return (
    <>
      <Header />
      <main className="carrito-page">
        <h1>{t('carrito.titulo')}</h1>

        {items.length === 0 ? (
          <div className="carrito-vacio">
            <p>{t('carrito.vacio')}</p>
            <button onClick={() => navigate('/catalogo')}>{t('carrito.ver_catalogo')}</button>
          </div>
        ) : (
          <>
            <div className="carrito-lista">
              {items.map((item) => (
                <div key={item.id} className="carrito-item">
                  <img src={imagen(item.imagenMochila)} alt={item.nombre} />
                  <div className="carrito-item-info">
                    <h3>{nombreProducto(item, idioma)}</h3>
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
                  <button className="carrito-quitar" onClick={() => quitar(item.id)} aria-label={t('carrito.eliminar')}>✕</button>
                </div>
              ))}
            </div>

            <div className="carrito-resumen">
              <div className="carrito-total">
                <span>{t('carrito.total')}:</span>
                <strong>S/{totalPrecio}.00</strong>
              </div>
              <button className="carrito-finalizar" onClick={finalizar}>
                {t('carrito.ir_pagar')}
              </button>
              <button className="carrito-vaciar" onClick={vaciar}>{t('carrito.continuar')}</button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
