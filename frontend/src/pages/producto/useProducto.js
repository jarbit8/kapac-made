import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerProducto, obtenerProductos, productosGuardados, actualizarProducto, eliminarProducto } from '../../firebase/productos';
import { useIdioma } from '../../context/LanguageContext';
import { useTextos } from '../../context/TextosContext';
import { traducirEsEn } from '../../i18n/traducir';
import { asegurarFuente } from '../../utils/fuentes';

export default function useProducto(id) {
  const navigate = useNavigate();
  const { t, idioma } = useIdioma();
  const { esAdmin } = useTextos();
  // Del catálogo guardado, para mostrar la ficha sin esperar a Firestore
  const guardado = () => productosGuardados()?.find((p) => p.id === id && (p.activo !== false || esAdmin)) || null;
  const otrosGuardados = () => (productosGuardados() || []).filter((p) => p.id !== id && p.activo !== false).slice(0, 3);
  const [producto, setProducto] = useState(guardado);
  const [relacionados, setRelacionados] = useState(otrosGuardados);
  const [cargando, setCargando] = useState(() => !guardado());
  const [error, setError] = useState('');

  // Carga las fuentes elegidas para este producto (si hace falta, desde Google Fonts)
  useEffect(() => {
    Object.values(producto?.estilos || {}).forEach((e) => { if (e?.fuente) asegurarFuente(e.fuente); });
  }, [producto]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setCargando(!guardado());
    setProducto(guardado());
    setRelacionados(otrosGuardados());
    setError('');
    obtenerProducto(id)
      .then((p) => {
        if (!p || (p.activo === false && !esAdmin)) { setProducto(null); setError(t('producto.no_encontrado')); }
        else setProducto(p);
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        if (!guardado()) setError(idioma === 'en' ? 'Could not load product.' : 'No se pudo cargar el producto.');
        setCargando(false);
      });
    // Productos relacionados (otros del catálogo)
    obtenerProductos()
      .then((todos) => {
        const otros = todos.filter((p) => p.id !== id && p.activo !== false).slice(0, 3);
        setRelacionados(otros);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, esAdmin]);

  // Modo edición: cada cambio se guarda al instante y solo escribe los campos que cambiaron
  const productoRef = useRef(producto);
  productoRef.current = producto;
  const filas = (campo) => (Array.isArray(productoRef.current?.[campo]) ? productoRef.current[campo] : []);

  const guardarCampos = async (cambios, anterior) => {
    const antes = anterior || {};
    if (!anterior) Object.keys(cambios).forEach((k) => { antes[k] = productoRef.current[k]; });
    setProducto((p) => (p ? { ...p, ...cambios } : p));
    try {
      await actualizarProducto(id, cambios);
    } catch (e) {
      console.error('No se pudo guardar el producto:', e);
      setProducto((p) => (p ? { ...p, ...antes } : p));
      window.alert('No se pudo guardar el cambio. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
  };

  // Nombre y descripción: se guarda el español y se regenera el inglés (si falla, queda vacío)
  const guardarTexto = async (campo, valor) => {
    const antes = { [campo]: productoRef.current[campo], [`${campo}En`]: productoRef.current[`${campo}En`] };
    setProducto((p) => (p ? { ...p, [campo]: valor } : p)); // se ve mientras se traduce
    let en = '';
    if (valor) {
      try { en = (await traducirEsEn(valor)) || ''; } catch (_) {}
    }
    await guardarCampos({ [campo]: valor, [`${campo}En`]: en }, antes);
  };

  const cambiarFila = (campo, i, parte, valor) =>
    guardarCampos({ [campo]: filas(campo).map((f, k) => (k === i ? { ...f, [parte]: valor } : f)) });
  const agregarFila = (campo, nueva) => guardarCampos({ [campo]: [...filas(campo), nueva] });
  const quitarFila = (campo, i) => guardarCampos({ [campo]: filas(campo).filter((_, k) => k !== i) });

  // La primera foto es la portada del catálogo
  const cambiarFotos = (fotos) => guardarCampos({
    fotos,
    imagenMochila: fotos[0] || '',
    ...(producto.imagenContexto ? { imagenContexto: '' } : {}),
  });

  const cambiarGaleria = (galeria) => guardarCampos({ galeria });

  const alternarActivo = () => {
    const activo = producto.activo === false;
    if (activo && (!(producto.nombre || '').trim() || !producto.precio || !producto.imagenMochila)) {
      window.alert('Antes de mostrarlo en la tienda agrega el nombre, el precio y al menos una foto.');
      return;
    }
    guardarCampos({ activo });
  };

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await eliminarProducto(id);
      navigate('/shop', { replace: true });
    } catch (e) {
      console.error('No se pudo eliminar el producto:', e);
      window.alert('No se pudo eliminar el producto. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
  };

  return {
    producto, relacionados, cargando, error,
    filas, guardarCampos, guardarTexto, cambiarFila, agregarFila, quitarFila,
    cambiarFotos, cambiarGaleria, alternarActivo, eliminar,
  };
}
