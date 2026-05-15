import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import '../styles/Legal.css';

export default function Legal() {
  return (
    <>
      <Header />
      <main className="legal-page">
        <h1>Información Legal</h1>

        <section className="legal-section">
          <h2>Términos y Condiciones</h2>
          <p>Al realizar una compra en Kapac Made aceptas los siguientes términos. Los productos están sujetos a disponibilidad. Los precios pueden cambiar sin previo aviso.</p>
        </section>

        <section className="legal-section">
          <h2>Política de Devoluciones</h2>
          <p>Aceptamos devoluciones dentro de los 14 días posteriores a la recepción del producto, siempre que esté en su estado original y sin uso. Los gastos de envío de devolución corren por cuenta del cliente.</p>
        </section>

        <section className="legal-section">
          <h2>Política de Envíos</h2>
          <p>Realizamos envíos a todo el Perú. El tiempo de entrega estimado es de 3 a 7 días hábiles. Para Lima el plazo es de 2 a 4 días hábiles.</p>
        </section>

        <section className="legal-section">
          <h2>Política de Privacidad</h2>
          <p>Tus datos personales son utilizados únicamente para procesar tu pedido y mejorar tu experiencia de compra. No compartimos tu información con terceros.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
