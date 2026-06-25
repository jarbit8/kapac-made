import React, { useState } from 'react';
import { useTextos } from '../context/TextosContext';
import { useIdioma } from '../context/LanguageContext';
import './Editable.css';

// Texto editable en la propia página (solo el admin ve el lápiz).
// id: clave única · children: texto por defecto · as: etiqueta (p, h2, span...)
export default function Editable({ id, children, as = 'span', className = '', multiline = false }) {
  const { textos, esAdmin, guardar } = useTextos();
  const { idioma } = useIdioma();
  const clave = `${id}__${idioma}`;            // override por idioma
  const porDefecto = typeof children === 'string' ? children : '';
  const valor = (textos[clave] !== undefined && textos[clave] !== null) ? textos[clave] : porDefecto;

  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState('');
  const [guardando, setGuardando] = useState(false);
  const Tag = as;

  if (!esAdmin) {
    return <Tag className={className}>{valor}</Tag>;
  }

  const abrir = (e) => { e.preventDefault(); e.stopPropagation(); setDraft(valor); setEditando(true); };
  const salvar = async () => { setGuardando(true); await guardar(clave, draft); setGuardando(false); setEditando(false); };

  if (editando) {
    return (
      <span className="editable-edit">
        {multiline
          ? <textarea className="editable-area" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} autoFocus />
          : <input className="editable-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />}
        <span className="editable-acciones">
          <button type="button" onClick={salvar} disabled={guardando} className="editable-ok">{guardando ? '…' : 'Guardar'}</button>
          <button type="button" onClick={() => setEditando(false)} className="editable-cancel">Cancelar</button>
        </span>
      </span>
    );
  }

  return (
    <Tag className={`${className} editable-text`}>
      {valor}
      <button type="button" className="editable-lapiz" onClick={abrir} title="Editar texto">✏️</button>
    </Tag>
  );
}
