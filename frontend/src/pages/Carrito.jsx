import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import { useCart } from '../context/CartContext';
import { useIdioma } from '../context/LanguageContext';
import { nombreProducto } from '../i18n/producto';
import { imagen } from '../utils/imagen';
import { soles } from '../utils/formato';
import '../styles/Carrito.css';

export default function Carrito() {
  const { items, quitar, cambiarCantidad, totalPrecio, avisos, refrescar, limpiarAvisos } = useCart();
  const { t, idioma } = useIdioma();
  const navigate = useNavigate();

  // Precio y stock al día cada vez que se abre el carrito; los avisos se van al salir
  useEffect(() => {
    refrescar();
    window.addEventListener('pagehide', limpiarAvisos);
    return () => {
      window.removeEventListener('pagehide', limpiarAvisos);
      limpiarAvisos();
    };
  }, [refrescar, limpiarAvisos]);

  const textoAviso = (a) => {
    return t(`carrito.aviso_${a.tipo}`)
      .replace('{n}', nombreProducto(a, idioma))
      .replace('{stock}', a.stock)
      .replace('{antes}', soles(a.antes, a.moneda))
      .replace('{ahora}', soles(a.ahora, a.moneda));
  };

  return (
    <>
      <Header />
      <main className="carrito-page">
        <h1>{t('carrito.titulo')}</h1>

        {avisos.length > 0 && (
          <div className="carrito-avisos" role="status">
            <ul>
              {avisos.map((a, i) => (
                <li key={`${a.id}-${a.tipo}-${i}`}><Icono nombre="alerta" tam={16} /> <span>{textoAviso(a)}</span></li>
              ))}
            </ul>
            <button className="carrito-avisos-cerrar" onClick={limpiarAvisos} aria-label={t('carrito.aviso_cerrar')}>
              <Icono nombre="cerrar" tam={16} />
            </button>
          </div>
        )}

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
                    <p className="carrito-precio">{soles(item.precio, item.moneda)}</p>
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
                    {soles(item.precio * item.cantidad, item.moneda)}
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
                <strong>{soles(totalPrecio)}</strong>
              </div>
              <button className="carrito-finalizar" onClick={() => navigate('/checkout')}>
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
