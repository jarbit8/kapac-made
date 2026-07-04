// Contexto global de autenticación
import React, { createContext, useContext, useEffect, useState } from 'react';
import { observarUsuario } from '../firebase/auth';

const AuthContext = createContext();
const EMAIL_ADMIN = 'jarb2299@gmail.com';
const DISPOSITIVO_ADMIN_KEY = 'kapac_dispositivo_admin';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = observarUsuario((user) => {
      setUsuario(user);
      setCargando(false);
      // Una vez que el admin entra con su cuenta desde este navegador, lo recordamos
      // para no contarlo como visita aunque después navegue sin loguearse.
      if (user?.email === EMAIL_ADMIN) {
        try { localStorage.setItem(DISPOSITIVO_ADMIN_KEY, '1'); } catch (_) {}
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
