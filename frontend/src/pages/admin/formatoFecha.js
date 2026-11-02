export const formatoFecha = (ts) => {
  if (!ts?.toDate) return 'Recién creado';
  return ts.toDate().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};
