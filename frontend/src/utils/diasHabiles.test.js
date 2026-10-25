import { diasHabilesHasta } from './diasHabiles';

// Fechas en hora local: el resultado no depende de la zona del equipo
const f = (anio, mes, dia, hora = 12) => new Date(anio, mes - 1, dia, hora);

describe('diasHabilesHasta', () => {
  test('el mismo día son cero', () => {
    expect(diasHabilesHasta(f(2026, 10, 26), f(2026, 10, 26))).toBe(0);
    expect(diasHabilesHasta(f(2026, 10, 26, 23), f(2026, 10, 26, 1))).toBe(0);
  });

  test('cuenta de lunes a viernes', () => {
    expect(diasHabilesHasta(f(2026, 10, 27), f(2026, 10, 26))).toBe(1);
    expect(diasHabilesHasta(f(2026, 10, 30), f(2026, 10, 26))).toBe(4);
  });

  test('salta el fin de semana', () => {
    // viernes -> lunes es un día hábil
    expect(diasHabilesHasta(f(2026, 10, 26), f(2026, 10, 23))).toBe(1);
    // viernes -> sábado y domingo no suman
    expect(diasHabilesHasta(f(2026, 10, 24), f(2026, 10, 23))).toBe(0);
    expect(diasHabilesHasta(f(2026, 10, 25), f(2026, 10, 23))).toBe(0);
  });

  test('quince días hábiles son tres semanas exactas desde un lunes', () => {
    expect(diasHabilesHasta(f(2026, 11, 16), f(2026, 10, 26))).toBe(15);
  });

  test('cruza meses y años', () => {
    expect(diasHabilesHasta(f(2027, 1, 4), f(2026, 12, 31))).toBe(2);
    expect(diasHabilesHasta(f(2026, 11, 2), f(2026, 10, 30))).toBe(1);
  });

  test('si la fecha ya pasó el resultado es negativo', () => {
    expect(diasHabilesHasta(f(2026, 10, 26), f(2026, 10, 27))).toBe(-1);
    expect(diasHabilesHasta(f(2026, 10, 23), f(2026, 10, 26))).toBe(-1);
    expect(diasHabilesHasta(f(2026, 10, 26), f(2026, 11, 16))).toBe(-15);
  });

  test('la hora del día no cambia el resultado', () => {
    expect(diasHabilesHasta(f(2026, 10, 30, 0), f(2026, 10, 26, 23))).toBe(4);
    expect(diasHabilesHasta(f(2026, 10, 30, 23), f(2026, 10, 26, 0))).toBe(4);
  });

  test('usa la fecha de hoy si no se pasa otra', () => {
    const hoy = new Date();
    const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    const esperado = [0, 6].includes(manana.getDay()) ? 0 : 1;
    expect(diasHabilesHasta(manana)).toBe(esperado);
  });

  test('no cambia las fechas que recibe', () => {
    const limite = f(2026, 11, 16);
    const hoy = f(2026, 10, 26);
    diasHabilesHasta(limite, hoy);
    expect(limite.getTime()).toBe(f(2026, 11, 16).getTime());
    expect(hoy.getTime()).toBe(f(2026, 10, 26).getTime());
  });
});
