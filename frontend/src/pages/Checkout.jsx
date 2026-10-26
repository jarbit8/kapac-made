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
import { cuentaDe } from '../utils/compra';
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
  const cuenta = cuentaDe(usuario);
  const { items } = useCart();
  const { t, idioma } = useIdioma();
  // Al volver desde el pago se recuperan los datos ya escritos
  const [guardado] = useState(leerGuardado);
  const [form, setForm] = useState({
    nombre: '', telefono: '', direccion: '', distrito: '', referencia: '',
    ...(guardado?.tipo === 'envio' ? guardado : {}),
  });
  const [error, setError] = useState('');

  // Autocompletar con datos del perfil guardado
  useEffect(() => {
    if (!cuenta || guardado) return;
    const cargar = async () => {
      const datos = await obtenerPerfil(cuenta.uid);
      if (datos) {
        setForm({
          nombre:    datos.nombre    || cuenta.displayName || '',
          telefono:  datos.telefono  || '',
          direccion: datos.direccion || '',
          distrito:  datos.distrito  || '',
          referencia: datos.referencia || '',
        });
      } else {
        const nombre = cuenta.displayName || '';
        setForm(prev => ({ ...prev, nombre }));
      }
    };
    cargar();
  }, [cuenta, guardado]);

  const continuar = () => {
    setError('');

    // Por ahora solo hay envío a domicilio (el recojo en Arequipa se quitó)
    const nombre = limpiar(form.nombre);
    const telefono = form.telefono.trim();
    const direccion = limpiar(form.direccion);
    const distrito = limpiar(form.distrito);

    if (!nombre || !telefono || !direccion || !distrito) {
      setError(idioma === 'en' ? 'Please fill in all required fields (*).' : 'Por favor completa todos los campos obligatorios (*).');
      return;
    }
    if (letras(nombre) < 2 || nombre.length > 80) return setError(t('checkout.err_nombre'));
    if (!/^\d{9}$/.test(telefono9(telefono))) return setError(t('checkout.err_telefono'));
    if (letras(direccion) < 3 || direccion.length < 5 || direccion.length > 150) return setError(t('checkout.err_direccion'));
    if (letras(distrito) < 3 || distrito.length > 60) return setError(t('checkout.err_distrito'));

    // El correo ya no se pide aquí: se ofrece como opción después del pago
    // (pantalla de Confirmación), para no frenar la compra a quien no quiere darlo.
    sessionStorage.setItem('checkout_email', cuenta ? cuenta.email : '');
    sessionStorage.setItem('checkout_nombre', nombre);
    sessionStorage.setItem('checkout_envio', JSON.stringify(
      { tipo: 'envio', nombre, telefono: telefono9(telefono), direccion, distrito, referencia: limpiar(form.referencia) }));

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
          <div className="checkout-opcion seleccionada">
            <div className="opcion-icono"><Icono nombre="camion" tam={30} /></div>
            <div className="opcion-info">
              <strong>{t('checkout.envio_dom')}</strong>
              <span>{t('checkout.envio_dom_sub')}</span>
            </div>
            <div className="opcion-radio on" />
          </div>
        </div>

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

        {error && <p className="checkout-error"><Icono nombre="alerta" tam={16} /> {error}</p>}

        <button className="checkout-btn-continuar" onClick={continuar}>
          {t('checkout.continuar')} <Icono nombre="flechaDer" tam={18} />
        </button>
      </main>
      <Footer />
    </>
  );
}
