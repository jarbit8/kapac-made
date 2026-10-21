import React, { useState, useEffect } from 'react';
import '../../styles/Footer.css';
import { useIdioma } from '../../context/LanguageContext';
import { pedirCodigo, confirmarCodigo } from '../../firebase/newsletter';
import { obtenerContenido, contenidoGuardado, medioDispositivo } from '../../firebase/contenido';
import Editable from '../Editable';
import { fotoRapida } from '../../utils/fotos';

/* ─── Iconos SVG (sociales) ─────────────────────────────────────────────── */
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function Footer() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';

  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [paso, setPaso] = useState('email'); // 'email' | 'codigo' | 'ok'
  const [cargandoNews, setCargandoNews] = useState(false);
  const [msgNews, setMsgNews] = useState('');
  const [fondoCfg, setFondoCfg] = useState(() => contenidoGuardado()?.footerFondo ?? null);
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

  const fondo = medioDispositivo(fondoCfg, esMobile);

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
      {fondo && fondo.tipo === 'video' && !videoFallo ? (
        <video className="footer-bg" src={fotoRapida(fondo.url)} autoPlay muted loop playsInline
          onError={() => setVideoFallo(true)} />
      ) : fondo ? (
        <div className="footer-bg" style={{ backgroundImage: `url('${fotoRapida(fondo.url)}')` }} />
      ) : null}
      <div className="footer-overlay" />

      {/* Instagram centrado */}
      <div className="footer-ig">
        <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer-ig-link">
          <IconInstagram />
        </a>
      </div>

      {/* Newsletter — sin caja, directo sobre el fondo */}
      <div className="footer-news-wrap">
        <Editable id="footer_news_titulo" as="p" className="footer-news-titulo" estilo>NEWS LETTER</Editable>
        {paso === 'ok' ? (
          <p className="footer-news-ok-mini">
            <Editable id="footer_news_ok" as="span">{es ? '¡Listo! Ya eres parte de la tribu 🎒' : 'Done! You\'re in the tribe 🎒'}</Editable>
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
                {cargandoNews ? '...' : <Editable id="footer_news_confirmar" as="span" sinColor>{es ? 'Confirmar' : 'Confirm'}</Editable>}
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
              {cargandoNews ? '...' : <Editable id="footer_news_suscribirme" as="span" sinColor>{es ? 'Suscribirme' : 'Subscribe'}</Editable>}
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
