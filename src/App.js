import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Products from './components/Products/Products';
import Values from './components/Values/Values';
import Footer from './components/Footer/Footer';
import Catalogo from './pages/Catalogo';
import Alma from './pages/Alma';
import Contacto from './pages/Contacto';
import Legal from './pages/Legal';
import Bomber from './pages/Bomber';
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
    <HashRouter>
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/alma"     element={<Alma />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/legal"    element={<Legal />} />
        <Route path="/bomber"   element={<Bomber />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
