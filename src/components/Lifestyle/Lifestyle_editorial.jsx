import React, { useEffect, useRef } from 'react';
import './Lifestyle.css';

/* ─── Imágenes de paisajes andinos (Unsplash) ─────────────────────────── */
const IMGS = {
  hero:    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85&fit=crop',
  hiker:   'https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&q=85&fit=crop',
  craft:   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85&fit=crop',
  lake:    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=85&fit=crop',
  arequipa:'https://images.unsplash.com/photo-1582285125282-7e0bf90ac3b5?w=900&q=85&fit=crop',
};

/* ─── Hook de entrada por scroll ────────────────────────────────────────── */
function useReveal(selector) {
  useEffect(() => {
    const els = document.querySelectorAll(selector);
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('revealed')),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [selector]);
}

export default function Lifestyle() {
  useReveal('.ls-reveal');

  return (
    <div className="lifestyle">

      {/* ══════════════════════════════════════════════
          01 — Hero editorial full-width
      ══════════════════════════════════════════════ */}
      <section className="ls-hero ls-reveal">
        <div className="ls-hero-img-wrap">
          <img src={IMGS.hero} alt="Andes" className="ls-hero-img" />
          <div className="ls-hero-overlay" />
        </div>
        <div className="ls-hero-text">
          <span className="ls-eyebrow">Arequipa · Perú</span>
          <h2 className="ls-hero-title">
            Nace<br/>
            en las<br/>
            <em>alturas.</em>
          </h2>
          <p className="ls-hero-sub">
            Cada mochila Kapac lleva los Andes<br />en sus costuras.
          </p>
        </div>
        <div className="ls-hero-number">01</div>
      </section>

      {/* ══════════════════════════════════════════════
          02 — Grid editorial asimétrico
      ══════════════════════════════════════════════ */}
      <section className="ls-grid">

        {/* Imagen grande izquierda */}
        <div className="ls-grid-big ls-reveal">
          <img src={IMGS.hiker} alt="Explorador" className="ls-grid-img" />
          <div className="ls-grid-big-tag">
            <span>Hecho a mano</span>
          </div>
        </div>

        {/* Columna derecha — 2 cards */}
        <div className="ls-grid-col">

          <div className="ls-card ls-reveal" style={{ '--delay': '0.1s' }}>
            <div className="ls-card-num">02</div>
            <h3 className="ls-card-title">Diseño que<br/>dura décadas</h3>
            <p className="ls-card-body">
              Sin fast fashion. Sin compromisos.
              Materiales seleccionados a mano
              en Arequipa para resistir cada
              expedición.
            </p>
            <div className="ls-card-line" />
          </div>

          <div className="ls-card ls-card-img ls-reveal" style={{ '--delay': '0.2s' }}>
            <img src={IMGS.craft} alt="Artesanía" className="ls-card-photo" />
            <div className="ls-card-img-label">Artesanía andina</div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          03 — Franja de texto + imagen panorámica
      ══════════════════════════════════════════════ */}
      <section className="ls-panorama ls-reveal">
        <div className="ls-panorama-img-wrap">
          <img src={IMGS.lake} alt="Lago andino" className="ls-panorama-img" />
          <div className="ls-panorama-overlay" />
        </div>
        <div className="ls-panorama-content">
          <p className="ls-panorama-quote">
            &ldquo;Explorar sin<br />
            <em>límites</em>&rdquo;
          </p>
          <div className="ls-panorama-detail">
            <span className="ls-panorama-num">03</span>
            <p className="ls-panorama-copy">
              Cada costura es intencional.<br />
              Cada diseño, una historia del sur del Perú.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          04 — Tres valores en fila
      ══════════════════════════════════════════════ */}
      <section className="ls-valores">
        {[
          { num: '01', tit: 'Origen',      txt: 'Fabricadas en Arequipa, a los pies del Misti.' },
          { num: '02', tit: 'Artesanía',   txt: 'Cada pieza es única, cosida a mano por maestros.' },
          { num: '03', tit: 'Durabilidad', txt: 'Materiales que envejecen mejor que cualquier mochila industrial.' },
        ].map((v, i) => (
          <div key={i} className="ls-valor ls-reveal" style={{ '--delay': `${i * 0.12}s` }}>
            <span className="ls-valor-num">{v.num}</span>
            <h4 className="ls-valor-tit">{v.tit}</h4>
            <p className="ls-valor-txt">{v.txt}</p>
          </div>
        ))}
      </section>

      {/* ══════════════════════════════════════════════
          05 — Imagen Arequipa + CTA
      ══════════════════════════════════════════════ */}
      <section className="ls-cta ls-reveal">
        <div className="ls-cta-img-wrap">
          <img src={IMGS.arequipa} alt="Arequipa" className="ls-cta-img" />
          <div className="ls-cta-overlay" />
        </div>
        <div className="ls-cta-content">
          <span className="ls-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>
            La ciudad blanca
          </span>
          <h2 className="ls-cta-title">Arequipa<br /><em>te llama.</em></h2>
          <a href="#/catalogo" className="ls-cta-btn">Ver colección →</a>
        </div>
      </section>

    </div>
  );
}
