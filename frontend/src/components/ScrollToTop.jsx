import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Sube al inicio de la página cada vez que cambia la ruta
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
