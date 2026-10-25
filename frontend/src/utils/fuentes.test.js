import { asegurarFuente, cssFuente, nombreFuente } from './fuentes';

describe('cssFuente', () => {
  test('un nombre simple queda entre comillas con respaldo', () => {
    expect(cssFuente('Fraunces')).toBe("'Fraunces', sans-serif");
    expect(cssFuente('  Open Sans  ')).toBe("'Open Sans', sans-serif");
  });

  test('un stack completo se deja como está', () => {
    expect(cssFuente("'Inter', Arial, sans-serif")).toBe("'Inter', Arial, sans-serif");
    expect(cssFuente('Georgia, serif')).toBe('Georgia, serif');
  });

  test('sin nombre da texto vacío', () => {
    ['', '   ', null, undefined].forEach((v) => expect(cssFuente(v)).toBe(''));
  });

  test('las comillas escritas a mano no rompen el CSS', () => {
    expect(cssFuente("Pwned'; } body { display:none")).toBe("'Pwned; } body { display:none', sans-serif");
    expect(cssFuente('Dos "comillas"')).toBe("'Dos comillas', sans-serif");
  });
});

describe('nombreFuente', () => {
  test('saca el primer nombre de un stack', () => {
    expect(nombreFuente("'Inter', Arial, sans-serif")).toBe('Inter');
    expect(nombreFuente('"Open Sans", sans-serif')).toBe('Open Sans');
    expect(nombreFuente('Fraunces')).toBe('Fraunces');
  });

  test('vacío o ausente da texto vacío', () => {
    ['', null, undefined].forEach((v) => expect(nombreFuente(v)).toBe(''));
  });

  test('ida y vuelta con cssFuente', () => {
    expect(nombreFuente(cssFuente('Playfair Display'))).toBe('Playfair Display');
  });
});

describe('asegurarFuente', () => {
  const enlaces = () => [...document.head.querySelectorAll('link[rel=stylesheet]')];
  beforeEach(() => { document.head.innerHTML = ''; });

  test('agrega el enlace a Google Fonts con el nombre codificado', () => {
    asegurarFuente('Roboto Slab');
    const l = enlaces();
    expect(l).toHaveLength(1);
    expect(l[0].href).toContain('https://fonts.googleapis.com/css2?family=Roboto+Slab:');
    expect(l[0].href).toContain('display=swap');
  });

  test('la misma fuente no se pide dos veces, sin importar las mayúsculas', () => {
    asegurarFuente('Lora');
    asegurarFuente('Lora');
    asegurarFuente('  lora ');
    expect(enlaces().filter((l) => l.href.includes('family=Lora'))).toHaveLength(1);
  });

  test('un stack o un nombre vacío no pide nada', () => {
    asegurarFuente('Arial, sans-serif');
    asegurarFuente('');
    asegurarFuente(null);
    asegurarFuente('   ');
    expect(enlaces()).toHaveLength(0);
  });

  test('el nombre se codifica para no meter parámetros', () => {
    asegurarFuente('Mala&family=Otra');
    const l = enlaces()[0];
    expect(new URL(l.href).searchParams.getAll('family')).toHaveLength(1);
  });
});
