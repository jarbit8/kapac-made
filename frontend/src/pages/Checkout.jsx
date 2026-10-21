import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import PasosCompra from '../components/PasosCompra';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useIdioma } from '../context/LanguageContext';
import { obtenerPerfil } from '../firebase/perfil';
import '../styles/Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { items } = useCart();
  const { t, idioma } = useIdioma();
  const [modo, setModo] = useState(null); // 'envio' | 'recojo'
  const [form, setForm] = useState({
    nombre: '', telefono: '', direccion: '', distrito: '', referencia: '',
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

    // El correo ya no se pide aquí: se ofrece como opción después del pago
    // (pantalla de Confirmación), para no frenar la compra a quien no quiere darlo.
    sessionStorage.setItem('checkout_email', usuario ? usuario.email : '');

    if (modo === 'envio') {
      if (!form.nombre || !form.telefono || !form.direccion || !form.distrito) {
        setError(idioma === 'en' ? 'Please fill in all required fields (*).' : 'Por favor completa todos los campos obligatorios (*).');
        return;
      }
      sessionStorage.setItem('checkout_nombre', form.nombre);
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
      sessionStorage.setItem('checkout_nombre', formRecojo.nombre);
      sessionStorage.setItem('checkout_envio', JSON.stringify({
        tipo: 'recojo',
        nombre: formRecojo.nombre,
        telefono: formRecojo.telefono,
        direccion: 'Recojo en Arequipa',
      }));
    }

    navigate('/metodo-pago');
  };

  if (!items.length) return <Navigate to="/carrito" replace />;

  return (
    <>
      <Header />
      <main className="checkout-page">
        <PasosCompra actual={1} />

        <h1>{t('checkout.tipo_envio')}</h1>

        <div className="checkout-opciones">
          <button
            className={`checkout-opcion ${modo === 'envio' ? 'seleccionada' : ''}`}
            onClick={() => setModo('envio')}
          >
            <div className="opcion-icono"><Icono nombre="camion" tam={30} /></div>
            <div className="opcion-info">
              <strong>{t('checkout.envio_dom')}</strong>
              <span>{t('checkout.envio_dom_sub')}</span>
            </div>
            <div className={`opcion-radio ${modo === 'envio' ? 'on' : ''}`} />
          </button>

          <button
            className={`checkout-opcion ${modo === 'recojo' ? 'seleccionada' : ''}`}
            onClick={() => setModo('recojo')}
          >
            <div className="opcion-icono"><Icono nombre="tienda" tam={30} /></div>
            <div className="opcion-info">
              <strong>{t('checkout.recojo')}</strong>
              <span>{t('checkout.recojo_sub')}</span>
            </div>
            <div className={`opcion-radio ${modo === 'recojo' ? 'on' : ''}`} />
          </button>
        </div>

        {modo === 'envio' && (
          <div className="checkout-form">
            <h2>{t('checkout.envio_titulo')}</h2>
            <div className="checkout-grid">
              <label>
                {t('checkout.nombre')} <span className="req">*</span>
                <input
                  autoComplete="name"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </label>
              <label>
                {t('checkout.telefono')} <span className="req">*</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="987 654 321"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                />
              </label>
              <label className="full">
                {t('checkout.direccion')} <span className="req">*</span>
                <input
                  autoComplete="street-address"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                />
              </label>
              <label>
                {t('checkout.distrito')} <span className="req">*</span>
                <input
                  value={form.distrito}
                  onChange={e => setForm({ ...form, distrito: e.target.value })}
                />
              </label>
              <label>
                {t('checkout.referencia')}
                <input
                  value={form.referencia}
                  onChange={e => setForm({ ...form, referencia: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}

        {modo === 'recojo' && (
          <div className="checkout-form">
            <div className="recojo-info-box">
              <div className="recojo-pin"><Icono nombre="ubicacion" tam={24} /></div>
              <div>
                <strong>{t('checkout.recojo')}</strong>
                <p>{t('checkout.recojo_sub')}</p>
              </div>
            </div>
            <h2>{t('checkout.contacto_titulo')}</h2>
            <div className="checkout-grid">
              <label>
                {t('checkout.nombre')} <span className="req">*</span>
                <input
                  autoComplete="name"
                  value={formRecojo.nombre}
                  onChange={e => setFormRecojo({ ...formRecojo, nombre: e.target.value })}
                />
              </label>
              <label>
                {t('checkout.telefono')} <span className="req">*</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="987 654 321"
                  value={formRecojo.telefono}
                  onChange={e => setFormRecojo({ ...formRecojo, telefono: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}

        {error && <p className="checkout-error"><Icono nombre="alerta" tam={16} /> {error}</p>}

        <button className="checkout-btn-continuar" onClick={continuar}>
          {t('checkout.continuar')} <Icono nombre="flechaDer" tam={18} />
        </button>
      </main>
      <Footer />
    </>
  );
}
