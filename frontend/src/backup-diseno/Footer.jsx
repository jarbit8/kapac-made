import React from 'react';
import '../../styles/Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-columns">
        <div className="footer-col">
          <h4>Contacto</h4>
          <p>📍 Arequipa, Perú</p>
          <p>📞 +51 997 050 752</p>
        </div>
        <div className="footer-col">
          <h4>Síguenos</h4>
          <div className="footer-social">
            <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://www.facebook.com/KapaqMade/reels/" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://www.tiktok.com/@kapac.made" target="_blank" rel="noopener noreferrer">TikTok</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">© 2025 Kapac Made · Arequipa, Perú</p>
        <div className="footer-payments">
          <span>Yape</span>
          <span>Plin</span>
          <span>Visa</span>
          <span>Mastercard</span>
        </div>
      </div>
    </footer>
  );
}
