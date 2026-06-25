// Hook que registra una visita cada vez que cambia la ruta.
// - Si el usuario está logueado: guarda su email
// - Si no: queda como "Desconocido"
// - Ubicación obtenida vía ipwho.is sin guardar IP cruda
// - El admin NO se registra (para no inflar las stats con visitas propias)
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { registrarVisita } from '../firebase/visitas';
import { useAuth } from '../context/AuthContext';

const EMAIL_ADMIN = 'jarb2299@gmail.com';

export default function useTrackVisita() {
  const location = useLocation();
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    // Esperar a que termine de cargar el estado de auth
    if (cargando) return;
    // No registrar visitas del propio admin
    if (usuario?.email === EMAIL_ADMIN) return;
    registrarVisita(location.pathname, usuario || null);
  }, [location.pathname, usuario, cargando]);
}
