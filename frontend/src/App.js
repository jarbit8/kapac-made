import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { TextosProvider } from './context/TextosContext';
import { TemaProvider, useTema } from './context/TemaContext';
import SitioCerrado from './components/SitioCerrado/SitioCerrado';
import Cargando from './components/Cargando/Cargando';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Lifestyle from './components/Lifestyle/Lifestyle';
import Footer from './components/Footer/Footer';
import Catalogo from './pages/Catalogo';
import Alma from './pages/Alma';
import B2B from './pages/B2B';
import Contacto from './pages/Contacto';
import Legal from './pages/Legal';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Carrito from './pages/Carrito';
import Pedidos from './pages/Pedidos';
import Producto from './pages/Producto';
import Zone from './pages/Zone';
import Pago from './pages/Pago';
import Checkout from './pages/Checkout';
import MetodoPago from './pages/MetodoPago';
import PagoTarjeta from './pages/PagoTarjeta';
import PagoYapeCulqi from './pages/PagoYapeCulqi';
import Confirmacion from './pages/Confirmacion';
import Perfil from './pages/Perfil';
import WhatsApp from './components/WhatsApp/WhatsApp';
import BarraEdicion from './components/BarraEdicion/BarraEdicion';
import ScrollToTop from './components/ScrollToTop';
import NavBar from './components/NavBar/NavBar';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import useTrackVisita from './hooks/useTrackVisita';
import './styles/App.css';

function Home() {
  return (
    <>
      <h1 className="solo-lector">Kapac Made</h1>
      <Header transparente />
      <Hero />
      {/* NavBar aparece justo debajo del video, se pega al top al scrollear */}
      <NavBar />
      <Lifestyle />
      <Footer />
    </>
  );
}

// Direcciones viejas: llevan a la nueva sin perder la búsqueda (?q=)
function RedirigirA({ ruta }) {
  const { search } = useLocation();
  return <Navigate to={`${ruta}${search}`} replace />;
}

function AppRoutes() {
  useTrackVisita();
  return (
    <Routes>
      <Route path="/"         element={<Home />} />
      <Route path="/shop"     element={<><NavBar /><Catalogo /></>} />
      <Route path="/producto/:id" element={<><NavBar /><Producto /></>} />
      <Route path="/zone" element={<Zone />} />
      <Route path="/kapac-made" element={<><NavBar /><Alma /></>} />
      <Route path="/b2b"      element={<><NavBar /><B2B /></>} />
      <Route path="/info"     element={<><NavBar /><Contacto /></>} />
      <Route path="/catalogo" element={<RedirigirA ruta="/shop" />} />
      <Route path="/alma"     element={<Navigate to="/kapac-made" replace />} />
      <Route path="/contacto" element={<Navigate to="/info" replace />} />
      <Route path="/legal"    element={<><NavBar /><Legal /></>} />
      <Route path="/admin"    element={<><NavBar /><Admin /></>} />
      <Route path="/login"    element={<><NavBar /><Login /></>} />
      <Route path="/carrito"  element={<><NavBar /><Carrito /></>} />
      <Route path="/pedidos"       element={<><NavBar /><Pedidos /></>} />
      <Route path="/checkout"      element={<><NavBar /><Checkout /></>} />
      <Route path="/metodo-pago"   element={<><NavBar /><MetodoPago /></>} />
      <Route path="/pago/tarjeta/:pedidoId" element={<><NavBar /><PagoTarjeta /></>} />
      <Route path="/pago/yape-codigo/:pedidoId" element={<><NavBar /><PagoYapeCulqi /></>} />
      <Route path="/pago/:metodo/:pedidoId" element={<><NavBar /><Pago /></>} />
      <Route path="/confirmacion/:pedidoId" element={<><NavBar /><Confirmacion /></>} />
      <Route path="/perfil"   element={<><NavBar /><Perfil /></>} />
      {/* URLs viejas o desconocidas (ej. enlaces antiguos de Google) → al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Tienda cerrada al público: todos ven "Próximamente" salvo el admin.
// Mientras se verifica la sesión también se muestra, para que nada del sitio
// se asome. El /login queda accesible para que el admin pueda entrar.
const esDispositivoAdmin = () => {
  try { return localStorage.getItem('kapac_dispositivo_admin') === '1'; } catch (_) { return false; }
};

function CierreGate({ children }) {
  const { cerrado } = useTema();
  const { cargando, esAdmin } = useAuth();
  const { pathname } = useLocation();
  if (cerrado && !esAdmin && pathname !== '/login') {
    // En el navegador del admin (sin la sesión recordada) se espera en vez de mostrar "Próximamente"
    if (cargando && esDispositivoAdmin()) return <Cargando />;
    return <SitioCerrado />;
  }
  return children;
}

// La pantalla del logo sale al entrar por el inicio, como mucho una vez cada 12 horas
// (no en cada recarga ni en las pestañas nuevas, como la de "in the zone")
const INTRO_KEY = 'kapac_intro_v1';
const INTRO_CADA = 12 * 60 * 60 * 1000;
const introVista = () => {
  if (window.location.pathname !== '/') return true;
  try { return Date.now() - Number(localStorage.getItem(INTRO_KEY) || 0) < INTRO_CADA; } catch (_) { return false; }
};

// Con la tienda cerrada se entra directo al video, sin la pantalla del logo
function Carga() {
  const { cerrado } = useTema();
  const [vista] = useState(introVista);
  const [fase, setFase] = useState(vista ? 'listo' : 'cargando'); // 'cargando' | 'saliendo' | 'listo'

  useEffect(() => {
    // La clase la pone index.html para mostrar el primer cuadro del video antes de que cargue React
    document.documentElement.classList.remove('cerrado');
    if (vista) return;
    const t1 = setTimeout(() => setFase('saliendo'), 1300);
    const t2 = setTimeout(() => setFase('listo'), 1780);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [vista]);

  const mostrando = !cerrado && fase !== 'listo';
  useEffect(() => {
    if (!mostrando) return;
    try { localStorage.setItem(INTRO_KEY, String(Date.now())); } catch (_) {}
  }, [mostrando]);

  if (!mostrando) return null;
  return <LoadingScreen saliendo={fase === 'saliendo'} />;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <TextosProvider>
            <TemaProvider>
              <Carga />
              <BrowserRouter>
                <ScrollToTop />
                <CierreGate>
                  <AppRoutes />
                  <WhatsApp />
                  <BarraEdicion />
                </CierreGate>
              </BrowserRouter>
            </TemaProvider>
          </TextosProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
