import React from 'react';
import '../../styles/Values.css';
import ojoVideo from '../../assets/videos/ojo.mp4';
import { useIdioma } from '../../context/LanguageContext';
import Editable from '../Editable';
import ET from '../ET';

export default function Values() {
  const { idioma } = useIdioma();
  const values = ['01', '02', '03'];

  return (
    <section className="values">
      <div className="values-top">
        <div className="values-isotipo">
          <video src={ojoVideo} autoPlay loop muted playsInline />
        </div>
        <h2 className="values-heading">
          <Editable id="values_eyebrow" as="span">{idioma === 'es' ? 'Nuestra filosofía' : 'Our philosophy'}</Editable>
          <Editable id="values_titulo" as="span">
            {idioma === 'es' ? 'Mochilas para la vida real' : 'Backpacks for real life'}
          </Editable>
        </h2>
      </div>

      <div className="values-grid">
        {values.map((num) => (
          <div key={num} className="value-item">
            <span className="value-num">{num}</span>
            <h3 className="value-title"><ET k={`values.${num}_titulo`} /></h3>
            <p className="value-desc"><ET k={`values.${num}_desc`} multiline /></p>
          </div>
        ))}
      </div>
    </section>
  );
}
