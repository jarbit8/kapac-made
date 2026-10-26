import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { crearPedido } from '../firebase/pedidos';
import { loginAnonimo } from '../firebase/auth';
import Cargando from '../components/Cargando/Cargando';
import { cuentaDe, correoCompra, guardarRespaldo, hayRespaldo } from '../utils/compra';
import '../styles/MetodoPago.css';
import imgYape from '../assets/images/yape.avif';
import imgTarjeta from '../assets/images/tarjeta.jpg';
import imgEfectivo from '../assets/images/pago efectivo.avif';

const logoStyle = { width: 72, height: 44, objectFit: 'contain', borderRadius: 8 };

export default function MetodoPago() {
  const navigate = useNavigate();
  const { items, vaciar, totalPrecio, refrescar, restaurar, avisos } = useCart();
  const { usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const [metodo, setMetodo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const total = totalPrecio;
  const pedidoCreado = useRef(false);
  const enCurso = useRef(false);

  // Si el precio o el stock cambió mientras elige cómo pagar, el total no cambia en silencio:
  // vuelve al carrito, donde se ve qué cambió
  useEffect(() => {
    if (avisos?.length && !pedidoCreado.current) navigate('/carrito');
  }, [avisos, navigate]);

  // Al volver con "atrás" desde el pago el carrito está vacío: se recupera el del pedido recién creado
  const [recuperando, setRecuperando] = useState(() => !items.length && hayRespaldo());
  useEffect(() => {
    if (!recuperando) return;
    restaurar();
    setRecuperando(false);
  }, [recuperando, restaurar]);

  const confirmar = async () => {
    if (enCurso.current) return;
    if (!metodo) {
      setError(t('metodo.seleccionar'));
      return;
    }

    enCurso.current = true;
    setProcesando(true);
    setError('');

    try {
      // Si cambió un precio o el stock, el cliente lo ve en el carrito antes de que se cree el pedido
      // Si el catálogo no responde en 3 s se sigue: el servidor igual cobra con los precios reales
      const cambios = await Promise.race([refrescar(), new Promise((r) => setTimeout(() => r([]), 3000))]);
      if (cambios.length) {
        navigate('/carrito');
        return;
      }

      const envioRaw = sessionStorage.getItem('checkout_envio');
      const envio = envioRaw ? JSON.parse(envioRaw) : null;

      // Sin sesión se abre una anónima para poder escribir en Firestore; la anónima de una
      // compra anterior tampoco es una cuenta
      let sesion = usuario;
      if (!sesion) {
        try {
          sesion = (await loginAnonimo()).user;
        } catch (e) {
          // Proveedor anónimo apagado en Firebase: sin esto no hay compra de invitado
          setError(idioma === 'en'
            ? 'Guest checkout is unavailable right now. Please sign in to complete your purchase.'
            : 'La compra como invitado no está disponible en este momento. Inicia sesión para completar tu compra.');
          return;
        }
      }
      const cuenta = cuentaDe(sesion);
      const email = correoCompra(sesion);
      const nombre = envio?.nombre || cuenta?.displayName || '';

      const pedidoId = await crearPedido({
        usuarioId: sesion.uid,
        email,
        nombre,
        items,
        total: Number(total),
        envio,
        metodoPago: metodo,
        esInvitado: !cuenta,
      });

      // El stock lo descuenta el servidor cuando el pago se confirma
      // (los clientes no tienen permiso para escribir en productos).
      // Si el cliente cambia de método de pago, el carrito y los datos vuelven de este respaldo.
      pedidoCreado.current = true;
      guardarRespaldo({ items, envio, email, nombre, pedidoId });
      vaciar();
      sessionStorage.removeItem('checkout_envio');
      sessionStorage.setItem('pago_total', total);

      if (metodo === 'yape' || metodo === 'yape-codigo') {
        navigate(`/pago/${metodo}/${pedidoId}`);
      } else if (metodo === 'tarjeta') {
        navigate(`/pago/tarjeta/${pedidoId}`);
      } else if (metodo === 'efectivo') {
        navigate(`/pago/efectivo/${pedidoId}`);
      }
    } catch (e) {
      console.error(e);
      setError(t('metodo.error'));
    } finally {
      enCurso.current = false;
      setProcesando(false);
    }
  };

  if (recuperando) {
    return (
      <>
        <Header />
        <main className="metodo-page"><Cargando /></main>
        <Footer />
      </>
    );
  }

  if (!pedidoCreado.current) {
    if (!items.length) return <Navigate to="/carrito" replace />;
    if (!sessionStorage.getItem('checkout_envio')) return <Navigate to="/checkout" replace />;
  }

  const opciones = [
    { id: 'yape', img: imgYape, alt: 'Yape', titulo: 'metodo.yape', desc: 'metodo.yape_desc' },
    { id: 'yape-codigo', img: imgYape, alt: 'Yape', titulo: 'metodo.yape_codigo', desc: 'metodo.yape_codigo_desc' },
    { id: 'tarjeta', img: imgTarjeta, alt: 'Visa, Mastercard, American Express', titulo: 'metodo.tarjeta', desc: 'metodo.tarjeta_desc' },
    { id: 'efectivo', img: imgEfectivo, alt: 'PagoEfectivo', titulo: 'metodo.efectivo', desc: 'metodo.efectivo_desc' },
  ];

  return (
    <>
      <Header />
      <main className="metodo-page">
        <PasosCompra actual={2} />

        <h1>{t('metodo.titulo')}</h1>
        <p className="metodo-sub">{t('metodo.total')} <strong>S/{total}.00</strong></p>

        <div className="metodo-opciones" role="radiogroup" aria-label={t('metodo.titulo')}>
          {opciones.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={metodo === o.id}
              className={`metodo-opcion ${metodo === o.id ? 'seleccionada' : ''}`}
              onClick={() => { setMetodo(o.id); setError(''); }}
            >
              <div className="metodo-icono"><img src={o.img} alt={o.alt} style={logoStyle} /></div>
              <div className="metodo-info">
                <strong>{t(o.titulo)}</strong>
                <span>{t(o.desc)}</span>
              </div>
              <div className={`opcion-radio ${metodo === o.id ? 'on' : ''}`} />
            </button>
          ))}
        </div>

        {error && <p className="checkout-error"><Icono nombre="alerta" tam={16} /> {error}</p>}

        <p className="compra-seguro"><Icono nombre="candado" tam={16} /> {t('metodo.seguro')}</p>

        <div className="metodo-acciones">
          <button className="metodo-btn-volver" onClick={() => navigate('/checkout')}>
            <Icono nombre="flechaIzq" tam={17} /> {t('metodo.volver')}
          </button>
          <button className="metodo-btn-confirmar" onClick={confirmar} disabled={procesando}>
            {procesando ? t('metodo.procesando') : <>{t('metodo.confirmar')} <Icono nombre="flechaDer" tam={17} /></>}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
