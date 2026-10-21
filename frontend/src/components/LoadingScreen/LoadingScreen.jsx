import React from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ saliendo }) {
  return <div className={`splash carga-kapac ${saliendo ? 'splash-out' : ''}`} />;
}
