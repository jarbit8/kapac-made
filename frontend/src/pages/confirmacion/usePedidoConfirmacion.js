import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useIdioma } from '../../context/LanguageContext';
import { borrarRespaldo } from '../../utils/compra';

export default function usePedidoConfirmacion(pedidoId) {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [quiereAviso, setQuiereAviso] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [errorEmail, setErrorEmail] = useState('');

  // Llegar aquí cierra la compra: ya no hay nada que restaurar al cambiar de método de pago
  useEffect(() => { borrarRespaldo(); }, []);

  useEffect(() => {
    const cargar = async () => {
      try {
        const ref = doc(db, 'pedidos', pedidoId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPedido({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error(e);
      }
      setCargando(false);
    };
    cargar();
  }, [pedidoId]);

  const guardarCanal = async (activo) => {
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), { canalNotificacion: activo ? 'email' : null });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAviso = () => {
    const nuevo = !quiereAviso;
    setQuiereAviso(nuevo);
    if (!nuevo) {
      setEmailConfirmado(false);
      guardarCanal(false);
    }
  };

  // Botón Confirmar correo — si el pedido no tenía correo (invitado que no lo dio
  // en el checkout), se guarda el que recién escribió aquí.
  const confirmarEmail = async () => {
    setErrorEmail('');
    if (!pedido?.email) {
      if (!/\S+@\S+\.\S+/.test(emailInput)) {
        setErrorEmail(es ? 'Ingresa un correo válido.' : 'Enter a valid email address.');
        return;
      }
      try {
        await updateDoc(doc(db, 'pedidos', pedidoId), {
          email: emailInput,
          canalNotificacion: 'email',
        });
        setPedido(prev => ({ ...prev, email: emailInput }));
        setEmailConfirmado(true);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    setEmailConfirmado(true);
    await guardarCanal(true);
  };

  return {
    pedido, cargando,
    aviso: { quiereAviso, emailConfirmado, emailInput, setEmailInput, errorEmail, toggleAviso, confirmarEmail },
  };
}
