// Contexto global del carrito de compras
// Híbrido: localStorage (sin login) + Firestore (con login)
// Cuando el usuario se loguea, fusiona su carrito local con el remoto.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  obtenerCarrito,
  guardarCarrito,
  fusionarCarritos,
} from '../firebase/carritos';
import { obtenerProducto } from '../firebase/productos';
import { ajustarCarrito, restaurarCheckout } from '../utils/compra';

const CartContext = createContext();
const STORAGE_KEY = 'kapac_carrito';
const AVISOS_KEY = 'kapac_carrito_avisos';

// Lee cada producto del carrito en el catálogo; los que no se pueden leer (sin conexión) no cuentan
async function leerFrescos(ids) {
  const frescos = new Map();
  await Promise.all(ids.map(async (id) => {
    try { frescos.set(id, await obtenerProducto(id)); } catch (_) {}
  }));
  return frescos;
}

export function CartProvider({ children }) {
  const { usuario } = useAuth();

  const [items, setItems] = useState(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(guardado) ? guardado : [];
    } catch {
      return [];
    }
  });

  // Cambios que el cliente aún no vio: precio distinto, menos stock o producto que ya no está
  const [avisos, setAvisos] = useState(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem(AVISOS_KEY));
      return Array.isArray(guardados) ? guardados : [];
    } catch {
      return [];
    }
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const avisosRef = useRef(avisos);
  avisosRef.current = avisos;

  // Bandera: ya cargamos el carrito remoto del usuario actual (evita duplicar el merge)
  const remoteCargadoRef = useRef(null);
  const [remotoListo, setRemotoListo] = useState(null);

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
      setRemotoListo(usuario.uid);
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

  // Los avisos quedan guardados hasta que el cliente abre el carrito y los ve
  const fijarAvisos = useCallback((lista) => {
    avisosRef.current = lista;
    setAvisos(lista);
    try {
      if (lista.length) localStorage.setItem(AVISOS_KEY, JSON.stringify(lista));
      else localStorage.removeItem(AVISOS_KEY);
    } catch (_) {}
  }, []);

  const ultimaLectura = useRef(0);
  const enCurso = useRef(null);
  const siguiente = useRef(null);
  const registro = useRef([]); // todo lo que se ha encontrado en esta visita, en orden

  // Lee el catálogo y pone el carrito al día; los cambios quedan en el registro y en los avisos
  const leerYAjustar = useCallback(async () => {
    const ids = [...new Set(itemsRef.current.map((i) => i.id))];
    if (!ids.length) return;
    const r = ajustarCarrito(itemsRef.current, await leerFrescos(ids));
    ultimaLectura.current = Date.now();
    if (r.cambio) {
      itemsRef.current = r.items;
      setItems(r.items);
    }
    if (r.avisos.length) {
      registro.current.push(...r.avisos);
      fijarAvisos([...avisosRef.current, ...r.avisos]);
    }
  }, [fijarAvisos]);

  // Una lectura que ya empezó pudo ver datos viejos: quien pide otra espera a que termine y lee de nuevo.
  // Devuelve lo que cambió desde que se la pidió, venga de la lectura que venga.
  const refrescar = useCallback(async () => {
    const desde = registro.current.length;
    const leer = () => {
      enCurso.current = leerYAjustar().finally(() => { enCurso.current = null; });
      return enCurso.current;
    };
    if (enCurso.current) {
      if (!siguiente.current) {
        siguiente.current = enCurso.current.then(() => {
          siguiente.current = null;
          return leer();
        });
      }
      await siguiente.current;
    } else {
      await leer();
    }
    return registro.current.slice(desde);
  }, [leerYAjustar]);

  // Al abrir la tienda con productos en el carrito, y otra vez cuando llega el carrito de la cuenta
  useEffect(() => {
    const espera = setTimeout(() => {
      if (Date.now() - ultimaLectura.current > 5000) refrescar();
    }, 1500);
    return () => clearTimeout(espera);
  }, [remotoListo, refrescar]);

  const limpiarAvisos = useCallback(() => fijarAvisos([]), [fijarAvisos]);

  // Vuelve a poner el carrito del pedido que se acaba de crear (cambiar de método de pago)
  const restaurar = useCallback(() => {
    if (itemsRef.current.length) return;
    const guardados = restaurarCheckout();
    if (guardados) setItems(guardados);
  }, []);

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
      value={{
        items, agregar, quitar, cambiarCantidad, vaciar, totalItems, totalPrecio,
        avisos, refrescar, limpiarAvisos, restaurar,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
