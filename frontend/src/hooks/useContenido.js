import { useEffect, useRef, useState } from 'react';
import { obtenerContenido, guardarContenido, contenidoGuardado } from '../firebase/contenido';
import { avisarFallo } from '../utils/avisos';

// Contenido editable del sitio (contenido/sitio) para una página: se muestra al instante lo
// guardado de la visita anterior y Firestore lo actualiza después.
// guardarParcial(cambiar): cambiar(base) devuelve los campos nuevos. Se aplican sobre lo último de
// Firestore y no sobre la copia de la visita anterior, para no perder lo que se haya cambiado desde otro dispositivo.
export default function useContenido() {
  const [contenido, setContenido] = useState(contenidoGuardado);
  const cambiado = useRef(false); // la lectura inicial puede llegar tarde y no debe borrar lo que el admin acaba de cambiar

  useEffect(() => {
    obtenerContenido().then((c) => { if (!cambiado.current) setContenido(c); }).catch(() => {});
  }, []);

  const guardarParcial = async (cambiar) => {
    cambiado.current = true;
    let base;
    try {
      base = await obtenerContenido();
      const nuevo = { ...base, ...cambiar(base) };
      setContenido(nuevo);
      await guardarContenido(nuevo, base);
    } catch (_) {
      if (base) setContenido(base);
      avisarFallo('guardar el cambio');
    }
  };

  return [contenido, guardarParcial];
}
