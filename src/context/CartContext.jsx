// Contexto global del carrito de compras
import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();
const STORAGE_KEY = 'kapac_carrito';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  // Persistir en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const agregar = (producto) => {
    setItems((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) {
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const quitar = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad } : i))
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
