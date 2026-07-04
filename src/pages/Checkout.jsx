import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ET from '../components/ET';
import Editable from '../components/Editable';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { obtenerPerfil } from '../firebase/perfil';
import '../styles/Checkout.css';

// Iconos SVG inline
const IconoCasa = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const IconoTienda = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16l-1.5 9H5.5L4 7z"/>
    <path d="M4 7L5.5 3h13L20 7"/>
    <circle cx="9" cy="20" r="1.2"/>
    <circle cx="15" cy="20" r="1.2"/>
  </svg>
);

export default function Checkout() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const [modo, setModo] = useState(null); // 'envio' | 'recojo'
  const [form, setForm] = useState({
    nombre: '', telefono: '', direccion: '', distrito: '', referencia: '', email: '',
  });
  const [formRecojo, setFormRecojo] = useState({
    nombre: '', telefono: '',
  });
  const [error, setError] = useState('');

  // Autocompletar con datos del perfil guardado
  useEffect(() => {
    if (!usuario) return;
    const cargar = async () => {
      const datos = await obtenerPerfil(usuario.uid);
      if (datos) {
        setForm({
          nombre:    datos.nombre    || usuario.displayName || '',
          telefono:  datos.telefono  || '',
          direccion: datos.direccion || '',
          distrito:  datos.distrito  || '',
          referencia: datos.referencia || '',
        });
        setFormRecojo({
          nombre:   datos.nombre   || usuario.displayName || '',
          telefono: datos.telefono || '',
        });
      } else {
        const nombre = usuario.displayName || '';
        setForm(prev => ({ ...prev, nombre }));
        setFormRecojo(prev => ({ ...prev, nombre }));
      }
    };
    cargar();
  }, [usuario]);

  const continuar = () => {
    setError('');

    if (!modo) {
      setError(idioma === 'en' ? 'Please select a delivery option.' : 'Por favor selecciona una opción de entrega.');
      return;
    }

    // Email obligatorio para invitados
    if (!usuario) {
      if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
        setError(idioma === 'en' ? 'Please enter a valid email address.' : 'Por favor ingresa un correo válido.');
        return;
      }
      sessionStorage.setItem('checkout_email', form.email);
    } else {
      sessionStorage.setItem('checkout_email', usuario.email);
    }

    if (modo === 'envio') {
      if (!form.nombre || !form.telefono || !form.direccion || !form.distrito) {
        setError(idioma === 'en' ? 'Please fill in all required fields (*).' : 'Por favor completa todos los campos obligatorios (*).');
        return;
      }
      sessionStorage.setItem('checkout_envio', JSON.stringify({
        tipo: 'envio',
        nombre: form.nombre,
        telefono: form.telefono,
        direccion: form.direccion,
        distrito: form.distrito,
        referencia: form.referencia,
      }));
    } else {
      if (!formRecojo.nombre || !formRecojo.telefono) {
        setError(idioma === 'en' ? 'Please enter your name and phone number.' : 'Por favor completa tu nombre y teléfono.');
        return;
      }
      sessionStorage.setItem('checkout_envio', JSON.stringify({
        tipo: 'recojo',
        nombre: formRecojo.nombre,
        telefono: formRecojo.telefono,
        direccion: 'Casa de parce — Arequipa',
      }));
    }

    navigate('/metodo-pago');
  };

  return (
    <>
      <Header />
      <main className="checkout-page">
        {/* Indicador de pasos */}
        <div className="checkout-steps">
          <div className="step activo">
            <span className="step-num">1</span>
            <span className="step-label"><ET k="steps.entrega" /></span>
          </div>
          <div className="step-linea" />
          <div className="step">
            <span className="step-num">2</span>
            <span className="step-label"><ET k="steps.pago" /></span>
          </div>
          <div className="step-linea" />
          <div className="step">
            <span className="step-num">3</span>
            <span className="step-label"><ET k="steps.confirmacion" /></span>
          </div>
        </div>

        <h1><ET k="checkout.tipo_envio" /></h1>

        {/* Email para invitados */}
        {!usuario && (
          <div className="checkout-form" style={{ marginBottom: '12px' }}>
            <h2><Editable id="checkout_email_titulo" as="span">{idioma === 'en' ? 'Your email' : 'Tu correo'}</Editable></h2>
            <div className="checkout-grid">
              <label className="full">
                <Editable id="checkout_email_label" as="span">Email</Editable> <span className="req">*</span>
                <input
                  type="email"
                  placeholder="tucorreo@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              <Editable id="checkout_email_hint" as="span" multiline>{idioma === 'en'
                ? 'We\'ll send your order confirmation here.'
                : 'Te enviaremos la confirmación de tu pedido aquí.'}</Editable>
            </p>
          </div>
        )}

        {/* Tarjetas de opción */}
        <div className="checkout-opciones">
          <button
            className={`checkout-opcion ${modo === 'envio' ? 'seleccionada' : ''}`}
            onClick={() => setModo('envio')}
          >
            <div className="opcion-icono"><IconoCasa /></div>
            <div className="opcion-info">
              <strong><ET k="checkout.envio_dom" /></strong>
              <span><ET k="checkout.envio_dom_sub" /></span>
            </div>
            <div className={`opcion-radio ${modo === 'envio' ? 'on' : ''}`} />
          </button>

          <button
            className={`checkout-opcion ${modo === 'recojo' ? 'seleccionada' : ''}`}
            onClick={() => setModo('recojo')}
          >
            <div className="opcion-icono"><IconoTienda /></div>
            <div className="opcion-info">
              <strong><ET k="checkout.recojo" /></strong>
              <span><ET k="checkout.recojo_sub" /></span>
            </div>
            <div className={`opcion-radio ${modo === 'recojo' ? 'on' : ''}`} />
          </button>
        </div>

        {/* Formulario envío a domicilio */}
        {modo === 'envio' && (
          <div className="checkout-form">
            <h2><Editable id="checkout_envio_titulo" as="span">{idioma === 'en' ? 'Shipping details' : 'Datos de envío'}</Editable></h2>
            <div className="checkout-grid">
              <label>
                <ET k="checkout.nombre" /> <span className="req">*</span>
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </label>
              <label>
                <ET k="checkout.telefono" /> <span className="req">*</span>
                <input
                  placeholder="987 654 321"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                />
              </label>
              <label className="full">
                <ET k="checkout.direccion" /> <span className="req">*</span>
                <input
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                />
              </label>
              <label>
                <ET k="checkout.distrito" /> <span className="req">*</span>
                <input
                  value={form.distrito}
                  onChange={e => setForm({ ...form, distrito: e.target.value })}
                />
              </label>
              <label>
                <ET k="checkout.referencia" />
                <input
                  value={form.referencia}
                  onChange={e => setForm({ ...form, referencia: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}

        {/* Formulario recojo en tienda */}
        {modo === 'recojo' && (
          <div className="checkout-form">
            <div className="recojo-info-box">
              <div className="recojo-pin">📍</div>
              <div>
                <strong><ET k="checkout.recojo_sub" /></strong>
                <p>Arequipa, {idioma === 'en' ? 'Peru' : 'Perú'}</p>
                <p className="recojo-nota">
                  <Editable id="checkout_recojo_nota" as="span" multiline>{idioma === 'en'
                    ? 'We\'ll contact you by WhatsApp to arrange a pickup time.'
                    : 'Te contactaremos por WhatsApp para coordinar el horario de recojo.'}</Editable>
                </p>
              </div>
            </div>
            <h2><Editable id="checkout_recojo_titulo" as="span">{idioma === 'en' ? 'Your contact info' : 'Tus datos de contacto'}</Editable></h2>
            <div className="checkout-grid">
              <label>
                <ET k="checkout.nombre" /> <span className="req">*</span>
                <input
                  value={formRecojo.nombre}
                  onChange={e => setFormRecojo({ ...formRecojo, nombre: e.target.value })}
                />
              </label>
              <label>
                <ET k="checkout.telefono" /> <span className="req">*</span>
                <input
                  placeholder="987 654 321"
                  value={formRecojo.telefono}
                  onChange={e => setFormRecojo({ ...formRecojo, telefono: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}

        {error && <p className="checkout-error">{error}</p>}

        <button className="checkout-btn-continuar" onClick={continuar}>
          <ET k="checkout.continuar" sinColor /> →
        </button>
      </main>
      <Footer />
    </>
  );
}
