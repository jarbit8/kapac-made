import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import { useCart } from '../context/CartContext';
import { useIdioma } from '../context/LanguageContext';
import { nombreProducto } from '../i18n/producto';
import { imagen } from '../firebase/imagenesProductos';
import '../styles/Carrito.css';

export default function Carrito() {
  const { items, quitar, cambiarCantidad, totalPrecio } = useCart();
  const { t, idioma } = useIdioma();
  const navigate = useNavigate();
  const finalizar = () => navigate('/checkout');

  return (
    <>
      <Header />
      <main className="carrito-page">
        <h1>{t('carrito.titulo')}</h1>

        {items.length === 0 ? (
          <div className="carrito-vacio">
            <Icono nombre="bolsa" tam={40} className="carrito-vacio-icono" />
            <p>{t('carrito.vacio')}</p>
            <span className="carrito-vacio-sub">{t('carrito.vacio_sub')}</span>
            <button onClick={() => navigate('/shop')}>{t('carrito.ver_catalogo')}</button>
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
                  <div className="carrito-cantidad" aria-label={t('carrito.cantidad')}>
                    <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)} aria-label="−">−</button>
                    <span>{item.cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                      disabled={item.cantidad >= Number(item.stock ?? 99)}
                      title={item.cantidad >= Number(item.stock ?? 99) ? (idioma === 'en' ? 'No more stock' : 'No hay más stock') : undefined}
                      aria-label="+"
                    >+</button>
                  </div>
                  <p className="carrito-subtotal">
                    {item.moneda}{item.precio * item.cantidad}.00
                  </p>
                  <button className="carrito-quitar" onClick={() => quitar(item.id)} aria-label={t('carrito.eliminar')} title={t('carrito.eliminar')}>
                    <Icono nombre="cerrar" tam={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="carrito-resumen">
              <div className="carrito-total">
                <span>{t('carrito.total')}</span>
                <strong>S/{totalPrecio}.00</strong>
              </div>
              <button className="carrito-finalizar" onClick={finalizar}>
                <Icono nombre="candado" tam={17} /> {t('carrito.ir_pagar')}
              </button>
              <button className="carrito-vaciar" onClick={() => navigate('/shop')}>{t('carrito.continuar')}</button>
              <p className="compra-seguro"><Icono nombre="escudo" tam={16} /> {t('carrito.seguro')}</p>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
