import React from 'react';
import '../../styles/Values.css';
import ojoVideo from '../../assets/videos/ojo.mp4';
import { useIdioma } from '../../context/LanguageContext';

export default function Values() {
  const { t, idioma } = useIdioma();
  const values = [
    { num: '01', title: t('values.01_titulo'), desc: t('values.01_desc') },
    { num: '02', title: t('values.02_titulo'), desc: t('values.02_desc') },
    { num: '03', title: t('values.03_titulo'), desc: t('values.03_desc') },
  ];

  return (
    <section className="values">
      <div className="values-top">
        <div className="values-isotipo">
          <video src={ojoVideo} autoPlay loop muted playsInline />
        </div>
        <h2 className="values-heading">
          <span>{idioma === 'es' ? 'Nuestra filosofía' : 'Our philosophy'}</span>
          {idioma === 'es' ? (
            <>Mochilas para<br />la vida real</>
          ) : (
            <>Backpacks for<br />real life</>
          )}
        </h2>
      </div>

      <div className="values-grid">
        {values.map((v, i) => (
          <div key={i} className="value-item">
            <span className="value-num">{v.num}</span>
            <h3 className="value-title">{v.title}</h3>
            <p className="value-desc">{v.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
