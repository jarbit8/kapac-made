import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useIdioma } from '../context/LanguageContext';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Confirmacion.css';

export default function Confirmacion() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { t, idioma } = useIdioma();
  const es = idioma === 'es';
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [quiereAviso, setQuiereAviso] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [errorEmail, setErrorEmail] = useState('');

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

  const guardarCanal = async (activo) => {
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), { canalNotificacion: activo ? 'email' : null });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAviso = () => {
    const nuevo = !quiereAviso;
    setQuiereAviso(nuevo);
    if (!nuevo) {
      setEmailConfirmado(false);
      guardarCanal(false);
    }
  };

  // Botón Confirmar correo — si el pedido no tenía correo (invitado que no lo dio
  // en el checkout), se guarda el que recién escribió aquí.
  const confirmarEmail = async () => {
    setErrorEmail('');
    if (!pedido?.email) {
      if (!/\S+@\S+\.\S+/.test(emailInput)) {
        setErrorEmail(es ? 'Ingresa un correo válido.' : 'Enter a valid email address.');
        return;
      }
      try {
        await updateDoc(doc(db, 'pedidos', pedidoId), {
          email: emailInput,
          canalNotificacion: 'email',
        });
        setPedido(prev => ({ ...prev, email: emailInput }));
        setEmailConfirmado(true);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    setEmailConfirmado(true);
    await guardarCanal(true);
  };

  // Fecha del pedido (la del servidor; si aún no llegó, la de ahora)
  const fecha = (pedido?.fecha?.toDate ? pedido.fecha.toDate() : new Date()).toLocaleDateString(es ? 'es-PE' : 'en-US', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const ESTADOS = {
    procesando_pago: 'estado.procesando_pago', pendiente: 'estado.procesando_pago', verificando: 'estado.procesando_pago',
    verificando_pago: 'estado.verificando_pago',
    pendiente_envio: 'estado.pendiente_envio', pagado: 'estado.pendiente_envio',
    enviado: 'estado.enviado', entregado: 'estado.entregado', cancelado: 'estado.cancelado',
  };
  const METODOS = {
    yape: 'Yape', 'yape-codigo': 'Yape',
    tarjeta: es ? 'Tarjeta' : 'Card',
    efectivo: 'PagoEfectivo',
  };
  const pagado = ['pendiente_envio', 'pagado', 'enviado', 'entregado'].includes(pedido?.estado);

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

  if (!pedido) {
    return (
      <>
        <Header />
        <main className="confirmacion-page">
          <div className="confirmacion-header">
            <div className="confirmacion-icono"><Icono nombre="alerta" tam={40} /></div>
            <h1>{t('conf.no_encontrado')}</h1>
          </div>
          <div className="confirmacion-acciones">
            <button onClick={() => navigate('/shop')} className="conf-btn-inicio">{t('conf.volver_tienda')}</button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="confirmacion-page">
        <PasosCompra actual={3} />

        <div className="confirmacion-header">
          <div className={`confirmacion-icono ${pagado ? 'ok' : 'espera'}`}>
            <Icono nombre={pagado ? 'checkCirculo' : 'reloj'} tam={44} />
          </div>
          <h1>{pagado ? t('conf.confirmado') : t('conf.recibido')}</h1>
          <p className="confirmacion-sub">{pagado ? t('conf.sub_pagado') : t('conf.sub_verificando')}</p>
        </div>

        <div className="confirmacion-recibo">
          <div className="recibo-header">
            <span className="recibo-titulo">{t('conf.recibo')}</span>
            <span className="recibo-fecha">{fecha}</span>
          </div>

          <div className="recibo-id">
            {t('conf.num')} <strong>#{pedidoId.slice(0, 8).toUpperCase()}</strong>
          </div>

          {pedido.items?.length > 0 && (
            <div className="recibo-items">
              <div className="recibo-seccion-titulo">{t('pedidos.productos')}</div>
              {pedido.items.map((item, i) => (
                <div className="recibo-item" key={i}>
                  <span className="recibo-item-nombre">{item.nombre}</span>
                  <span className="recibo-item-qty">x{item.cantidad}</span>
                  <span className="recibo-item-precio">S/{item.precio * item.cantidad}.00</span>
                </div>
              ))}
            </div>
          )}

          <div className="recibo-total">
            <span>{t('conf.total')}</span>
            <strong>S/{pedido.total ?? '—'}.00</strong>
          </div>

          <div className="recibo-detalles">
            <div className="recibo-detalle">
              <span className="recibo-detalle-label">{t('admin.metodo_pago')}</span>
              <span>{METODOS[pedido.metodoPago] || pedido.metodoPago || '—'}</span>
            </div>
            <div className="recibo-detalle">
              <span className="recibo-detalle-label">{t('pedidos.estado')}</span>
              <span className={`recibo-estado ${pedido.estado || ''}`}>{ESTADOS[pedido.estado] ? t(ESTADOS[pedido.estado]) : (pedido.estado || '—')}</span>
            </div>
            {pedido.envio?.tipo === 'envio' && (
              <div className="recibo-detalle">
                <span className="recibo-detalle-label">{t('conf.dir_envio')}</span>
                <span>{pedido.envio.direccion}, {pedido.envio.distrito}</span>
              </div>
            )}
            {pedido.envio?.tipo === 'recojo' && (
              <div className="recibo-detalle">
                <span className="recibo-detalle-label">{t('conf.entrega')}</span>
                <span>{t('checkout.recojo')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Aviso por correo (opcional) */}
        <div className="confirmacion-canal">
          <h2>{t('conf.aviso_titulo')}</h2>
          <p>{t('conf.aviso_sub')}</p>

          <div className="canal-opciones">
            <button
              className={`canal-opcion ${quiereAviso ? 'seleccionado' : ''}`}
              onClick={toggleAviso}
              aria-pressed={quiereAviso}
            >
              <span className="canal-icono"><Icono nombre="correo" tam={22} /></span>
              <div>
                <strong>{t('conf.canal_email')}</strong>
                <span>{pedido.email || t('conf.aviso_sin_correo')}</span>
              </div>
              <span className={`canal-check-box ${quiereAviso ? 'on' : ''}`}>
                {quiereAviso && <Icono nombre="check" tam={14} />}
              </span>
            </button>

            {quiereAviso && !emailConfirmado && !pedido.email && (
              <div className="canal-email-input">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={es ? 'tucorreo@email.com' : 'youremail@email.com'}
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                />
                <button className="canal-btn-confirmar" onClick={confirmarEmail}>{t('conf.aviso_guardar')}</button>
              </div>
            )}
            {errorEmail && <p className="checkout-error"><Icono nombre="alerta" tam={16} /> {errorEmail}</p>}

            {quiereAviso && !emailConfirmado && pedido.email && (
              <button className="canal-btn-confirmar" onClick={confirmarEmail}>{t('conf.aviso_confirmar')}</button>
            )}
            {quiereAviso && emailConfirmado && (
              <div className="canal-guardado">
                <Icono nombre="check" tam={16} /> {t('conf.aviso_ok')} <strong>{pedido.email}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="confirmacion-acciones">
          <button onClick={() => navigate('/pedidos')} className="conf-btn-pedidos">{t('conf.ver_pedidos')}</button>
          <button onClick={() => navigate('/shop')} className="conf-btn-inicio">{t('conf.volver_tienda')}</button>
        </div>
      </main>
      <Footer />
    </>
  );
}
