import React, { useState, useRef, useEffect } from 'react';
import { useTextos } from '../context/TextosContext';
import { useIdioma } from '../context/LanguageContext';
import { traducirEsEn } from '../i18n/traducir';
import { asegurarFuente, cssFuente, nombreFuente } from '../utils/fuentes';
import './Editable.css';

const FUENTE_SITIO = 'IBM Plex Mono';
const COLOR_BASE = '#111111';

const IconoLapiz = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

// Texto editable en la propia página (solo el admin, en modo edición).
// id: clave única · children: texto por defecto · as: etiqueta (p, h2, span...)
// estilo: permite cambiar color y tipografía desde el editor (solo para títulos de marca)
// sinColor: ignora el color guardado (para texto dentro de <button>, que sigue el color único de botones)
// placeholder: texto opcional; vacío, el admin ve el placeholder y el visitante no ve nada
export default function Editable({ id, children, as = 'span', className = '', multiline = false, sinColor = false, estilo = false, placeholder = '' }) {
  const { textos, listos, esAdmin, guardar } = useTextos();
  const { idioma } = useIdioma();
  const clave = `${id}__${idioma}`;            // override de texto por idioma
  const claveColor = `${id}__color`;           // override de color (no depende del idioma)
  const claveFuente = `${id}__font`;           // override de tipografía (no depende del idioma)
  const porDefecto = typeof children === 'string' ? children : '';
  const valor = (textos[clave] !== undefined && textos[clave] !== null) ? textos[clave] : porDefecto;
  const colorPropio = textos[claveColor] || '';
  const fuentePropia = textos[claveFuente] || '';

  const [editando, setEditando] = useState(false);
  const [marcado, setMarcado] = useState(false);   // toque en pantallas sin hover
  const [draft, setDraft] = useState('');
  const [colorDraft, setColorDraft] = useState('');
  const [fuenteDraft, setFuenteDraft] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [comoArea, setComoArea] = useState(false); // textos largos se editan en un cuadro que crece
  const Tag = as;
  const elRef = useRef(null);
  const areaRef = useRef(null);

  // Muchas reglas CSS del sitio usan "!important" — un style prop normal no les gana.
  // Lo aplicamos por JS con prioridad "important" real para que el color y la fuente sí se vean.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (!sinColor && colorPropio) el.style.setProperty('color', colorPropio, 'important');
    else el.style.removeProperty('color');
    if (fuentePropia) {
      asegurarFuente(fuentePropia);
      el.style.setProperty('font-family', cssFuente(fuentePropia), 'important');
    } else {
      el.style.removeProperty('font-family');
    }
  }, [colorPropio, fuentePropia, sinColor, editando]);

  // El botón marcado con un toque se oculta al tocar en otra parte
  useEffect(() => {
    if (!marcado) return;
    const fuera = (e) => { if (!elRef.current?.contains(e.target)) setMarcado(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [marcado]);

  // El cuadro de texto crece con lo que se escribe, así se ve todo sin desplazarse dentro
  useEffect(() => {
    const a = areaRef.current;
    if (!a) return;
    a.style.height = 'auto';
    a.style.height = `${a.scrollHeight + 2}px`;
  }, [draft, editando]);

  const vacio = placeholder && !valor.trim();

  if (!esAdmin) {
    if (vacio) return null;
    return <Tag ref={elRef} className={className} style={listos ? undefined : { visibility: 'hidden' }}>{valor}</Tag>;
  }

  const abrir = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // La edición siempre se hace en español (el modo edición lo fuerza): al guardar se traduce el inglés.
    if (idioma !== 'es') return;
    setDraft(valor);
    setComoArea(multiline || valor.length > 36 || valor.includes('\n'));
    setColorDraft(colorPropio);
    setFuenteDraft(nombreFuente(fuentePropia));
    setMarcado(false);
    setEditando(true);
  };

  // Sin hover, el primer toque marca el texto y muestra el botón (sin activar enlaces ni botones que lo envuelvan)
  const alTocar = (e) => {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (e.target.closest('.editable-boton')) return;
    e.preventDefault();
    e.stopPropagation();
    setMarcado(true);
  };

  const salvar = async () => {
    setGuardando(true);
    // Si no se guardó (sin conexión o sesión vencida) el editor sigue abierto con lo escrito
    if (!(await guardar(clave, draft))) {
      setGuardando(false);
      return;
    }
    // Se edita en español y el inglés se regenera siempre al guardar,
    // para que no quede una traducción vieja del texto anterior.
    const traducido = draft.trim() ? await traducirEsEn(draft) : '';
    if (traducido || !draft.trim()) await guardar(`${id}__en`, traducido);
    if (estilo) {
      if (colorDraft !== colorPropio) await guardar(claveColor, colorDraft);
      // Escribir la fuente del sitio (o dejarla vacía) vuelve al valor por defecto
      const n = fuenteDraft.trim();
      const nueva = n && n.toLowerCase() !== FUENTE_SITIO.toLowerCase() ? n : '';
      if (nueva.toLowerCase() !== nombreFuente(fuentePropia).toLowerCase()) await guardar(claveFuente, nueva);
    }
    setGuardando(false);
    setEditando(false);
  };

  const cancelar = () => setEditando(false);

  const teclas = (e) => {
    if (e.key === 'Escape') cancelar();
    else if (e.key === 'Enter' && !multiline && !guardando) { e.preventDefault(); salvar(); }
  };

  if (editando) {
    // Si el editor queda dentro de un enlace, tocarlo no debe abrir el enlace (el selector de color sí necesita su clic)
    const alClicEditor = (e) => {
      e.stopPropagation();
      if (!e.target.closest('input[type="color"], label')) e.preventDefault();
    };
    return (
      <span className="editable-edit" onClick={alClicEditor}>
        {comoArea
          ? <textarea ref={areaRef} className="editable-area" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={teclas} rows={multiline ? 3 : 2} autoFocus />
          : <input className="editable-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={teclas} autoFocus />}
        {estilo && (
          <span className="editable-estilo">
            <label className="editable-campo">
              <span>Color</span>
              <input type="color" className="editable-color" value={colorDraft || COLOR_BASE}
                onChange={(e) => setColorDraft(e.target.value)} />
              {colorDraft && (
                <button type="button" className="editable-quitar" onClick={() => setColorDraft('')}>Quitar</button>
              )}
            </label>
            <label className="editable-campo">
              <span>Tipografía</span>
              <input type="text" className="editable-fuente" value={fuenteDraft} placeholder={FUENTE_SITIO}
                onChange={(e) => setFuenteDraft(e.target.value)} spellCheck={false} />
            </label>
          </span>
        )}
        <span className="editable-acciones">
          <button type="button" onClick={salvar} disabled={guardando} className="editable-ok">{guardando ? '…' : 'Guardar'}</button>
          <button type="button" onClick={cancelar} className="editable-cancel">Cancelar</button>
        </span>
      </span>
    );
  }

  if (vacio) {
    return (
      <Tag ref={elRef} className={`${className} editable-vacio`} onClick={abrir} title="Editar texto">
        + {placeholder}
      </Tag>
    );
  }

  return (
    <Tag ref={elRef} className={`${className} editable-text${marcado ? ' editable-marcado' : ''}`} onClick={alTocar}>
      {valor}
      <button type="button" className="editable-boton" onClick={abrir} title="Editar texto">
        <IconoLapiz /> Editar
      </button>
    </Tag>
  );
}
