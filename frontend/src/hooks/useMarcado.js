import { useEffect, useRef, useState } from 'react';

// Sin hover (celular), el primer toque marca el elemento y muestra su botón de edición;
// tocar en otra parte lo desmarca. selectorBoton: el botón que sí debe recibir el toque.
export default function useMarcado(selectorBoton) {
  const ref = useRef(null);
  const [marcado, setMarcado] = useState(false);

  useEffect(() => {
    if (!marcado) return;
    const fuera = (e) => { if (!ref.current?.contains(e.target)) setMarcado(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [marcado]);

  // El primer toque marca sin activar los enlaces ni botones que envuelvan al elemento
  const alTocar = (e) => {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (e.target.closest(selectorBoton)) return;
    e.preventDefault();
    e.stopPropagation();
    setMarcado(true);
  };

  return { ref, marcado, setMarcado, alTocar };
}
