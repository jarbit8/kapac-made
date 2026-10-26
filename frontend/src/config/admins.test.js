import { ADMINS, esCorreoAdmin, DUENO, esDueno, NOMBRES } from './admins';

describe('admins', () => {
  test('los dos administradores de la tienda', () => {
    expect(ADMINS).toEqual(['jarb2299@gmail.com', 'cristhiandccapa@gmail.com']);
  });

  test('esCorreoAdmin reconoce a los dos sin importar las mayúsculas', () => {
    expect(esCorreoAdmin('jarb2299@gmail.com')).toBe(true);
    expect(esCorreoAdmin('CristhiandCcapa@Gmail.com')).toBe(true);
  });

  test('otros correos, vacíos o raros no son admin', () => {
    ['ana@ejemplo.com', '', null, undefined, 'jarb2299@gmail.com.pe', ' jarb2299@gmail.com', 'xjarb2299@gmail.com'].forEach((c) => {
      expect(esCorreoAdmin(c)).toBe(false);
    });
  });

  test('la variante con punto de Gmail no cuenta como admin (las reglas comparan el texto exacto)', () => {
    expect(esCorreoAdmin('cristhiand.ccapa@gmail.com')).toBe(false);
    expect(esCorreoAdmin('jarb.2299@gmail.com')).toBe(false);
  });

  test('un valor que no es texto no rompe', () => {
    expect(esCorreoAdmin(123)).toBe(false);
    expect(esCorreoAdmin({})).toBe(false);
  });

  test('el dueño es quien programa el sitio y es admin', () => {
    expect(DUENO).toBe('jarb2299@gmail.com');
    expect(esCorreoAdmin(DUENO)).toBe(true);
    expect(esDueno('JARB2299@gmail.com')).toBe(true);
  });

  test('Cristhian es admin pero no es el dueño: sus visitas sí cuentan', () => {
    expect(esDueno('cristhiandccapa@gmail.com')).toBe(false);
    expect(esDueno('')).toBe(false);
    expect(esDueno(null)).toBe(false);
  });

  test('Cristhian sale con su nombre en las visitas', () => {
    expect(NOMBRES['cristhiandccapa@gmail.com']).toBe('Cristhian');
    expect(NOMBRES[DUENO]).toBeUndefined();
  });
});
