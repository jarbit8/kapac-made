// Contexto global del carrito de compras
// Híbrido: localStorage (sin login) + Firestore (con login)
// Cuando el usuario se loguea, fusiona su carrito local con el remoto.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  obtenerCarrito,
  guardarCarrito,
  fusionarCarritos,
} from '../firebase/carritos';

const CartContext = createContext();
const STORAGE_KEY = 'kapac_carrito';

export function CartProvider({ children }) {
  const { usuario } = useAuth();

  const [items, setItems] = useState(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  // Bandera: ya cargamos el carrito remoto del usuario actual (evita duplicar el merge)
  const remoteCargadoRef = useRef(null);

  // Cuando el usuario se loguea → cargar carrito de Firestore y fusionar con local
  useEffect(() => {
    if (!usuario) {
      // Logout: marcar para que la próxima vez que se loguee se cargue de nuevo
      remoteCargadoRef.current = null;
      return;
    }
    if (remoteCargadoRef.current === usuario.uid) return; // ya cargado

    let cancelado = false;
    (async () => {
      const remoto = await obtenerCarrito(usuario.uid);
      if (cancelado) return;

      setItems((local) => {
        const fusionado = fusionarCarritos(local, remoto);
        // Guardar el fusionado en Firestore para que ambos lados queden iguales
        guardarCarrito(usuario.uid, fusionado);
        return fusionado;
      });
      remoteCargadoRef.current = usuario.uid;
    })();

    return () => { cancelado = true; };
  }, [usuario]);

  // Persistir en localStorage cada vez que cambia (siempre)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Persistir en Firestore cada vez que cambia (solo si hay usuario y ya cargamos remoto)
  useEffect(() => {
    if (!usuario || remoteCargadoRef.current !== usuario.uid) return;
    // Debounce: pequeño retardo para evitar múltiples writes seguidos
    const t = setTimeout(() => {
      guardarCarrito(usuario.uid, items);
    }, 400);
    return () => clearTimeout(t);
  }, [items, usuario]);

  const agregar = (producto) => {
    setItems((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      // stock disponible (del producto o del item ya en carrito)
      const stock = Number(producto.stock ?? existe?.stock ?? 99);
      if (existe) {
        // No dejar pasar del stock
        const nueva = Math.min(existe.cantidad + 1, stock);
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: nueva, stock } : i
        );
      }
      if (stock < 1) return prev; // sin stock, no agrega
      return [...prev, { ...producto, cantidad: 1, stock }];
    });
  };

  const quitar = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const max = Number(i.stock ?? 99);
        return { ...i, cantidad: Math.min(cantidad, max) };
      })
    );
  };

  const vaciar = () => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);
  const totalPrecio = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items, agregar, quitar, cambiarCantidad, vaciar, totalItems, totalPrecio }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
