import { useEffect, useState } from 'react';

// Pantalla de celular (menos de 768 px de ancho); se actualiza al cambiar el tamaño de la ventana
export default function useEsMobile() {
  const [esMobile, setEsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const alCambiar = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener('resize', alCambiar);
    return () => window.removeEventListener('resize', alCambiar);
  }, []);

  return esMobile;
}
