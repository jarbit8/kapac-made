import React from 'react';
import './LoadingScreen.css';
import logoLocal from '../../assets/images/kapac_made_1.png';
import { useTema } from '../../context/TemaContext';
import { fotoRapida } from '../../utils/fotos';

export default function LoadingScreen({ saliendo }) {
  const { logo, logoListo } = useTema();
  return (
    <div className={`splash ${saliendo ? 'splash-out' : ''}`}>
      <div className="splash-inner">
        <img src={fotoRapida(logo) || logoLocal} alt="Kapac Made" className="splash-logo"
          style={logoListo ? undefined : { opacity: 0 }} />
      </div>
    </div>
  );
}
