import React from 'react';
import './Cargando.css';
import logoLocal from '../../assets/images/kapac_made_1.png';
import { useTema } from '../../context/TemaContext';
import { fotoRapida } from '../../utils/fotos';

// Loader reutilizable: solo el logo Kapac Made (sin texto)
export default function Cargando() {
  const { logo, logoListo } = useTema();
  return (
    <div className="cargando-box">
      <img src={fotoRapida(logo) || logoLocal} alt="Kapac Made" className="cargando-logo"
        style={logoListo ? undefined : { opacity: 0 }} />
    </div>
  );
}
