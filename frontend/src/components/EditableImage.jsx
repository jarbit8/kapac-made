import React, { useEffect, useRef, useState } from 'react';
import { useTextos } from '../context/TextosContext';
import { subirImagen } from '../firebase/almacenamiento';
import { fotoRapida } from '../utils/fotos';
import './EditableImage.css';

const IconoFoto = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-2h6.6l1.2 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

// Imagen editable en la propia página (solo el admin, en modo edición).
// id: clave única · srcDefault: imagen que se usa si nadie subió otra · carpeta: subcarpeta en Storage
export default function EditableImage({ id, srcDefault, alt = '', className = '', carpeta = 'sitio' }) {
  const { textos, listos, esAdmin, guardar } = useTextos();
  const url = fotoRapida(textos[id] || srcDefault);

  const [subiendo, setSubiendo] = useState(false);
  const [marcado, setMarcado] = useState(false);   // toque en pantallas sin hover
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // El botón marcado con un toque se oculta al tocar en otra parte
  useEffect(() => {
    if (!marcado) return;
    const fuera = (e) => { if (!wrapRef.current?.contains(e.target)) setMarcado(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [marcado]);

  if (!esAdmin) {
    if (listos && !url) return null;
    return <img src={listos ? url : undefined} alt={listos ? alt : ''} className={className} loading="lazy" decoding="async" />;
  }

  const alTocar = (e) => {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (e.target.closest('.editable-img-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    setMarcado(true);
  };

  const onArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const nuevaUrl = await subirImagen(file, carpeta);
      await guardar(id, nuevaUrl);
    } catch (_) {
      /* error silencioso, igual que el resto del panel de edición en vivo */
    }
    setSubiendo(false);
  };

  return (
    <div ref={wrapRef} className={`editable-img-wrap editable-toque ${className}${marcado ? ' editable-marcado' : ''}`} onClick={alTocar}>
      {listos && url ? <img src={url} alt={alt} className="editable-img" loading="lazy" decoding="async" /> : <div className="editable-img" />}
      <button
        type="button"
        className="editable-img-btn"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
      >
        <IconoFoto /> {subiendo ? 'Subiendo…' : 'Cambiar foto'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={onArchivo} hidden />
    </div>
  );
}
