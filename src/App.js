import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { TextosProvider } from './context/TextosContext';
import { TemaProvider } from './context/TemaContext';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Products from './components/Products/Products';
import Lifestyle from './components/Lifestyle/Lifestyle';
import Values from './components/Values/Values';
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
import KapacAI from './components/KapacAI/KapacAI';
import ScrollToTop from './components/ScrollToTop';
import NavBar from './components/NavBar/NavBar';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import useTrackVisita from './hooks/useTrackVisita';
import './styles/App.css';

function Home() {
  return (
    <>
      <Header transparente />
      <Hero />
      {/* NavBar aparece justo debajo del video, se pega al top al scrollear */}
      <NavBar />
      <Lifestyle />
      <Footer />
    </>
  );
}

function AppRoutes() {
  useTrackVisita();
  return (
    <Routes>
      <Route path="/"         element={<Home />} />
      <Route path="/catalogo" element={<><NavBar /><Catalogo /></>} />
      <Route path="/producto/:id" element={<><NavBar /><Producto /></>} />
      <Route path="/zone" element={<Zone />} />
      <Route path="/alma"     element={<><NavBar /><Alma /></>} />
      <Route path="/b2b"      element={<><NavBar /><B2B /></>} />
      <Route path="/contacto" element={<><NavBar /><Contacto /></>} />
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
    </Routes>
  );
}

function App() {
  const [fase, setFase] = useState('cargando'); // 'cargando' | 'saliendo' | 'listo'

  useEffect(() => {
    const t1 = setTimeout(() => setFase('saliendo'), 1300);
    const t2 = setTimeout(() => setFase('listo'), 1780);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <TextosProvider>
            <TemaProvider>
              {fase !== 'listo' && <LoadingScreen saliendo={fase === 'saliendo'} />}
              <HashRouter>
                <ScrollToTop />
                <AppRoutes />
                <KapacAI />
              </HashRouter>
            </TemaProvider>
          </TextosProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
