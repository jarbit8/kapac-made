import React, { useRef, useState } from 'react';
import { useTextos } from '../context/TextosContext';
import { subirImagen } from '../firebase/almacenamiento';
import './EditableImage.css';

// Imagen editable en la propia página (solo el admin ve el overlay).
// id: clave única · srcDefault: imagen que se usa si nadie subió otra · carpeta: subcarpeta en Storage
export default function EditableImage({ id, srcDefault, alt = '', className = '', carpeta = 'sitio' }) {
  const { textos, esAdmin, guardar } = useTextos();
  const url = textos[id] || srcDefault;

  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  if (!esAdmin) {
    return <img src={url} alt={alt} className={className} />;
  }

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
    <div className={`editable-img-wrap ${className}`}>
      <img src={url} alt={alt} className="editable-img" />
      <button
        type="button"
        className="editable-img-btn"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
      >
        {subiendo ? 'Subiendo…' : '🖼️ Cambiar imagen'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={onArchivo} hidden />
    </div>
  );
}
