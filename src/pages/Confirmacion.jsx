import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ET from '../components/ET';
import Editable from '../components/Editable';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useIdioma } from '../context/LanguageContext';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Confirmacion.css';

const TELEGRAM_BOT = 'https://t.me/kapacmade_bot';

export default function Confirmacion() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { t, idioma } = useIdioma();
  const es = idioma === 'es';
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [canales, setCanales] = useState({ email: false, telegram: false });
  const [emailConfirmado, setEmailConfirmado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const ref = doc(db, 'pedidos', pedidoId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPedido({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error(e);
      }
      setCargando(false);
    };
    cargar();
  }, [pedidoId]);

  // Calcula el valor a guardar según los canales activos
  const calcularCanal = (email, telegram) => {
    if (email && telegram) return 'ambos';
    if (email)    return 'email';
    if (telegram) return 'telegram';
    return null;
  };

  const guardarCanal = async (email, telegram) => {
    const valor = calcularCanal(email, telegram);
    if (!valor) return;
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), { canalNotificacion: valor });
    } catch (e) {
      console.error(e);
    }
  };

  // Telegram → activa al instante (sin confirmar)
  const toggleTelegram = async () => {
    const nuevo = !canales.telegram;
    setCanales(prev => ({ ...prev, telegram: nuevo }));
    // Guarda inmediatamente — solo si email ya fue confirmado o no está marcado
    if (emailConfirmado || !canales.email) {
      await guardarCanal(canales.email && emailConfirmado, nuevo);
    }
  };

  // Email → toggle (requiere confirmar después)
  const toggleEmail = () => {
    const nuevo = !canales.email;
    setCanales(prev => ({ ...prev, email: nuevo }));
    if (!nuevo) {
      setEmailConfirmado(false);
      // si desmarca email, guardar solo lo que quede
      guardarCanal(false, canales.telegram);
    }
  };

  // Botón Confirmar correo
  const confirmarEmail = async () => {
    setEmailConfirmado(true);
    await guardarCanal(true, canales.telegram);
  };

  const formatoFecha = () => {
    return new Date().toLocaleDateString(es ? 'es-PE' : 'en-US', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const estadoLabel = {
    procesando_pago:  `🔄 ${t('estado.procesando_pago')}`,
    verificando_pago: `🔍 ${t('estado.verificando_pago')}`,
    pendiente_envio:  `📦 ${t('estado.pendiente_envio')}`,
    enviado:          `🚚 ${t('estado.enviado')}`,
    entregado:        `🎉 ${t('estado.entregado')}`,
    cancelado:        `❌ ${t('estado.cancelado')}`,
    pendiente:    `🔄 ${t('estado.procesando_pago')}`,
    verificando:  `🔄 ${t('estado.procesando_pago')}`,
    pagado:       `📦 ${t('estado.pendiente_envio')}`,
  };

  const metodoPagoLabel = {
    yape:    '📱 Yape',
    tarjeta: `💳 ${es ? 'Tarjeta' : 'Card'}`,
    efectivo: es ? '💵 Efectivo' : '💵 Cash',
  };

  if (cargando) {
    return (
      <>
        <Header />
        <main className="confirmacion-page">
          <Cargando />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="confirmacion-page">

        {/* Encabezado */}
        <div className="confirmacion-header">
          <div className="confirmacion-icono">🎉</div>
          <h1><Editable id="conf_titulo" as="span">{es ? '¡Pedido confirmado!' : 'Order confirmed!'}</Editable></h1>
          <p className="confirmacion-sub">
            <Editable id="conf_gracias" as="span">{es ? 'Gracias por tu compra en' : 'Thanks for your purchase at'}</Editable> <strong>Kapac Made</strong>.<br />
            <Editable id="conf_hecho_arequipa" as="span">{es ? 'Hecho en Arequipa, para explorar sin límites.' : 'Made in Arequipa, to explore without limits.'}</Editable>
          </p>
        </div>

        {/* Recibo */}
        <div className="confirmacion-recibo">
          <div className="recibo-header">
            <span className="recibo-titulo"><Editable id="conf_recibo_titulo" as="span">{es ? 'RECIBO DE PEDIDO' : 'ORDER RECEIPT'}</Editable></span>
            <span className="recibo-fecha">{formatoFecha()}</span>
          </div>

          <div className="recibo-id">
            <Editable id="conf_num_pedido" as="span">{es ? 'Nº de pedido:' : 'Order #:'}</Editable> <strong>#{pedidoId.slice(0, 8).toUpperCase()}</strong>
          </div>

          {/* Productos */}
          {pedido?.items?.length > 0 && (
            <div className="recibo-items">
              <div className="recibo-seccion-titulo"><ET k="pedidos.productos" /></div>
              {pedido.items.map((item, i) => (
                <div className="recibo-item" key={i}>
                  <span className="recibo-item-nombre">{item.nombre}</span>
                  <span className="recibo-item-qty">x{item.cantidad}</span>
                  <span className="recibo-item-precio">S/{item.precio * item.cantidad}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="recibo-total">
            <span><Editable id="conf_total_pagado" as="span">{es ? 'Total pagado' : 'Total paid'}</Editable></span>
            <strong>S/{pedido?.total || '—'}.00</strong>
          </div>

          {/* Método y estado */}
          <div className="recibo-detalles">
            <div className="recibo-detalle">
              <span className="recibo-detalle-label"><ET k="metodo.titulo" /></span>
              <span>{metodoPagoLabel[pedido?.metodoPago] || pedido?.metodoPago || '—'}</span>
            </div>
            <div className="recibo-detalle">
              <span className="recibo-detalle-label"><ET k="pedidos.estado" /></span>
              <span>{estadoLabel[pedido?.estado] || pedido?.estado || '—'}</span>
            </div>
            {pedido?.envio?.tipo === 'envio' && (
              <div className="recibo-detalle">
                <span className="recibo-detalle-label"><Editable id="conf_dir_envio" as="span">{es ? 'Dirección de envío' : 'Shipping address'}</Editable></span>
                <span>{pedido.envio.direccion}, {pedido.envio.distrito}</span>
              </div>
            )}
            {pedido?.envio?.tipo === 'recojo' && (
              <div className="recibo-detalle">
                <span className="recibo-detalle-label"><Editable id="conf_entrega" as="span">{es ? 'Entrega' : 'Delivery'}</Editable></span>
                <span><Editable id="conf_recojo_tienda" as="span">{es ? 'Recojo en tienda — Arequipa' : 'Store pickup — Arequipa'}</Editable></span>
              </div>
            )}
          </div>
        </div>

        {/* Canal de notificaciones */}
        <div className="confirmacion-canal">
          <h2><Editable id="conf_canal_titulo" as="span">{es ? '¿Cómo quieres seguir tu pedido?' : 'How do you want to track your order?'}</Editable></h2>
          <p><Editable id="conf_canal_sub" as="span" multiline>{es ? 'Puedes elegir uno o ambos. Te avisamos cada vez que cambie el estado.' : 'You can choose one or both. We\'ll notify you every time the status changes.'}</Editable></p>

          <div className="canal-opciones">
            {/* Email */}
            <button
              className={`canal-opcion ${canales.email ? 'seleccionado' : ''}`}
              onClick={toggleEmail}
            >
              <span className="canal-icono">📧</span>
              <div>
                <strong><ET k="conf.canal_email" /></strong>
                <span>{pedido?.email}</span>
              </div>
              <span className={`canal-check-box ${canales.email ? 'on' : ''}`}>
                {canales.email ? '✓' : ''}
              </span>
            </button>

            {/* Sub-bloque: confirmar correo */}
            {canales.email && !emailConfirmado && (
              <button className="canal-btn-confirmar" onClick={confirmarEmail}>
                <Editable id="conf_confirmar_correo" as="span" sinColor>{es ? 'Confirmar correo →' : 'Confirm email →'}</Editable>
              </button>
            )}
            {canales.email && emailConfirmado && (
              <div className="canal-guardado">
                <span>✓</span> <Editable id="conf_te_avisaremos" as="span">{es ? 'Te avisaremos a' : 'We\'ll notify you at'}</Editable> <strong>{pedido?.email}</strong>
              </div>
            )}

            {/* Telegram */}
            <button
              className={`canal-opcion ${canales.telegram ? 'seleccionado' : ''}`}
              onClick={toggleTelegram}
            >
              <span className="canal-icono">✈️</span>
              <div>
                <strong><Editable id="conf_telegram_titulo" as="span" sinColor>Telegram</Editable></strong>
                <span><Editable id="conf_telegram_desc" as="span">{es ? 'Notificación instantánea · @kapacmade_bot' : 'Instant notification · @kapacmade_bot'}</Editable></span>
              </div>
              <span className={`canal-check-box ${canales.telegram ? 'on' : ''}`}>
                {canales.telegram ? '✓' : ''}
              </span>
            </button>

            {/* Sub-bloque: Telegram activo */}
            {canales.telegram && (
              <div className="canal-telegram-info">
                <a href={TELEGRAM_BOT} target="_blank" rel="noopener noreferrer" className="telegram-btn">
                  <Editable id="conf_abrir_telegram" as="span">{es ? 'Abrir' : 'Open'}</Editable> @kapacmade_bot
                </a>
                <p className="telegram-hint">
                  <Editable id="conf_envia" as="span">{es ? 'Envía' : 'Send'}</Editable> <code>/start</code> <Editable id="conf_y_escribe" as="span">{es ? 'y escribe:' : 'and type:'}</Editable> <strong>#{pedidoId.slice(0, 8).toUpperCase()}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="confirmacion-acciones">
          <button onClick={() => navigate('/pedidos')} className="conf-btn-pedidos">
            <ET k="conf.ver_pedidos" sinColor />
          </button>
          <button onClick={() => navigate('/')} className="conf-btn-inicio">
            <ET k="conf.volver_tienda" sinColor />
          </button>
        </div>

      </main>
      <Footer />
    </>
  );
}
