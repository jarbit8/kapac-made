// Días hábiles (lunes a viernes) desde hoy hasta la fecha límite; negativo si ya pasó
export function diasHabilesHasta(limite, hoy = new Date()) {
  const dia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
  const fin = dia(limite);
  const d = dia(hoy);
  const paso = fin >= d ? 1 : -1;
  let n = 0;
  while (paso > 0 ? d < fin : d > fin) {
    d.setDate(d.getDate() + paso);
    if (d.getDay() !== 0 && d.getDay() !== 6) n += paso;
  }
  return n;
}
