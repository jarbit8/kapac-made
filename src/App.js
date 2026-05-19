import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Products from './components/Products/Products';
import Values from './components/Values/Values';
import Footer from './components/Footer/Footer';
import Catalogo from './pages/Catalogo';
import Alma from './pages/Alma';
import Contacto from './pages/Contacto';
import Legal from './pages/Legal';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Carrito from './pages/Carrito';
import Pedidos from './pages/Pedidos';
import Producto from './pages/Producto';
import Pago from './pages/Pago';
import Checkout from './pages/Checkout';
import MetodoPago from './pages/MetodoPago';
import PagoTarjeta from './pages/PagoTarjeta';
import './styles/App.css';

function Home() {
  return (
    <>
      <Header />
      <Hero />
      <div id="productos">
        <Products />
      </div>
      <Values />
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <HashRouter>
          <Routes>
            <Route path="/"         element={<Home />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/producto/:id" element={<Producto />} />
            <Route path="/alma"     element={<Alma />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/legal"    element={<Legal />} />
            <Route path="/admin"    element={<Admin />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/carrito"  element={<Carrito />} />
            <Route path="/pedidos"       element={<Pedidos />} />
            <Route path="/checkout"      element={<Checkout />} />
            <Route path="/metodo-pago"   element={<MetodoPago />} />
            <Route path="/pago/:metodo/:pedidoId" element={<Pago />} />
            <Route path="/pago/tarjeta/:pedidoId" element={<PagoTarjeta />} />
          </Routes>
        </HashRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
