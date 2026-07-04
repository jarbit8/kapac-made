import React, { useState, useRef, useEffect } from 'react';
import { useTextos } from '../context/TextosContext';
import { useIdioma } from '../context/LanguageContext';
import { traducirEsEn } from '../i18n/traducir';
import { asegurarFuente, cssFuente, nombreFuente } from '../utils/fuentes';
import './Editable.css';

const FUENTE_SITIO = 'IBM Plex Mono';

// Texto editable en la propia página (solo el admin ve el lápiz, la pastilla de color y la fuente).
// id: clave única · children: texto por defecto · as: etiqueta (p, h2, span...)
// sinColor: oculta pastilla y fuente (para texto dentro de <button>, que sigue el color único de botones)
export default function Editable({ id, children, as = 'span', className = '', multiline = false, sinColor = false }) {
  const { textos, esAdmin, guardar } = useTextos();
  const { idioma } = useIdioma();
  const clave = `${id}__${idioma}`;            // override de texto por idioma
  const claveColor = `${id}__color`;           // override de color (no depende del idioma)
  const claveFuente = `${id}__font`;           // override de tipografía (no depende del idioma)
  const porDefecto = typeof children === 'string' ? children : '';
  const valor = (textos[clave] !== undefined && textos[clave] !== null) ? textos[clave] : porDefecto;
  const colorPropio = textos[claveColor] || '';
  const fuentePropia = textos[claveFuente] || '';

  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState('');
  const [fuenteDraft, setFuenteDraft] = useState(null); // null = sin tocar
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

  if (!esAdmin) {
    return <Tag ref={elRef} className={className}>{valor}</Tag>;
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
    setEditando(true);
  };

  const salvar = async (e) => {
    e.stopPropagation();
    setGuardando(true);
    await guardar(clave, draft);
    // Se edita en español y el inglés se regenera siempre al guardar,
    // para que no quede una traducción vieja del texto anterior.
    const traducido = await traducirEsEn(draft);
    if (traducido) await guardar(`${id}__en`, traducido);
    setGuardando(false);
    setEditando(false);
  };

  const cambiarColor = (e) => guardar(claveColor, e.target.value);

  // La fuente se escribe a mano: se guarda al salir del campo o con Enter.
  // Escribir la fuente del sitio (o dejarlo vacío) vuelve al valor por defecto.
  const salvarFuente = () => {
    if (fuenteDraft === null) return;
    const n = fuenteDraft.trim();
    guardar(claveFuente, n && n.toLowerCase() !== FUENTE_SITIO.toLowerCase() ? n : '');
    setFuenteDraft(null);
  };

  if (editando) {
    return (
      <span className="editable-edit" onClick={(e) => e.stopPropagation()}>
        {multiline
          ? <textarea className="editable-area" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} autoFocus />
          : <input className="editable-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />}
        <span className="editable-acciones">
          <button type="button" onClick={salvar} disabled={guardando} className="editable-ok">{guardando ? '…' : 'Guardar'}</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setEditando(false); }} className="editable-cancel">Cancelar</button>
        </span>
      </span>
    );
  }

  return (
    <Tag ref={elRef} className={`${className} editable-text`}>
      {valor}
      <button type="button" className="editable-lapiz" onClick={abrir} title="Editar texto">✏️</button>
      {!sinColor && (
        <input
          type="color"
          className="editable-color"
          value={colorPropio || '#1d1b15'}
          onClick={(e) => e.stopPropagation()}
          onChange={cambiarColor}
          title="Color de este texto"
        />
      )}
      {!sinColor && (
        <input
          type="text"
          className="editable-fuente"
          value={fuenteDraft !== null ? fuenteDraft : (nombreFuente(fuentePropia) || FUENTE_SITIO)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setFuenteDraft(e.target.value)}
          onBlur={salvarFuente}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
          title="Tipografía de este texto: escribe el nombre y Enter"
          spellCheck={false}
        />
      )}
    </Tag>
  );
}
