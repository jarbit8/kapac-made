import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './BarraEdicion.css';

// Barra fija arriba, solo en modo edición. Deja de tapar el header moviendo la página
// hacia abajo mientras está visible (ver BarraEdicion.css).
export default function BarraEdicion() {
  const { puedeEditar, setModoEdicion } = useAuth();

  useEffect(() => {
    if (!puedeEditar) return undefined;
    document.documentElement.classList.add('con-barra-edicion');
    return () => document.documentElement.classList.remove('con-barra-edicion');
  }, [puedeEditar]);

  if (!puedeEditar) return null;

  return (
    <div className="barra-edicion" role="status">
      <span className="barra-edicion-txt">Modo edición<span className="barra-edicion-extra"> · Los cambios se publican al instante</span></span>
      <button type="button" className="barra-edicion-salir" onClick={() => setModoEdicion(false)}>Salir</button>
    </div>
  );
}
