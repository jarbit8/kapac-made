import React from 'react';
import '../../styles/Values.css';
import ojoVideo from '../../assets/videos/ojo.mp4';

export default function Values() {
  const values = [
    {
      icon: '◯',
      title: 'Explora Sin Límites',
      desc: 'Diseñadas para acompañarte en cada aventura, desde la ciudad hasta la montaña.'
    },
    {
      icon: '◯',
      title: 'Diseño Que Destaca',
      desc: 'Cada mochila lleva ilustraciones únicas inspiradas en la cultura y paisajes andinos.'
    },
    {
      icon: '◯',
      title: 'Hecho en Arequipa',
      desc: 'Fabricadas artesanalmente en Arequipa, Perú, con materiales de alta calidad.'
    }
  ];

  return (
    <section className="values">
      <div className="values-isotipo">
        <video src={ojoVideo} autoPlay loop muted playsInline />
      </div>
      <div className="values-grid">
        {values.map((v, i) => (
          <div key={i} className="value-item">
            <span className="value-icon">{v.icon}</span>
            <h3 className="value-title">{v.title}</h3>
            <p className="value-desc">{v.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
