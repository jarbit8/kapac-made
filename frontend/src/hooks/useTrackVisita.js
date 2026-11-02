// Hook que registra una visita cada vez que cambia la ruta.
// - Si el usuario está logueado: guarda su email
// - Si no: queda como "Desconocido"
// - Con la tienda cerrada el visitante solo ve "Próximamente": se guarda eso
// - Ubicación obtenida vía ipwho.is sin guardar IP cruda
// - El dueño NO se registra (para no inflar las stats con visitas propias)
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { registrarVisita } from '../firebase/visitas';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/TemaContext';
import { esDueno } from '../config/admins';

// El navegador donde entró el dueño, aunque después navegue sin sesión.
// Antes se marcaba igual el de cualquier admin: esa marca vale hasta que vuelva a entrar.
const dispositivoDelDueno = () => {
  try {
    const marca = localStorage.getItem('kapac_no_contar');
    return marca !== null ? marca === '1' : localStorage.getItem('kapac_dispositivo_admin') === '1';
  } catch (_) {
    return false;
  }
};

export default function useTrackVisita() {
  const location = useLocation();
  const { usuario, cargando, esAdmin } = useAuth();
  const { cerrado, cerradoListo } = useTema();

  useEffect(() => {
    // Esperar a saber quién es y si la tienda está abierta
    if (cargando || !cerradoListo) return;
    if (esDueno(usuario?.email) || dispositivoDelDueno()) return;
    const enProximamente = cerrado && !esAdmin && location.pathname !== '/login';
    // Con la tienda cerrada igual se guarda la dirección que quiso abrir (p. ej. /admin)
    registrarVisita(enProximamente ? '/proximamente' : location.pathname, usuario || null, enProximamente ? location.pathname : '');
  }, [location.pathname, usuario, cargando, esAdmin, cerrado, cerradoListo]);
}
