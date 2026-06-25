import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/Footer.css';
import logoFooter from '../../assets/images/kapac_made_1.png';
import { useIdioma } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { cerrarSesion } from '../../firebase/auth';
import { pedirCodigo, confirmarCodigo } from '../../firebase/newsletter';
import { obtenerContenido, FOOTER_FONDO_DEFAULT, medioDispositivo } from '../../firebase/contenido';

/* ─── Iconos SVG (sociales) ─────────────────────────────────────────────── */
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const IconFacebook = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
  </svg>
);

const IconTikTok = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.45a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.27z"/>
  </svg>
);

/* ─── Iconos de pago (SVG inline — réplicas de las marcas reales) ───────── */
const IconYape = () => (
  <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="32" rx="6" fill="#142F8F"/>
    <text x="32" y="21.5" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="900" fontStyle="italic" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="-0.5">yape</text>
  </svg>
);

const IconPlin = () => (
  <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="32" rx="6" fill="#00C2A8"/>
    <text x="32" y="21.5" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="900" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="-0.3">plin</text>
  </svg>
);

const IconVisa = () => (
  <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="32" rx="6" fill="#1A1F71"/>
    <text x="32" y="21.5" textAnchor="middle" fill="#F7B600" fontSize="14" fontWeight="900" fontStyle="italic" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="1.5">VISA</text>
  </svg>
);

const IconMastercard = () => (
  <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="32" rx="6" fill="#fff" stroke="#e0e0e0"/>
    <circle cx="27" cy="16" r="8" fill="#EB001B"/>
    <circle cx="37" cy="16" r="8" fill="#F79E1B" fillOpacity="0.92"/>
    <path d="M32 9.8a8 8 0 0 1 0 12.4 8 8 0 0 1 0-12.4z" fill="#FF5F00"/>
  </svg>
);

const IconAmex = () => (
  <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="32" rx="6" fill="#2E77BC"/>
    <text x="32" y="20.5" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="900" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="0.5">AMERICAN</text>
    <text x="32" y="28" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="900" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="0.5">EXPRESS</text>
  </svg>
);

const IconPagoEfectivo = () => (
  <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="32" rx="6" fill="#0033A0"/>
    <text x="32" y="14" textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="800" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="0.3">PAGO</text>
    <text x="32" y="24" textAnchor="middle" fill="#E5007E" fontSize="8.5" fontWeight="900" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="0.3">EFECTIVO</text>
  </svg>
);


export default function Footer() {
  const { t, idioma } = useIdioma();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const es = idioma === 'es';

  const handleLogout = async (e) => {
    e.preventDefault();
    await cerrarSesion();
    navigate('/');
  };

  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [paso, setPaso] = useState('email'); // 'email' | 'codigo' | 'ok'
  const [cargandoNews, setCargandoNews] = useState(false);
  const [msgNews, setMsgNews] = useState('');
  const [fondoCfg, setFondoCfg] = useState(FOOTER_FONDO_DEFAULT);
  const [videoFallo, setVideoFallo] = useState(false);
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    obtenerContenido().then((c) => c.footerFondo && setFondoCfg(c.footerFondo)).catch(() => {});
  }, []);

  const fondo = medioDispositivo(fondoCfg, esMobile) || FOOTER_FONDO_DEFAULT;

  const handlePedirCodigo = async (e) => {
    e.preventDefault();
    setMsgNews('');
    setCargandoNews(true);
    const res = await pedirCodigo(correo);
    setCargandoNews(false);
    if (res.ok && res.yaExistia) {
      setPaso('ok');
    } else if (res.ok) {
      setPaso('codigo');
    } else {
      setMsgNews(res.mensaje || (es ? 'No se pudo enviar el código.' : 'Could not send the code.'));
    }
  };

  const handleConfirmarCodigo = async (e) => {
    e.preventDefault();
    setMsgNews('');
    setCargandoNews(true);
    const res = await confirmarCodigo(correo, codigo);
    setCargandoNews(false);
    if (res.ok) {
      setPaso('ok');
      setCorreo('');
      setCodigo('');
    } else {
      setMsgNews(res.mensaje || (es ? 'Código incorrecto.' : 'Wrong code.'));
    }
  };

  return (
    <footer className="footer">

      {/* Fondo: video o imagen (editable desde el admin). Si el video falla, usa la imagen por defecto. */}
      {fondo.tipo === 'video' && !videoFallo ? (
        <video className="footer-bg" src={fondo.url} autoPlay muted loop playsInline
          onError={() => setVideoFallo(true)} />
      ) : (
        <div className="footer-bg" style={{ backgroundImage: `url('${fondo.tipo === 'video' ? FOOTER_FONDO_DEFAULT.url : fondo.url}')` }} />
      )}
      <div className="footer-overlay" />

      {/* Instagram centrado */}
      <div className="footer-ig">
        <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer-ig-link">
          <IconInstagram />
        </a>
      </div>

      {/* Newsletter — sin caja, directo sobre el fondo */}
      <div className="footer-news-wrap">
        <p className="footer-news-titulo">NEWS LETTER</p>
        {paso === 'ok' ? (
          <p className="footer-news-ok-mini">
            {es ? '¡Listo! Ya eres parte de la tribu 🎒' : 'Done! You\'re in the tribe 🎒'}
          </p>
        ) : paso === 'codigo' ? (
          <>
            <form className="footer-news-row" onSubmit={handleConfirmarCodigo}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={es ? 'Código de 6 dígitos' : '6-digit code'}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              />
              <button type="submit" disabled={cargandoNews}>
                {cargandoNews ? '...' : (es ? 'Confirmar' : 'Confirm')}
              </button>
            </form>
            <p className="footer-news-hint-mini">{es ? `Código enviado a ${correo}` : `Code sent to ${correo}`}</p>
          </>
        ) : (
          <form className="footer-news-row" onSubmit={handlePedirCodigo}>
            <input
              type="email"
              required
              placeholder={es ? 'info@ejemplo.com' : 'info@example.com'}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <button type="submit" disabled={cargandoNews}>
              {cargandoNews ? '...' : (es ? 'Suscribirme' : 'Subscribe')}
            </button>
          </form>
        )}
        {msgNews && <p className="footer-news-error-mini">{msgNews}</p>}
      </div>

      {/* Bottom */}
      <div className="footer-bottom-mini">
        <span className="footer-copy-mini">© Kapac Made</span>
        <span className="footer-powered">Powered by jarbit</span>
      </div>

    </footer>
  );
}
