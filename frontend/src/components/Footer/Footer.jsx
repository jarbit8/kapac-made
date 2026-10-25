import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Footer.css';
import { useIdioma } from '../../context/LanguageContext';
import { pedirCodigo, confirmarCodigo } from '../../firebase/newsletter';
import { mensajeServidor } from '../../i18n/mensajes';
import { obtenerContenido, contenidoGuardado, medioDispositivo, slotMedio, cambiarContenido } from '../../firebase/contenido';
import Editable from '../Editable';
import CambiarMedio from '../CambiarMedio';
import Icono from '../Icono';
import IconoInstagram from '../IconoInstagram';
import { EMPRESA } from '../../config/empresa';
import { INSTAGRAM } from '../../config/redes';
import { fotoRapida } from '../../utils/fotos';
import { useTextos } from '../../context/TextosContext';
import useEsMobile from '../../hooks/useEsMobile';

// Botón del boletín. En modo edición el texto se edita fuera de un <button>: ahí el campo
// no recibe el toque ni el teclado en el celular.
function BotonNews({ id, cargando, children }) {
  const { esAdmin } = useTextos();
  if (esAdmin) return <span className="footer-news-boton"><Editable id={id} as="span" sinColor>{children}</Editable></span>;
  return (
    <button type="submit" disabled={cargando}>
      {cargando ? '...' : <Editable id={id} as="span" sinColor>{children}</Editable>}
    </button>
  );
}

export default function Footer() {
  const { t, idioma } = useIdioma();
  const { esAdmin } = useTextos();
  const es = idioma === 'es';

  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [paso, setPaso] = useState('email'); // 'email' | 'codigo' | 'ok'
  const [cargandoNews, setCargandoNews] = useState(false);
  const [msgNews, setMsgNews] = useState('');
  const [espera, setEspera] = useState(0); // segundos para poder reenviar el código
  const [fondoCfg, setFondoCfg] = useState(() => contenidoGuardado()?.footerFondo ?? null);
  const [videoFallo, setVideoFallo] = useState(false);
  const esMobile = useEsMobile();
  const cambiado = useRef(false); // la lectura inicial puede llegar tarde y no debe borrar lo que el admin acaba de cambiar

  useEffect(() => {
    obtenerContenido().then((c) => c.footerFondo && !cambiado.current && setFondoCfg(c.footerFondo)).catch(() => {});
  }, []);

  const fondo = medioDispositivo(fondoCfg, esMobile);

  const cambiarFondo = (slot) => async (nuevo) => {
    cambiado.current = true;
    const c = await cambiarContenido((b) => {
      const actual = b.footerFondo?.pc || b.footerFondo?.mobile ? b.footerFondo : {};
      return { footerFondo: { ...actual, [slot]: nuevo } };
    });
    setFondoCfg(c.footerFondo);
    setVideoFallo(false);
  };

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const textoError = (res, generico) => (
    res.error ? t(`news.err_${res.error}`) : mensajeServidor(res.mensaje, idioma, t(generico))
  );

  // El servidor no reenvía el código al mismo correo antes de 60 s
  const enviarCodigo = async () => {
    setMsgNews('');
    setCargandoNews(true);
    const res = await pedirCodigo(correo);
    setCargandoNews(false);
    if (res.ok && res.yaExistia) {
      setPaso('ok');
    } else if (res.ok) {
      setPaso('codigo');
      setEspera(60);
    } else {
      setMsgNews(textoError(res, 'news.err_enviar'));
    }
  };

  const handlePedirCodigo = (e) => {
    e.preventDefault();
    if (!esAdmin) enviarCodigo();
  };

  const cambiarCorreo = () => {
    setPaso('email');
    setCodigo('');
    setMsgNews('');
  };

  const handleConfirmarCodigo = async (e) => {
    e.preventDefault();
    if (esAdmin) return;
    setMsgNews('');
    setCargandoNews(true);
    const res = await confirmarCodigo(correo, codigo);
    setCargandoNews(false);
    if (res.ok) {
      setPaso('ok');
      setCorreo('');
      setCodigo('');
    } else {
      setMsgNews(textoError(res, 'news.err_codigo'));
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

      <div className="footer-editar cambiar-medio-grupo">
        <CambiarMedio texto="Fondo · computadora" carpeta="fondos"
          anterior={slotMedio(fondoCfg, 'pc')?.url} alSubir={cambiarFondo('pc')} />
        <CambiarMedio texto="Fondo · celular" carpeta="fondos"
          anterior={slotMedio(fondoCfg, 'mobile')?.url} alSubir={cambiarFondo('mobile')} />
      </div>

      {/* Instagram centrado */}
      <div className="footer-ig">
        <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer-ig-link">
          <IconoInstagram />
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
                aria-label={t('news.aria_codigo')}
                placeholder={es ? 'Código de 6 dígitos' : '6-digit code'}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              />
              <BotonNews id="footer_news_confirmar" cargando={cargandoNews}>{es ? 'Confirmar' : 'Confirm'}</BotonNews>
            </form>
            <p className="footer-news-hint-mini">{es ? `Código enviado a ${correo}` : `Code sent to ${correo}`}</p>
            <div className="footer-news-acciones">
              <button type="button" onClick={cambiarCorreo}>{t('news.cambiar_correo')}</button>
              <button type="button" onClick={enviarCodigo} disabled={cargandoNews || espera > 0}>
                {espera > 0 ? `${t('news.reenviar_en')} ${espera} s` : t('news.reenviar')}
              </button>
            </div>
          </>
        ) : (
          <form className="footer-news-row" onSubmit={handlePedirCodigo}>
            <input
              type="email"
              required
              autoComplete="email"
              aria-label={t('news.aria_correo')}
              placeholder={es ? 'info@ejemplo.com' : 'info@example.com'}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <BotonNews id="footer_news_suscribirme" cargando={cargandoNews}>{es ? 'Suscribirme' : 'Subscribe'}</BotonNews>
          </form>
        )}
        {msgNews && <p className="footer-news-error-mini">{msgNews}</p>}
      </div>

      {/* Bottom */}
      <div className="footer-bottom-mini">
        <Link to="/libro-reclamaciones" className="footer-libro">
          <Icono nombre="libro" tam={16} /> {t('libro.titulo')}
        </Link>
        <span className="footer-copy-mini">© Kapac Made</span>
        <span className="footer-empresa">{EMPRESA.razonSocial} · RUC {EMPRESA.ruc}</span>
        <span className="footer-powered">Powered by jarbit</span>
      </div>

    </footer>
  );
}
