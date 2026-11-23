import React from 'react';

export default function Leyendas({ t }) {
  return (
    <div className="libro-leyendas">
      <p>{t('libro.legenda1')}</p>
      <p>{t('libro.legenda2')}</p>
    </div>
  );
}
