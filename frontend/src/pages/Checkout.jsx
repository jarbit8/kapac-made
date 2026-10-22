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

const limpiar = (v) => v.trim().replace(/\s+/g, ' ');
const letras = (v) => (v.match(/\p{L}/gu) || []).length;

// Celular peruano: acepta espacios, guiones y +51 al escribir, guarda solo los 9 dígitos
const telefono9 = (v) => {
  const d = v.replace(/\D/g, '');
  return d.length === 11 && d.startsWith('51') ? d.slice(2) : d;
};

const leerGuardado = () => {
  try { return JSON.parse(sessionStorage.getItem('checkout_envio')) || null; } catch { return null; }
};

export default function Checkout() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { items } = useCart();
  const { t, idioma } = useIdioma();
  // Al volver desde el pago se recuperan los datos ya escritos
  const [guardado] = useState(leerGuardado);
  const [modo, setModo] = useState(guardado?.tipo || null); // 'envio' | 'recojo'
  const [form, setForm] = useState({
    nombre: '', telefono: '', direccion: '', distrito: '', referencia: '',
    ...(guardado?.tipo === 'envio' ? guardado : {}),
  });
  const [formRecojo, setFormRecojo] = useState({
    nombre: '', telefono: '',
    ...(guardado?.tipo === 'recojo' ? { nombre: guardado.nombre, telefono: guardado.telefono } : {}),
  });
  const [error, setError] = useState('');

  // Autocompletar con datos del perfil guardado
  useEffect(() => {
    if (!usuario || guardado) return;
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
  }, [usuario, guardado]);

  const elegir = (m) => {
    setModo(m);
    setError('');
  };

  const continuar = () => {
    setError('');

    if (!modo) {
      setError(idioma === 'en' ? 'Please select a delivery option.' : 'Por favor selecciona una opción de entrega.');
      return;
    }

    const envio = modo === 'envio';
    const campos = envio ? form : formRecojo;
    const nombre = limpiar(campos.nombre);
    const telefono = campos.telefono.trim();
    const direccion = envio ? limpiar(form.direccion) : 'Recojo en Arequipa';
    const distrito = envio ? limpiar(form.distrito) : '';

    if (!nombre || !telefono || (envio && (!direccion || !distrito))) {
      if (envio) setError(idioma === 'en' ? 'Please fill in all required fields (*).' : 'Por favor completa todos los campos obligatorios (*).');
      else setError(idioma === 'en' ? 'Please enter your name and phone number.' : 'Por favor completa tu nombre y teléfono.');
      return;
    }
    if (letras(nombre) < 2 || nombre.length > 80) return setError(t('checkout.err_nombre'));
    if (!/^\d{9}$/.test(telefono9(telefono))) return setError(t('checkout.err_telefono'));
    if (envio && (letras(direccion) < 3 || direccion.length < 5 || direccion.length > 150)) return setError(t('checkout.err_direccion'));
    if (envio && (letras(distrito) < 3 || distrito.length > 60)) return setError(t('checkout.err_distrito'));

    // El correo ya no se pide aquí: se ofrece como opción después del pago
    // (pantalla de Confirmación), para no frenar la compra a quien no quiere darlo.
    sessionStorage.setItem('checkout_email', usuario ? usuario.email : '');
    sessionStorage.setItem('checkout_nombre', nombre);
    sessionStorage.setItem('checkout_envio', JSON.stringify(envio
      ? { tipo: 'envio', nombre, telefono: telefono9(telefono), direccion, distrito, referencia: limpiar(form.referencia) }
      : { tipo: 'recojo', nombre, telefono: telefono9(telefono), direccion }));

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
            onClick={() => elegir('envio')}
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
            onClick={() => elegir('recojo')}
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
                <span>{t('checkout.nombre')} <span className="req">*</span></span>
                <input
                  autoComplete="name"
                  maxLength={80}
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </label>
              <label>
                <span>{t('checkout.telefono')} <span className="req">*</span></span>
                <input
                  type="tel"
                  autoComplete="tel"
                  maxLength={16}
                  placeholder="987 654 321"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                />
              </label>
              <label className="full">
                <span>{t('checkout.direccion')} <span className="req">*</span></span>
                <input
                  autoComplete="street-address"
                  maxLength={150}
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                />
              </label>
              <label>
                <span>{t('checkout.distrito')} <span className="req">*</span></span>
                <input
                  maxLength={60}
                  value={form.distrito}
                  onChange={e => setForm({ ...form, distrito: e.target.value })}
                />
              </label>
              <label>
                {t('checkout.referencia')}
                <input
                  maxLength={150}
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
                <span>{t('checkout.nombre')} <span className="req">*</span></span>
                <input
                  autoComplete="name"
                  maxLength={80}
                  value={formRecojo.nombre}
                  onChange={e => setFormRecojo({ ...formRecojo, nombre: e.target.value })}
                />
              </label>
              <label>
                <span>{t('checkout.telefono')} <span className="req">*</span></span>
                <input
                  type="tel"
                  autoComplete="tel"
                  maxLength={16}
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
