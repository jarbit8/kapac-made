import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './KapacAI.css';
import '../EditableImage.css';
import logoKapacAI from '../../assets/images/kapac_ai.jpeg';
import ojoVideo from '../../assets/videos/ojo.mp4';
import { useTextos } from '../../context/TextosContext';
import { subirImagen } from '../../firebase/almacenamiento';

/* Ícono de mensaje (burbuja con 3 puntos) */
const IconMensaje = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.028 2 11c0 2.58 1.077 4.923 2.82 6.622L4 22l4.572-1.592A10.56 10.56 0 0 0 12 21c5.523 0 10-4.028 10-9s-4.477-9-10-9z"/>
    <circle cx="8.5" cy="11" r="1.2" fill="#fff"/>
    <circle cx="12" cy="11" r="1.2" fill="#fff"/>
    <circle cx="15.5" cy="11" r="1.2" fill="#fff"/>
  </svg>
);

// URL del backend — solo activo si está explícitamente configurado
const BACKEND = process.env.REACT_APP_KAPAC_AI_URL || '';
const BACKEND_LISTO = !!BACKEND;

export default function KapacAI() {
  const { pathname } = useLocation();
  const enHome = pathname === '/';
  const [visible, setVisible] = useState(!enHome);
  const [abierto, setAbierto] = useState(false);

  // Logo del chat editable directo acá (solo admin)
  const { textos, esAdmin, guardar } = useTextos();
  const logoChat = textos['kai_logo'] || logoKapacAI;
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const logoChatRef = useRef(null);
  const cambiarLogoChat = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const url = await subirImagen(file, 'sitio');
      await guardar('kai_logo', url);
    } catch (_) { /* error silencioso */ }
    setSubiendoLogo(false);
  };

  // Ocultar sobre el video en home, mostrar al pasar el hero
  useEffect(() => {
    if (pathname !== '/') { setVisible(true); return; }
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.45);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);
  const [mensajes, setMensajes] = useState([
    {
      rol: 'ai',
      texto: BACKEND_LISTO
        ? '¡Hola! Soy Kapac AI 🎒 Pregúntame lo que quieras sobre nuestras mochilas, precios, envíos o pagos.'
        : '¡Hola! 👋 Kapac AI estará disponible muy pronto.\n\nMientras tanto escríbenos al WhatsApp:\n+51 997 050 752',
    }
  ]);
  const [input, setInput] = useState('');
  const [generando, setGenerando] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // ID de sesión único por navegador (para que cada visitante tenga su propio chat)
  const sesionId = useRef(
    (() => {
      let s = localStorage.getItem('kai_sesion');
      if (!s) {
        s = 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('kai_sesion', s);
      }
      return s;
    })()
  );

  // Scroll automático al fondo
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensajes]);

  // Focus al abrir
  useEffect(() => {
    if (abierto && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [abierto]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || generando) return;

    setInput('');

    // Si no hay backend, redirigir a WhatsApp
    if (!BACKEND_LISTO) {
      window.open(`https://wa.me/51997050752?text=${encodeURIComponent(texto)}`, '_blank');
      return;
    }

    setGenerando(true);
    setMensajes(prev => [...prev, { rol: 'user', texto }]);

    // Placeholder de respuesta
    setMensajes(prev => [...prev, { rol: 'ai', texto: '...', streaming: true }]);

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, sesion: sesionId.current }),
      });

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acumulado = '';
      let primero = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (primero) { primero = false; }
        acumulado += dec.decode(value, { stream: true });
        setMensajes(prev => {
          const copia = [...prev];
          copia[copia.length - 1] = { rol: 'ai', texto: acumulado, streaming: true };
          return copia;
        });
      }

      // Finaliza el streaming
      setMensajes(prev => {
        const copia = [...prev];
        copia[copia.length - 1] = { rol: 'ai', texto: acumulado };
        return copia;
      });

    } catch {
      setMensajes(prev => {
        const copia = [...prev];
        copia[copia.length - 1] = {
          rol: 'ai',
          texto: 'No pude conectar con el asistente. Escríbenos al WhatsApp +51 997 050 752.',
        };
        return copia;
      });
    }

    setGenerando(false);
    inputRef.current?.focus();
  };

  const nuevaConversacion = async () => {
    try {
      await fetch(`${BACKEND}/nuevo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesion: sesionId.current }),
      });
    } catch {}
    setMensajes([{ rol: 'ai', texto: '¡Nueva conversación! ¿En qué te ayudo? 🎒' }]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  return (
    <>
      {/* Botón flotante — ícono de mensaje */}
      <button
        className={`kai-btn ${abierto ? 'kai-btn-abierto' : ''} ${!visible ? 'kai-btn-oculto' : ''}`}
        onClick={() => setAbierto(!abierto)}
        aria-label="Kapac AI"
      >
        {abierto ? (
          <svg className="kai-btn-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <IconMensaje className="kai-btn-icono" />
        )}
      </button>

      {/* Ventana de chat */}
      {abierto && (
        <div className="kai-ventana">
          {/* Header — KAPAC AI + ojo (izq) · reset + WhatsApp (der) */}
          <div className="kai-header">
            <div className="kai-logo-group">
              {esAdmin ? (
                <span className="editable-img-wrap kai-logo-edit">
                  <img src={logoChat} alt="Kapac AI" className="kai-logo-img" />
                  <button
                    type="button"
                    className="editable-img-btn"
                    onClick={() => logoChatRef.current?.click()}
                    disabled={subiendoLogo}
                  >
                    {subiendoLogo ? '…' : '🖼️ Cambiar'}
                  </button>
                  <input ref={logoChatRef} type="file" accept="image/*" onChange={cambiarLogoChat} hidden />
                </span>
              ) : (
                <img src={logoChat} alt="Kapac AI" className="kai-logo-img" />
              )}
              <div className="kai-ojo">
                <video src={ojoVideo} autoPlay loop muted playsInline className="kai-ojo-vid" />
              </div>
            </div>

            <div className="kai-header-der">
              <button className="kai-nuevo" onClick={nuevaConversacion} title="Nueva conversación">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-5.5"/>
                </svg>
              </button>
              <a
                className="kai-wa"
                href="https://wa.me/51997050752?text=%C2%A1Hola%20Kapac%20Made!%20%F0%9F%8E%92%20Quiero%20hablar%20con%20una%20persona."
                target="_blank"
                rel="noopener noreferrer"
                title="Hablar por WhatsApp"
                aria-label="Hablar por WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.05 1.6 5.8L2 22l4.42-1.7a9.86 9.86 0 0 0 5.62 1.55h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-2.62 1 .7-2.55-.2-.32a8.18 8.18 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.17 1.73 2.64 4.19 3.7.58.26 1.04.41 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Mensajes */}
          <div className="kai-mensajes" ref={chatRef}>
            {mensajes.map((m, i) => (
              <div key={i} className={`kai-msg kai-msg-${m.rol}`}>
                <div className={`kai-burbuja ${m.streaming ? 'kai-streaming' : ''}`}>
                  {m.texto}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="kai-footer">
            <textarea
              ref={inputRef}
              className="kai-input"
              rows={1}
              placeholder={BACKEND_LISTO ? "Escribe tu pregunta..." : "Escríbenos por WhatsApp..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={generando}
            />
            <button className="kai-enviar" onClick={enviar} disabled={generando || !input.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
