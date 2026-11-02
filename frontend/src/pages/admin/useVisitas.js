import { useRef, useState } from 'react';
import { obtenerEstadisticas, obtenerVisitasRecientes } from '../../firebase/visitas';

export default function useVisitas(cerrado) {
  const [stats, setStats] = useState({});
  const [visitasRecientes, setVisitasRecientes] = useState(null);
  const [visitasLimite, setVisitasLimite] = useState(10);
  // Visitas de la pantalla "Próximamente" (mientras está cerrada), del login o de la página
  const [zona, setZona] = useState(cerrado ? 'proximamente' : 'pagina');
  const [paisAbierto, setPaisAbierto] = useState(null);

  // Si se cambia de zona rápido, la respuesta que llega tarde no pisa la lista de la zona actual
  const ultimaZona = useRef(0);

  const cargarStats = async (z = zona) => {
    const pedido = ++ultimaZona.current;
    setStats(await obtenerEstadisticas(30));
    const recientes = await obtenerVisitasRecientes(10, z);
    if (pedido !== ultimaZona.current) return;
    setVisitasLimite(10);
    setVisitasRecientes(recientes);
  };

  const cambiarZona = (z) => {
    setZona(z);
    setVisitasRecientes(null);
    cargarStats(z);
  };

  const verMasVisitas = async () => {
    const nuevoLimite = visitasLimite + 10;
    setVisitasLimite(nuevoLimite);
    const pedido = ++ultimaZona.current;
    const recientes = await obtenerVisitasRecientes(nuevoLimite, zona);
    if (pedido === ultimaZona.current) setVisitasRecientes(recientes);
  };

  return { stats, visitasRecientes, visitasLimite, zona, paisAbierto, setPaisAbierto, cargarStats, cambiarZona, verMasVisitas };
}
