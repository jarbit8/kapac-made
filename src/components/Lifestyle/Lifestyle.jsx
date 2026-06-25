import React, { useEffect, useState } from 'react';
import './Lifestyle.css';
import { obtenerContenido, HOME_FOTOS_DEFAULT } from '../../firebase/contenido';

export default function Lifestyle() {
  const [imgs, setImgs] = useState(HOME_FOTOS_DEFAULT);

  useEffect(() => {
    obtenerContenido().then((c) => setImgs(c.homeFotos)).catch(() => {});
  }, []);

  return (
    <section className="lm-section">

      {/* Grid 2×2 */}
      <div className="lm-grid">
        {imgs.map((img, i) => (
          <div key={i} className="lm-item">
            <div className="lm-img-wrap">
              <img src={img.url} alt={img.titulo} className="lm-img" />
            </div>
            <div className="lm-caption">
              <span className="lm-caption-title">{img.titulo}</span>
              {img.desc && (
                <p className="lm-caption-desc">
                  {img.desc.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < img.desc.split('\n').length - 1 && <br/>}</span>
                  ))}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Línea inferior + texto — abre la pantalla épica en pestaña nueva */}
      <div className="lm-footer">
        <a
          href={`${window.location.origin}${window.location.pathname}#/zone`}
          target="_blank"
          rel="noopener noreferrer"
          className="lm-footer-txt"
        >
          in the zone
        </a>
      </div>

    </section>
  );
}
