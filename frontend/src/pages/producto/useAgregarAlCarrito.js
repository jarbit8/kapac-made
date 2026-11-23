import { useState } from 'react';
import { useCart } from '../../context/CartContext';

export default function useAgregarAlCarrito(producto) {
  const { agregar, items } = useCart();
  const [agregado, setAgregado] = useState(false);
  const [maximo, setMaximo] = useState(false);

  const handleAgregar = () => {
    const enCarrito = items.find((i) => i.id === producto.id)?.cantidad || 0;
    if (enCarrito >= Number(producto.stock ?? 99)) {
      setAgregado(false);
      setMaximo(true);
      setTimeout(() => setMaximo(false), 2500);
      return;
    }
    agregar(producto);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  return { agregado, maximo, handleAgregar };
}
