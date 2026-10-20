import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

// Las fotos muestran el logo mientras cargan; al terminar se les quita el fondo
const marcarCargada = (e) => {
  if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') e.target.classList.add('cargada');
};
document.addEventListener('load', marcarCargada, true);
document.addEventListener('loadeddata', marcarCargada, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
