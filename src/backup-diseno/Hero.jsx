import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Hero.css';
import heroImg from '../../assets/images/foto 5.png';

export default function Hero() {
  return (
    <section className="hero">
      <img src={heroImg} alt="Kapac Made" className="hero-bg" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="hero-tagline">Mochilas para explorar sin límites</p>
        <h1 className="hero-title">KAPAC MADE</h1>
        <Link to="/catalogo" className="hero-btn">Ver colección</Link>
      </div>
    </section>
  );
}
