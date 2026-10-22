import React, { useState, useRef, useEffect } from 'react';
import { useIdioma } from '../context/LanguageContext';
import { useTraducido } from '../i18n/useTraducido';
import { subirImagen } from '../firebase/almacenamiento';
import { imagen } from '../firebase/imagenesProductos';
import Icono from './Icono';
import './Editable.css';
import './ProductoEditable.css';

const MENSAJE_ERROR = 'No se pudo guardar el cambio. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.';

// Campo de la ficha del producto, editable en la propia página y guardado al instante.
// valor: lo guardado · mostrar: lo que se ve en vez del valor (el precio con su moneda)
// numero: entero >= 0 (opcional: puede quedar vacío) · placeholder: vacío, el admin ve el recuadro punteado
// onGuardar recibe el texto limpio, o el número (null si se vació un campo opcional)
export function CampoProducto({ valor, mostrar, multiline = false, numero = false, opcional = false, placeholder = '', onGuardar }) {
  const { idioma } = useIdioma();
  const [editando, setEditando] = useState(false);
  const [marcado, setMarcado] = useState(false);   // toque en pantallas sin hover
  const [draft, setDraft] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const elRef = useRef(null);

  const texto = valor === null || valor === undefined ? '' : String(valor);
  const traducido = useTraducido(numero ? '' : texto, idioma);
  const vacio = placeholder && !texto.trim();

  // El botón marcado con un toque se oculta al tocar en otra parte
  useEffect(() => {
    if (!marcado) return;
    const fuera = (e) => { if (!elRef.current?.contains(e.target)) setMarcado(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [marcado]);

  const abrir = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Los textos se editan en español: el inglés se genera solo al guardar
    if (!numero && idioma !== 'es') {
      window.alert('Para editar textos cambia el idioma a ES. Lo que escribas se guarda en español y la versión en inglés se actualiza sola al guardar.');
      return;
    }
    setDraft(texto);
    setAviso('');
    setMarcado(false);
    setEditando(true);
  };

  const alTocar = (e) => {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (e.target.closest('.editable-boton')) return;
    e.preventDefault();
    e.stopPropagation();
    setMarcado(true);
  };

  const cerrar = (e) => {
    e?.stopPropagation();
    setEditando(false);
  };

  const salvar = async (e) => {
    e?.stopPropagation();
    let nuevo = draft.trim();
    if (numero) {
      if (!nuevo && !opcional) { setAviso('Escribe un número'); return; }
      if (nuevo) {
        nuevo = Math.round(Number(nuevo));
        if (!Number.isFinite(nuevo) || nuevo < 0) { setAviso('Escribe un número válido'); return; }
      } else {
        nuevo = null;
      }
    }
    if (String(nuevo ?? '') !== texto) {
      setGuardando(true);
      await onGuardar(nuevo);
      setGuardando(false);
    }
    setEditando(false);
  };

  const teclas = (e) => {
    if (e.key === 'Escape') cerrar(e);
    if (e.key === 'Enter' && !multiline) salvar(e);
  };

  if (editando) {
    return (
      <span className="editable-edit" onClick={(e) => e.stopPropagation()}>
        {multiline
          ? <textarea className="editable-area" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={teclas} rows={5} autoFocus />
          : <input className="editable-input" type={numero ? 'number' : 'text'} min={numero ? 0 : undefined} step={numero ? 1 : undefined}
              value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={teclas} autoFocus />}
        {aviso && <span className="pe-aviso">{aviso}</span>}
        <span className="editable-acciones">
          <button type="button" onClick={salvar} disabled={guardando} className="editable-ok">{guardando ? '…' : 'Guardar'}</button>
          <button type="button" onClick={cerrar} disabled={guardando} className="editable-cancel">Cancelar</button>
        </span>
      </span>
    );
  }

  if (vacio) {
    return <span className="editable-vacio" onClick={abrir} title="Editar">+ {placeholder}</span>;
  }

  return (
    <span ref={elRef} className={`editable-text${marcado ? ' editable-marcado' : ''}`} onClick={alTocar}>
      {mostrar !== undefined ? mostrar : traducido}
      <button type="button" className="editable-boton" onClick={abrir} title="Editar">
        <Icono nombre="lapiz" tam={12} /> Editar
      </button>
    </span>
  );
}

// Visible en la tienda / Borrador
export function EstadoProducto({ activo, onAlternar }) {
  return (
    <div className="pe-estado">
      <button type="button" className={`pe-estado-btn${activo ? ' visible' : ''}`} onClick={onAlternar} aria-pressed={activo}>
        <span className="pe-punto" />
        {activo ? 'Visible en la tienda' : 'Borrador'}
      </button>
      {!activo && <span className="pe-estado-nota">Los visitantes no lo ven.</span>}
    </div>
  );
}

// Fotos del producto: agregar, quitar y mover. La primera es la portada del catálogo.
// elegida: la que muestra el carrusel · onCambiar recibe la lista nueva
export function FotosProducto({ fotos, elegida, onElegir, onCambiar }) {
  const [subiendo, setSubiendo] = useState(false);
  const entradaRef = useRef(null);

  const mover = (i, paso) => {
    const j = i + paso;
    if (j < 0 || j >= fotos.length) return;
    const nuevas = [...fotos];
    [nuevas[i], nuevas[j]] = [nuevas[j], nuevas[i]];
    onCambiar(nuevas);
    onElegir(j);
  };

  const subir = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!archivos.length) return;
    setSubiendo(true);
    const nuevas = [];
    try {
      for (const archivo of archivos) nuevas.push(await subirImagen(archivo, 'productos'));
    } catch (err) {
      console.error('No se pudo subir la foto:', err);
      window.alert(MENSAJE_ERROR);
    }
    if (nuevas.length) await onCambiar([...fotos, ...nuevas]);
    setSubiendo(false);
  };

  const agregar = (
    <button type="button" className={`pe-agregar-foto${fotos.length ? '' : ' grande'}`} onClick={() => entradaRef.current?.click()} disabled={subiendo}>
      {subiendo ? 'Subiendo…' : '+ Agregar foto'}
    </button>
  );

  return (
    <div className="pe-fotos">
      {fotos.length === 0 ? agregar : (
        <div className="pe-fotos-lista">
          {fotos.map((url, i) => (
            <div key={`${i}-${url}`} className={`pe-foto${i === elegida ? ' activa' : ''}`}>
              <button type="button" className="pe-foto-img" onClick={() => onElegir(i)} aria-label={`Ver foto ${i + 1}`}>
                <img src={imagen(url)} alt="" />
                {i === 0 && <span className="pe-portada">Portada</span>}
              </button>
              <div className="pe-foto-acciones">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda">
                  <Icono nombre="flechaIzq" tam={14} />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} aria-label="Mover a la derecha">
                  <Icono nombre="flechaDer" tam={14} />
                </button>
                <button type="button" className="quitar" onClick={() => onCambiar(fotos.filter((_, k) => k !== i))} aria-label="Quitar foto">
                  <Icono nombre="cerrar" tam={14} />
                </button>
              </div>
            </div>
          ))}
          {agregar}
        </div>
      )}
      <input ref={entradaRef} type="file" accept="image/*" multiple onChange={subir} hidden />
    </div>
  );
}
