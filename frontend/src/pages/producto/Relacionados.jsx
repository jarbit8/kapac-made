import React from 'react';
import { Link } from 'react-router-dom';
import { fotoRapida } from '../../utils/fotos';
import { nombreProducto } from '../../i18n/producto';
import TextoProducto from '../../components/TextoProducto';

// También te puede gustar
export default function Relacionados({ relacionados, idioma }) {
  return (
    <section className="producto-relacionados">
      <h2>{idioma === 'en' ? 'You may also like' : 'También te puede gustar'}</h2>
      <div className="relacionados-grid">
        {relacionados.map((p) => (
          <Link key={p.id} to={`/producto/${p.id}`} className="relacionado-card">
            <div className="relacionado-img">
              <img src={fotoRapida(p.imagenMochila)} alt={nombreProducto(p, idioma)} loading="lazy" decoding="async" />
            </div>
            <span className="relacionado-nombre"><TextoProducto texto={p.nombre} idioma={idioma} /></span>
            <span className="relacionado-precio">{p.moneda}{p.precio}.00</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
