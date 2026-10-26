import { EMPRESA } from './empresa';

describe('EMPRESA', () => {
  test('datos del proveedor del Libro de Reclamaciones', () => {
    expect(EMPRESA.razonSocial).toBe('QHAPAQ BRANDS S.A.C.S.');
    expect(EMPRESA.nombreComercial).toBe('Kapac Made');
    expect(EMPRESA.ruc).toBe('20613661604');
    expect(EMPRESA.domicilio).toMatch(/Lambramani/);
  });

  test('el RUC tiene 11 dígitos y empieza con 20 (persona jurídica)', () => {
    expect(EMPRESA.ruc).toMatch(/^20\d{9}$/);
  });
});
