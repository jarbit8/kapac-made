import React, { useEffect, useState } from 'react';
import { obtenerContenido, contenidoGuardado, IN_THE_ZONE_DEFAULT, urlDispositivo } from '../firebase/contenido';
import Editable from '../components/Editable';
import '../styles/Zone.css';

export default function Zone() {
  const esMobile = window.innerWidth < 768;
  const [foto, setFoto] = useState(() => {
    const c = contenidoGuardado();
    return c ? (urlDispositivo(c.inTheZoneFoto, esMobile) || IN_THE_ZONE_DEFAULT) : null;
  });

  useEffect(() => {
    document.title = 'In the zone · Kapac Made';
    obtenerContenido().then((c) => {
      const url = urlDispositivo(c.inTheZoneFoto, esMobile);
      setFoto(url || IN_THE_ZONE_DEFAULT);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="zone">
      {foto && <img src={foto} alt="Kapac Made" className="zone-img" />}
      <div className="zone-vineta" />
      <p className="zone-txt"><Editable id="zone_txt" as="span">in the zone</Editable></p>
    </div>
  );
}
