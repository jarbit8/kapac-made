// Contexto global de autenticación
import React, { createContext, useContext, useEffect, useState } from 'react';
import { observarUsuario } from '../firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = observarUsuario((user) => {
      setUsuario(user);
      setCargando(false);
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
