import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import '../styles/Contacto.css';

export default function Contacto() {
  return (
    <>
      <Header />
      <main className="contacto-page">
        <h1>Contacto</h1>
        <div className="contacto-content">
          <div className="contacto-dato">
            <span className="contacto-icon">📍</span>
            <p>Arequipa, Perú</p>
          </div>
          <div className="contacto-dato">
            <span className="contacto-icon">📞</span>
            <p>+51 997 050 752</p>
          </div>
          <div className="contacto-dato">
            <span className="contacto-icon">📷</span>
            <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
          <div className="contacto-dato">
            <span className="contacto-icon">📘</span>
            <a href="https://www.facebook.com/KapaqMade/reels/" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
          <div className="contacto-dato">
            <span className="contacto-icon">🎵</span>
            <a href="https://www.tiktok.com/@kapac.made" target="_blank" rel="noopener noreferrer">TikTok</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
