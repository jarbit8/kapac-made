import { useState } from 'react';
import { useIdioma } from '../../context/LanguageContext';
import { enviarReclamo } from '../../firebase/reclamos';
import { mensajeServidor } from '../../i18n/mensajes';
import { VACIO, validar } from './validacion';

const soloNumeros = (tipo) => tipo === 'DNI' || tipo === 'RUC';

export default function useFormularioReclamo() {
  const { t, idioma } = useIdioma();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(null);

  const cambiar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => {
      if (!e[campo]) return e;
      const { [campo]: _, ...resto } = e;
      return resto;
    });
  };

  const propsDe = (campo, requerido = true) => ({
    id: `libro-${campo}`,
    name: campo,
    value: form[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    'aria-required': requerido,
    'aria-invalid': !!errores[campo],
    'aria-describedby': errores[campo] ? `libro-${campo}-error` : undefined,
  });

  const cambiarDocumento = (v) => cambiar('documento', soloNumeros(form.documentoTipo) ? v.replace(/\D/g, '') : v.replace(/\s/g, ''));

  const cambiarTipoDocumento = (tipo) => {
    setForm((f) => ({ ...f, documentoTipo: tipo, documento: soloNumeros(tipo) ? f.documento.replace(/\D/g, '') : f.documento }));
    setErrores(({ documento, ...resto }) => resto);
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    if (enviando) return;
    const { datos, errores: e } = validar(form);
    setErrores(e);
    setErrorEnvio('');
    const primero = Object.keys(e)[0];
    if (primero) {
      const campo = document.getElementById(primero === 'tipo' ? 'libro-tipo-reclamo' : `libro-${primero}`);
      if (campo) campo.focus();
      return;
    }
    setEnviando(true);
    const res = await enviarReclamo({ ...datos, idioma });
    setEnviando(false);
    if (res.ok) {
      setEnviado({ ...res, datos });
      window.scrollTo(0, 0);
    } else {
      setErrorEnvio(res.error ? t(`libro.err_${res.error}`) : mensajeServidor(res.mensaje, idioma, t('libro.err_envio')));
    }
  };

  return {
    form, errores, errorEnvio, enviando, enviado,
    cambiar, propsDe, cambiarDocumento, cambiarTipoDocumento, enviar, soloNumeros,
  };
}
