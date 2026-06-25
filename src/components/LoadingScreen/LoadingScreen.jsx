import React from 'react';
import './LoadingScreen.css';
import logoLocal from '../../assets/images/kapac_made_1.png';
import { useTema } from '../../context/TemaContext';

export default function LoadingScreen({ saliendo }) {
  const { logo } = useTema();
  return (
    <div className={`splash ${saliendo ? 'splash-out' : ''}`}>
      <div className="splash-inner">
        <img src={logo || logoLocal} alt="Kapac Made" className="splash-logo" />
      </div>
    </div>
  );
}
