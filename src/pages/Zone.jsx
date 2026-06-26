import React, { useEffect, useState } from 'react';
import { obtenerContenido, IN_THE_ZONE_DEFAULT, urlDispositivo } from '../firebase/contenido';
import '../styles/Zone.css';

export default function Zone() {
  const [foto, setFoto] = useState(null);
  const esMobile = window.innerWidth < 768;

  useEffect(() => {
    document.title = 'In the zone · Kapac Made';
    obtenerContenido().then((c) => {
      const url = urlDispositivo(c.inTheZoneFoto, esMobile);
      setFoto(url || IN_THE_ZONE_DEFAULT);
    }).catch(() => {
      setFoto(IN_THE_ZONE_DEFAULT);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="zone">
      {foto && <img src={foto} alt="Kapac Made" className="zone-img" />}
      <div className="zone-vineta" />
      <p className="zone-txt">in the zone</p>
    </div>
  );
}
