import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
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
  const [modo, setModo] = useState(null); // 'envio' | 'recojo'
  const [form, setForm] = useState({
    nombre: '', telefono: '', direccion: '', distrito: '', referencia: '',
  });
  const [formRecojo, setFormRecojo] = useState({
    nombre: '', telefono: '',
  });
  const [error, setError] = useState('');

  const continuar = () => {
    setError('');

    if (!modo) {
      setError('Por favor selecciona una opción de entrega.');
      return;
    }

    if (modo === 'envio') {
      if (!form.nombre || !form.telefono || !form.direccion || !form.distrito) {
        setError('Por favor completa todos los campos obligatorios (*).');
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
        setError('Por favor completa tu nombre y teléfono.');
        return;
      }
      sessionStorage.setItem('checkout_envio', JSON.stringify({
        tipo: 'recojo',
        nombre: formRecojo.nombre,
        telefono: formRecojo.telefono,
        direccion: 'Casa de Sergio — Arequipa',
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
            <span className="step-label">Entrega</span>
          </div>
          <div className="step-linea" />
          <div className="step">
            <span className="step-num">2</span>
            <span className="step-label">Pago</span>
          </div>
          <div className="step-linea" />
          <div className="step">
            <span className="step-num">3</span>
            <span className="step-label">Confirmación</span>
          </div>
        </div>

        <h1>¿Cómo quieres recibir tu pedido?</h1>

        {/* Tarjetas de opción */}
        <div className="checkout-opciones">
          <button
            className={`checkout-opcion ${modo === 'envio' ? 'seleccionada' : ''}`}
            onClick={() => setModo('envio')}
          >
            <div className="opcion-icono"><IconoCasa /></div>
            <div className="opcion-info">
              <strong>Envío a domicilio</strong>
              <span>Te lo llevamos donde tú estés</span>
            </div>
            <div className={`opcion-radio ${modo === 'envio' ? 'on' : ''}`} />
          </button>

          <button
            className={`checkout-opcion ${modo === 'recojo' ? 'seleccionada' : ''}`}
            onClick={() => setModo('recojo')}
          >
            <div className="opcion-icono"><IconoTienda /></div>
            <div className="opcion-info">
              <strong>Recojo en tienda</strong>
              <span>Casa de Sergio · Arequipa</span>
            </div>
            <div className={`opcion-radio ${modo === 'recojo' ? 'on' : ''}`} />
          </button>
        </div>

        {/* Formulario envío a domicilio */}
        {modo === 'envio' && (
          <div className="checkout-form">
            <h2>Datos de envío</h2>
            <div className="checkout-grid">
              <label>
                Nombre completo <span className="req">*</span>
                <input
                  placeholder="Juan Quispe"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </label>
              <label>
                Teléfono / WhatsApp <span className="req">*</span>
                <input
                  placeholder="987 654 321"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                />
              </label>
              <label className="full">
                Dirección completa <span className="req">*</span>
                <input
                  placeholder="Calle Los Pinos 123, Urb. El Palomar"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                />
              </label>
              <label>
                Distrito <span className="req">*</span>
                <input
                  placeholder="Miraflores, Arequipa..."
                  value={form.distrito}
                  onChange={e => setForm({ ...form, distrito: e.target.value })}
                />
              </label>
              <label>
                Referencia (opcional)
                <input
                  placeholder="Frente al parque, casa azul..."
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
                <strong>Casa de Sergio</strong>
                <p>Arequipa, Perú</p>
                <p className="recojo-nota">Te contactaremos por WhatsApp para coordinar el horario de recojo.</p>
              </div>
            </div>
            <h2>Tus datos de contacto</h2>
            <div className="checkout-grid">
              <label>
                Nombre completo <span className="req">*</span>
                <input
                  placeholder="Juan Quispe"
                  value={formRecojo.nombre}
                  onChange={e => setFormRecojo({ ...formRecojo, nombre: e.target.value })}
                />
              </label>
              <label>
                Teléfono / WhatsApp <span className="req">*</span>
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
          Continuar al pago →
        </button>
      </main>
      <Footer />
    </>
  );
}
