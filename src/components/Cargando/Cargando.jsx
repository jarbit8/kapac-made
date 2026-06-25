import React from 'react';
import './Cargando.css';
import logoLocal from '../../assets/images/kapac_made_1.png';
import { useTema } from '../../context/TemaContext';

// Loader reutilizable: solo el logo Kapac Made (sin texto)
export default function Cargando() {
  const { logo } = useTema();
  return (
    <div className="cargando-box">
      <img src={logo || logoLocal} alt="Kapac Made" className="cargando-logo" />
    </div>
  );
}
