import React, { useState, useRef } from 'react';
import { fotoRapida } from '../../utils/fotos';
import { FotosProducto } from '../../components/ProductoEditable';

export default function CarruselFotos({ producto, esAdmin, onCambiarFotos }) {
  const [imgIdx, setImgIdx] = useState(0); // carrusel de galería
  const touchX = useRef(0); // para deslizar (swipe)

  const imgs = (Array.isArray(producto.fotos) && producto.fotos.length
    ? producto.fotos
    : [producto.imagenMochila, producto.imagenContexto]).filter(Boolean);
  const total = imgs.length;
  if (!total) {
    return (
      <div className="producto-galeria">
        {esAdmin ? <FotosProducto fotos={[]} onCambiar={onCambiarFotos} /> : <div className="galeria-marco" />}
      </div>
    );
  }
  const idx = ((imgIdx % total) + total) % total;
  const deslizar = (dx) => {
    if (total > 1 && Math.abs(dx) > 40) setImgIdx(dx < 0 ? idx + 1 : idx - 1);
  };
  return (
    <div className="producto-galeria">
      <div
        className="galeria-marco"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => deslizar(e.changedTouches[0].clientX - touchX.current)}
        onMouseDown={(e) => { touchX.current = e.clientX; }}
        onMouseUp={(e) => deslizar(e.clientX - touchX.current)}
      >
        <img key={idx} src={fotoRapida(imgs[idx])} alt={producto.nombre} className="galeria-img" draggable="false" />
        {total > 1 && (
          <>
            <button className="galeria-flecha izq" aria-label="Anterior" onClick={() => setImgIdx(idx - 1)}>‹</button>
            <button className="galeria-flecha der" aria-label="Siguiente" onClick={() => setImgIdx(idx + 1)}>›</button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="galeria-dots">
          {imgs.map((_, i) => (
            <button
              key={i}
              className={`galeria-dot ${i === idx ? 'activo' : ''}`}
              aria-label={`Imagen ${i + 1}`}
              onClick={() => setImgIdx(i)}
            />
          ))}
        </div>
      )}
      {esAdmin && <FotosProducto fotos={imgs} elegida={idx} onElegir={setImgIdx} onCambiar={onCambiarFotos} />}
    </div>
  );
}
