import { useState } from 'react';
import { obtenerReclamos, responderReclamo } from '../../firebase/reclamos';

export default function useReclamos(setMsg) {
  const [reclamos, setReclamos] = useState([]);
  const [reclamosError, setReclamosError] = useState('');
  const [filtroReclamos, setFiltroReclamos] = useState('pendientes'); // 'pendientes' | 'respondidos'
  const [reclamoAbierto, setReclamoAbierto] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [respondiendo, setRespondiendo] = useState(false);

  const cargarReclamos = async () => {
    try {
      setReclamos(await obtenerReclamos());
      setReclamosError('');
    } catch (e) {
      console.error(e);
      setReclamosError(`No se pudieron cargar los reclamos: ${e?.message || ''}`);
    }
  };

  const abrirReclamo = (id) => {
    setReclamoAbierto(reclamoAbierto === id ? null : id);
    setRespuesta('');
  };

  const enviarRespuesta = async (r) => {
    const texto = respuesta.trim();
    if (texto.length < 10) {
      setMsg('Escribe la respuesta al consumidor (mínimo 10 caracteres).');
      return;
    }
    if (!window.confirm(`Se enviará por correo a ${r.email} y no se podrá editar.`)) return;
    setRespondiendo(true);
    try {
      await responderReclamo(r.id, texto);
      setMsg(`Reclamo ${r.codigo} respondido`);
      setRespuesta('');
      await cargarReclamos();
    } catch (e) {
      setMsg(`No se pudo guardar la respuesta: ${e?.message || ''}`);
    }
    setRespondiendo(false);
  };

  const reclamosPendientes = reclamos.filter((r) => r.estado !== 'respondido');
  const reclamosRespondidos = reclamos.filter((r) => r.estado === 'respondido');

  return {
    reclamosPendientes, reclamosRespondidos, reclamosError, filtroReclamos, setFiltroReclamos,
    reclamoAbierto, respuesta, setRespuesta, respondiendo, cargarReclamos, abrirReclamo, enviarRespuesta,
  };
}
