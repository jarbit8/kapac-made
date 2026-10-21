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
export default function Editable({ id, children, as = 'span', className = '', multiline = false, sinColor = false, estilo = false }) {
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
  const Tag = as;
  const elRef = useRef(null);

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

  if (!esAdmin) {
    return <Tag ref={elRef} className={className} style={listos ? undefined : { visibility: 'hidden' }}>{valor}</Tag>;
  }

  const abrir = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // La edición siempre se hace en español: al guardar se traduce y actualiza el inglés.
    if (idioma !== 'es') {
      window.alert('Para editar textos cambia el idioma a ES. Lo que escribas se guarda en español y la versión en inglés se actualiza sola al guardar.');
      return;
    }
    setDraft(valor);
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

  const salvar = async (e) => {
    e.stopPropagation();
    setGuardando(true);
    await guardar(clave, draft);
    // Se edita en español y el inglés se regenera siempre al guardar,
    // para que no quede una traducción vieja del texto anterior.
    const traducido = await traducirEsEn(draft);
    if (traducido) await guardar(`${id}__en`, traducido);
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

  if (editando) {
    return (
      <span className="editable-edit" onClick={(e) => e.stopPropagation()}>
        {multiline
          ? <textarea className="editable-area" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} autoFocus />
          : <input className="editable-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />}
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
          <button type="button" onClick={(e) => { e.stopPropagation(); setEditando(false); }} className="editable-cancel">Cancelar</button>
        </span>
      </span>
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
