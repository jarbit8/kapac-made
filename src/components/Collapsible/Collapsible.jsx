import React, { useState } from 'react';
import '../../styles/Collapsible.css';

export default function Collapsible() {
  const [open, setOpen] = useState(null);

  const sections = [
    {
      id: 'info',
      title: 'Info',
      content: 'Kapac Made es una marca de mochilas artesanales inspiradas en los paisajes y la cultura andina. Cada producto es hecho a mano con materiales de calidad. Para preguntas sobre tallas, materiales o envíos, no dudes en contactarnos.'
    },
    {
      id: 'contact',
      title: 'Contact',
      content: (
        <form className="contact-form">
          <input type="text" placeholder="Nombre" />
          <input type="email" placeholder="Email" />
          <textarea placeholder="Mensaje" rows="4"></textarea>
          <button type="submit">Enviar</button>
        </form>
      )
    }
  ];

  return (
    <section className="collapsible-section">
      {sections.map((section) => (
        <div key={section.id} className="collapsible-item">
          <button
            className="collapsible-header"
            onClick={() => setOpen(open === section.id ? null : section.id)}
          >
            <span>{section.title}</span>
            <span className="collapsible-icon">{open === section.id ? '−' : '+'}</span>
          </button>
          {open === section.id && (
            <div className="collapsible-body">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
