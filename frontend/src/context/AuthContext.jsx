// Contexto global de autenticación
import React, { createContext, useContext, useEffect, useState } from 'react';
import { observarUsuario } from '../firebase/auth';
import { esCorreoAdmin, esDueno } from '../config/admins';

const AuthContext = createContext();
const DISPOSITIVO_ADMIN_KEY = 'kapac_dispositivo_admin';
const SESION_ADMIN_KEY = 'kapac_sesion_admin';
const NO_CONTAR_KEY = 'kapac_no_contar';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Mientras Firebase confirma la sesión se asume la de la visita anterior: así la página
  // no arranca como visitante para pasar a admin un instante después (parpadeo).
  // Guardar cambios igual exige la sesión real (lo validan las reglas de Firebase).
  const [sesionRecordada] = useState(() => {
    try { return localStorage.getItem(SESION_ADMIN_KEY) === '1'; } catch (_) { return false; }
  });
  const esAdmin = cargando ? sesionRecordada : esCorreoAdmin(usuario?.email);
  // La página siempre arranca como la ve un visitante; el admin activa la edición con
  // el botón de la barra (al recargar vuelve a modo visita)
  const [modoEdicion, setModoEdicion] = useState(false);
  const puedeEditar = esAdmin && modoEdicion;

  useEffect(() => {
    const unsub = observarUsuario((user) => {
      setUsuario(user);
      setCargando(false);
      // Una vez que el admin entra con su cuenta desde este navegador, lo recordamos
      // para no contarlo como visita aunque después navegue sin loguearse.
      if (esCorreoAdmin(user?.email)) {
        try {
          localStorage.setItem(DISPOSITIVO_ADMIN_KEY, '1');
          // Solo el navegador del dueño deja de contar en Visitas
          localStorage.setItem(NO_CONTAR_KEY, esDueno(user.email) ? '1' : '0');
        } catch (_) {}
      }
      // Sesión de admin abierta en este navegador: la próxima vez la tienda se muestra
      // sin esperar a que Firebase la confirme (tarda ~1 s)
      try {
        if (esCorreoAdmin(user?.email)) localStorage.setItem(SESION_ADMIN_KEY, '1');
        else localStorage.removeItem(SESION_ADMIN_KEY);
      } catch (_) {}
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, esAdmin, modoEdicion, setModoEdicion, puedeEditar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
