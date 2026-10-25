import React, { useState, useRef } from 'react';
import { useIdioma } from '../context/LanguageContext';
import { useTraducido } from '../i18n/useTraducido';
import { subirImagen } from '../firebase/almacenamiento';
import { imagen } from '../utils/imagen';
import { avisarFallo } from '../utils/avisos';
import useMarcado from '../hooks/useMarcado';
import Icono from './Icono';
import './Editable.css';
import './ProductoEditable.css';

// Campo de la ficha del producto, editable en la propia página y guardado al instante.
// valor: lo guardado · mostrar: lo que se ve en vez del valor (el precio con su moneda)
// numero: entero >= 0 (opcional: puede quedar vacío) · placeholder: vacío, el admin ve el recuadro punteado
// onGuardar recibe el texto limpio, o el número (null si se vació un campo opcional)
export function CampoProducto({ valor, mostrar, multiline = false, numero = false, opcional = false, placeholder = '', onGuardar }) {
  const { idioma } = useIdioma();
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { ref: elRef, marcado, setMarcado, alTocar } = useMarcado('.editable-boton'); // toque en pantallas sin hover

  const texto = valor === null || valor === undefined ? '' : String(valor);
  const traducido = useTraducido(numero ? '' : texto, idioma);
  const vacio = placeholder && !texto.trim();

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
        nuevo = Number(nuevo.replace(',', '.'));
        if (!Number.isFinite(nuevo) || nuevo < 0) { setAviso('Escribe un número válido'); return; }
        // La tienda muestra y cobra montos enteros (S/90.00)
        if (!Number.isInteger(nuevo)) { setAviso('Sin decimales: escribe un número entero'); return; }
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

// La galería de abajo muestra hasta 6 fotos
export const MAX_GALERIA = 6;

// Sube las fotos elegidas a Storage; devuelve las URL de las que se pudieron subir
async function subirFotos(archivos) {
  const urls = [];
  try {
    for (const archivo of archivos) urls.push(await subirImagen(archivo, 'productos'));
  } catch (err) {
    console.error('No se pudo subir la foto:', err);
    avisarFallo('guardar el cambio');
  }
  return urls;
}

// Cambia de lugar la foto i con su vecina (paso -1 o 1)
function moverFoto(fotos, i, paso) {
  const nuevas = [...fotos];
  [nuevas[i], nuevas[i + paso]] = [nuevas[i + paso], nuevas[i]];
  return nuevas;
}

// Mover a la izquierda, a la derecha y quitar
function AccionesFoto({ i, total, onMover, onQuitar }) {
  return (
    <div className="pe-foto-acciones">
      <button type="button" onClick={() => onMover(-1)} disabled={i === 0} aria-label="Mover a la izquierda">
        <Icono nombre="flechaIzq" tam={14} />
      </button>
      <button type="button" onClick={() => onMover(1)} disabled={i === total - 1} aria-label="Mover a la derecha">
        <Icono nombre="flechaDer" tam={14} />
      </button>
      <button type="button" className="quitar" onClick={onQuitar} aria-label="Quitar foto">
        <Icono nombre="cerrar" tam={14} />
      </button>
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
    onCambiar(moverFoto(fotos, i, paso));
    onElegir(j);
  };

  const subir = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!archivos.length) return;
    setSubiendo(true);
    const nuevas = await subirFotos(archivos);
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
              <AccionesFoto i={i} total={fotos.length} onMover={(paso) => mover(i, paso)} onQuitar={() => onCambiar(fotos.filter((_, k) => k !== i))} />
            </div>
          ))}
          {agregar}
        </div>
      )}
      <input ref={entradaRef} type="file" accept="image/*" multiple onChange={subir} hidden />
    </div>
  );
}

// Galería de abajo: las fotos escalonadas que salen debajo del producto, con los mismos controles de las fotos
export function GaleriaProducto({ fotos, nombre, onCambiar }) {
  const [subiendo, setSubiendo] = useState(false);
  const entradaRef = useRef(null);
  const cupo = MAX_GALERIA - fotos.length;

  const subir = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!archivos.length) return;
    if (archivos.length > cupo) window.alert(`La galería muestra hasta ${MAX_GALERIA} fotos: se agregan solo las primeras ${cupo}.`);
    setSubiendo(true);
    const nuevas = await subirFotos(archivos.slice(0, cupo));
    if (nuevas.length) await onCambiar([...fotos, ...nuevas]);
    setSubiendo(false);
  };

  return (
    <section className="producto-galeria-edit">
      <p className="pe-galeria-nota">Galería de abajo · estas fotos salen debajo del producto (hasta {MAX_GALERIA}).</p>
      <div className="galeria-edit-grid">
        {fotos.map((url, i) => (
          <figure key={`${i}-${url}`} className={`galeria-edit-item pos-${i} pe-galeria-item`}>
            <img src={imagen(url)} alt={`${nombre} ${i + 1}`} />
            {i >= MAX_GALERIA && <span className="pe-galeria-oculta">No se muestra</span>}
            <AccionesFoto i={i} total={fotos.length} onMover={(paso) => onCambiar(moverFoto(fotos, i, paso))} onQuitar={() => onCambiar(fotos.filter((_, k) => k !== i))} />
          </figure>
        ))}
        {cupo > 0 && (
          <button
            type="button"
            className={`galeria-edit-item pos-${fotos.length} pe-agregar-foto pe-galeria-agregar${fotos.length ? '' : ' vacia'}`}
            onClick={() => entradaRef.current?.click()}
            disabled={subiendo}
          >
            {subiendo ? 'Subiendo…' : '+ Agregar foto'}
          </button>
        )}
      </div>
      <input ref={entradaRef} type="file" accept="image/*" multiple onChange={subir} hidden />
    </section>
  );
}
