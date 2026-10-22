import React, { useRef, useState } from 'react';
import { useTextos } from '../context/TextosContext';
import { subirImagen, subirMedia, borrarMedia } from '../firebase/almacenamiento';
import Icono from './Icono';
import './CambiarMedio.css';

// Botón del modo edición para cambiar una foto o video de contenido/sitio.
// alSubir(medio): guarda { tipo, url } · anterior: archivo que se borra de Storage al reemplazarlo
export default function CambiarMedio({ texto, carpeta, soloFoto = false, anterior = '', alSubir }) {
  const { esAdmin } = useTextos();
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);
  if (!esAdmin) return null;

  const onArchivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    try {
      const medio = soloFoto ? { tipo: 'imagen', url: await subirImagen(file, carpeta) } : await subirMedia(file, carpeta);
      await alSubir(medio);
      if (anterior) borrarMedia(anterior);
    } catch (_) {
      window.alert('No se pudo subir el archivo. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
    setSubiendo(false);
  };

  return (
    <>
      <button
        type="button"
        className="cambiar-medio"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); inputRef.current?.click(); }}
        disabled={subiendo}
      >
        <Icono nombre="foto" tam={15} /> {subiendo ? 'Subiendo…' : texto}
      </button>
      <input ref={inputRef} type="file" accept={soloFoto ? 'image/*' : 'image/*,video/*'} onChange={onArchivo} hidden />
    </>
  );
}
