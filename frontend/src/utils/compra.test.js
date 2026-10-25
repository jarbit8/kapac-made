import {
  cuentaDe, correoCompra, nombreCompra,
  guardarRespaldo, borrarRespaldo, hayRespaldo, restaurarCheckout,
  marcarReemplazado, fueReemplazado, cipPendiente, venceCIP, ajustarCarrito,
} from './compra';

beforeEach(() => sessionStorage.clear());

describe('cuentaDe', () => {
  test('una cuenta con correo es cuenta', () => {
    const u = { uid: 'a', email: 'ana@ejemplo.com', isAnonymous: false };
    expect(cuentaDe(u)).toBe(u);
  });

  test('la sesión anónima no es cuenta', () => {
    expect(cuentaDe({ uid: 'a', email: null, isAnonymous: true })).toBeNull();
    expect(cuentaDe({ uid: 'a', email: 'ana@ejemplo.com', isAnonymous: true })).toBeNull();
  });

  test('sin usuario o sin correo no es cuenta', () => {
    expect(cuentaDe(null)).toBeNull();
    expect(cuentaDe(undefined)).toBeNull();
    expect(cuentaDe({ uid: 'a', email: '', isAnonymous: false })).toBeNull();
  });
});

describe('correoCompra', () => {
  test('usa el correo de la cuenta', () => {
    expect(correoCompra({ email: 'ana@ejemplo.com', isAnonymous: false })).toBe('ana@ejemplo.com');
  });

  test('el invitado usa el correo del checkout', () => {
    sessionStorage.setItem('checkout_email', '  luis@ejemplo.com ');
    expect(correoCompra(null)).toBe('luis@ejemplo.com');
  });

  test('la sesión anónima no deja pasar un correo "null"', () => {
    sessionStorage.setItem('checkout_email', 'luis@ejemplo.com');
    expect(correoCompra({ uid: 'x', email: null, isAnonymous: true })).toBe('luis@ejemplo.com');
    sessionStorage.clear();
    expect(correoCompra({ uid: 'x', email: null, isAnonymous: true })).toBe('');
  });

  test('descarta correos mal escritos', () => {
    ['null', 'undefined', 'ana', 'ana@', 'ana@x', 'ana @x.com', '@x.com'].forEach((malo) => {
      sessionStorage.setItem('checkout_email', malo);
      expect(correoCompra(null)).toBe('');
    });
  });

  test('si la cuenta tiene correo gana sobre el del checkout', () => {
    sessionStorage.setItem('checkout_email', 'otro@ejemplo.com');
    expect(correoCompra({ email: 'ana@ejemplo.com', isAnonymous: false })).toBe('ana@ejemplo.com');
  });
});

describe('nombreCompra', () => {
  test('el nombre del checkout gana', () => {
    sessionStorage.setItem('checkout_nombre', ' Ana Quispe ');
    expect(nombreCompra({ email: 'a@b.com', displayName: 'Otra', isAnonymous: false })).toBe('Ana Quispe');
  });

  test('sin nombre del checkout usa el de la cuenta', () => {
    expect(nombreCompra({ email: 'a@b.com', displayName: 'Otra', isAnonymous: false })).toBe('Otra');
  });

  test('"null" y "undefined" escritos como texto no cuentan', () => {
    sessionStorage.setItem('checkout_nombre', 'null');
    expect(nombreCompra(null)).toBe('');
    sessionStorage.setItem('checkout_nombre', 'undefined');
    expect(nombreCompra({ email: 'a@b.com', displayName: 'Otra', isAnonymous: false })).toBe('Otra');
  });

  test('la sesión anónima no aporta nombre', () => {
    expect(nombreCompra({ uid: 'x', email: null, displayName: 'Fantasma', isAnonymous: true })).toBe('');
  });
});

describe('respaldo del checkout', () => {
  const items = [{ id: 'p1', cantidad: 2 }];

  test('sin respaldo no hay nada que restaurar', () => {
    expect(hayRespaldo()).toBe(false);
    expect(restaurarCheckout()).toBeNull();
  });

  test('guarda, detecta y borra', () => {
    guardarRespaldo({ items, email: 'a@b.com', nombre: 'Ana', envio: { tipo: 'recojo' } });
    expect(hayRespaldo()).toBe(true);
    borrarRespaldo();
    expect(hayRespaldo()).toBe(false);
  });

  test('un respaldo sin productos no cuenta', () => {
    guardarRespaldo({ items: [], email: 'a@b.com' });
    expect(hayRespaldo()).toBe(false);
    guardarRespaldo({ email: 'a@b.com' });
    expect(hayRespaldo()).toBe(false);
  });

  test('restaurar deja el checkout como estaba y devuelve los productos', () => {
    guardarRespaldo({ items, email: 'a@b.com', nombre: 'Ana', envio: { tipo: 'envio', distrito: 'Cayma' } });
    expect(restaurarCheckout()).toEqual(items);
    expect(sessionStorage.getItem('checkout_email')).toBe('a@b.com');
    expect(sessionStorage.getItem('checkout_nombre')).toBe('Ana');
    expect(JSON.parse(sessionStorage.getItem('checkout_envio'))).toEqual({ tipo: 'envio', distrito: 'Cayma' });
  });

  test('restaurar sin envío ni correo no deja basura', () => {
    guardarRespaldo({ items });
    restaurarCheckout();
    expect(sessionStorage.getItem('checkout_envio')).toBeNull();
    expect(sessionStorage.getItem('checkout_email')).toBe('');
    expect(sessionStorage.getItem('checkout_nombre')).toBe('');
  });

  test('un respaldo dañado no rompe', () => {
    sessionStorage.setItem('checkout_respaldo', '{no es json');
    expect(hayRespaldo()).toBe(false);
    expect(restaurarCheckout()).toBeNull();
  });
});

describe('pedidos reemplazados', () => {
  test('lo marcado se reconoce y lo demás no', () => {
    expect(fueReemplazado('p1')).toBe(false);
    marcarReemplazado('p1');
    expect(fueReemplazado('p1')).toBe(true);
    expect(fueReemplazado('p2')).toBe(false);
  });

  test('guarda solo los últimos 20', () => {
    for (let i = 1; i <= 25; i += 1) marcarReemplazado(`p${i}`);
    expect(fueReemplazado('p1')).toBe(false);
    expect(fueReemplazado('p5')).toBe(false);
    expect(fueReemplazado('p6')).toBe(true);
    expect(fueReemplazado('p25')).toBe(true);
  });

  test('una lista dañada no rompe', () => {
    sessionStorage.setItem('pedidos_reemplazados', 'xx');
    expect(fueReemplazado('p1')).toBe(false);
    expect(() => marcarReemplazado('p1')).not.toThrow();
  });
});

describe('cipPendiente', () => {
  const base = { metodoPago: 'efectivo', estado: 'procesando_pago', codigoPago: '123456789012' };

  test('PagoEfectivo con código y sin pagar', () => {
    expect(cipPendiente(base)).toBe(true);
    expect(cipPendiente({ ...base, estado: 'verificando_pago' })).toBe(true);
  });

  test('sin código no hay nada que pagar', () => {
    expect(cipPendiente({ ...base, codigoPago: '' })).toBe(false);
    expect(cipPendiente({ ...base, codigoPago: undefined })).toBe(false);
  });

  test('ya pagado, enviado o cancelado no está pendiente', () => {
    ['pendiente_envio', 'enviado', 'entregado', 'cancelado'].forEach((estado) => {
      expect(cipPendiente({ ...base, estado })).toBe(false);
    });
  });

  test('otros métodos no tienen CIP', () => {
    ['yape', 'tarjeta', 'yape-codigo'].forEach((metodoPago) => {
      expect(cipPendiente({ ...base, metodoPago })).toBe(false);
    });
  });

  test('sin pedido devuelve false', () => {
    expect(cipPendiente(null)).toBe(false);
    expect(cipPendiente(undefined)).toBe(false);
  });
});

describe('venceCIP', () => {
  // 26 de octubre de 2026, 15:00 UTC = 10:00 en Lima
  const MEDIODIA = Date.UTC(2026, 9, 26, 15, 0, 0) / 1000;

  afterEach(() => jest.restoreAllMocks());

  test('valores que no son una fecha dan null', () => {
    [0, -5, null, undefined, '', 'abc', NaN].forEach((v) => expect(venceCIP(v, 'es')).toBeNull());
  });

  test('la hora sale en hora de Lima', () => {
    const { texto } = venceCIP(MEDIODIA, 'es');
    expect(texto).toMatch(/26/);
    expect(texto).toMatch(/octubre/i);
    expect(texto).toMatch(/10:00/);
  });

  test('pasada la medianoche UTC todavía es el día anterior en Lima', () => {
    const noche = Date.UTC(2026, 9, 27, 3, 30, 0) / 1000;
    const { texto } = venceCIP(noche, 'es');
    expect(texto).toMatch(/26/);
    expect(texto).not.toMatch(/27/);
    expect(texto).toMatch(/10:30/);
  });

  test('en inglés cambia el idioma y no la hora', () => {
    const { texto } = venceCIP(MEDIODIA, 'en');
    expect(texto).toMatch(/October/);
    expect(texto).toMatch(/10:00/);
  });

  test('acepta los segundos como texto', () => {
    expect(venceCIP(String(MEDIODIA), 'es').texto).toMatch(/10:00/);
  });

  test('vigente y vencido según el reloj', () => {
    jest.spyOn(Date, 'now').mockReturnValue(MEDIODIA * 1000 - 60_000);
    expect(venceCIP(MEDIODIA, 'es').vencido).toBe(false);
    Date.now.mockReturnValue(MEDIODIA * 1000 + 60_000);
    expect(venceCIP(MEDIODIA, 'es').vencido).toBe(true);
  });
});

describe('ajustarCarrito', () => {
  const item = (extra = {}) => ({
    id: 'p1', nombre: 'Daypack', nombreEn: 'Daypack EN', precio: 100, moneda: 'S/',
    imagenMochila: 'foto.jpg', stock: 5, cantidad: 2, ...extra,
  });
  const catalogo = (extra = {}) => ({ id: 'p1', nombre: 'Daypack', nombreEn: 'Daypack EN', precio: 100, moneda: 'S/', imagenMochila: 'foto.jpg', stock: 5, ...extra });
  const ajustar = (items, frescos) => ajustarCarrito(items, new Map(frescos));

  test('sin cambios deja el mismo carrito y no avisa', () => {
    const items = [item()];
    const r = ajustar(items, [['p1', catalogo()]]);
    expect(r.cambio).toBe(false);
    expect(r.avisos).toEqual([]);
    expect(r.items[0]).toBe(items[0]);
  });

  test('un producto que no se pudo leer se deja como está', () => {
    const items = [item()];
    const r = ajustar(items, []);
    expect(r.cambio).toBe(false);
    expect(r.avisos).toEqual([]);
    expect(r.items).toEqual(items);
  });

  test('sube el precio: se actualiza y avisa con el antes y el ahora', () => {
    const r = ajustar([item()], [['p1', catalogo({ precio: 120 })]]);
    expect(r.cambio).toBe(true);
    expect(r.items[0].precio).toBe(120);
    expect(r.avisos).toEqual([expect.objectContaining({ tipo: 'precio', id: 'p1', antes: 100, ahora: 120, moneda: 'S/' })]);
  });

  test('baja el precio: también avisa', () => {
    const r = ajustar([item()], [['p1', catalogo({ precio: 80 })]]);
    expect(r.items[0].precio).toBe(80);
    expect(r.avisos[0]).toMatchObject({ tipo: 'precio', antes: 100, ahora: 80 });
  });

  test('el precio llega como texto y vale lo mismo: no avisa', () => {
    const r = ajustar([item()], [['p1', catalogo({ precio: '100' })]]);
    expect(r.avisos).toEqual([]);
  });

  test('precio con decimales', () => {
    const r = ajustar([item({ precio: 7 })], [['p1', catalogo({ precio: 7.5 })]]);
    expect(r.items[0].precio).toBe(7.5);
    expect(r.avisos[0]).toMatchObject({ tipo: 'precio', antes: 7, ahora: 7.5 });
  });

  test('baja el stock por debajo de lo pedido: recorta la cantidad y avisa', () => {
    const r = ajustar([item({ cantidad: 3 })], [['p1', catalogo({ stock: 1 })]]);
    expect(r.cambio).toBe(true);
    expect(r.items[0]).toMatchObject({ cantidad: 1, stock: 1 });
    expect(r.avisos).toEqual([expect.objectContaining({ tipo: 'stock', stock: 1 })]);
  });

  test('el stock baja pero alcanza para lo pedido: actualiza el stock y no avisa', () => {
    const r = ajustar([item({ cantidad: 2 })], [['p1', catalogo({ stock: 3 })]]);
    expect(r.cambio).toBe(true);
    expect(r.items[0]).toMatchObject({ cantidad: 2, stock: 3 });
    expect(r.avisos).toEqual([]);
  });

  test('stock en cero: se quita y avisa que se agotó', () => {
    const r = ajustar([item()], [['p1', catalogo({ stock: 0 })]]);
    expect(r.cambio).toBe(true);
    expect(r.items).toEqual([]);
    expect(r.avisos).toEqual([expect.objectContaining({ tipo: 'agotado', id: 'p1', nombre: 'Daypack' })]);
  });

  test('stock negativo cuenta como agotado', () => {
    const r = ajustar([item()], [['p1', catalogo({ stock: -2 })]]);
    expect(r.items).toEqual([]);
    expect(r.avisos[0].tipo).toBe('agotado');
  });

  test('stock roto o vacío cuenta como agotado', () => {
    ['', 'abc', NaN].forEach((stock) => {
      const r = ajustar([item()], [['p1', catalogo({ stock })]]);
      expect(r.items).toEqual([]);
      expect(r.avisos[0].tipo).toBe('agotado');
    });
  });

  test('sin stock cargado se vende como siempre (99)', () => {
    const sinStock = catalogo();
    delete sinStock.stock;
    const r = ajustar([item({ cantidad: 4 })], [['p1', sinStock]]);
    expect(r.items[0]).toMatchObject({ cantidad: 4, stock: 99 });
    expect(r.avisos).toEqual([]);
  });

  test('stock como texto numérico', () => {
    const r = ajustar([item({ cantidad: 3 })], [['p1', catalogo({ stock: '2' })]]);
    expect(r.items[0]).toMatchObject({ cantidad: 2, stock: 2 });
    expect(r.avisos[0].tipo).toBe('stock');
  });

  test('producto borrado (null): se quita como "quitado"', () => {
    const r = ajustar([item()], [['p1', null]]);
    expect(r.cambio).toBe(true);
    expect(r.items).toEqual([]);
    expect(r.avisos).toEqual([expect.objectContaining({ tipo: 'quitado', id: 'p1' })]);
  });

  test('producto inactivo (borrador): se quita como "quitado", aunque tenga stock', () => {
    const r = ajustar([item()], [['p1', catalogo({ activo: false })]]);
    expect(r.items).toEqual([]);
    expect(r.avisos[0].tipo).toBe('quitado');
  });

  test('inactivo y sin stock: "quitado", no "agotado"', () => {
    const r = ajustar([item()], [['p1', catalogo({ activo: false, stock: 0 })]]);
    expect(r.avisos[0].tipo).toBe('quitado');
  });

  test('activo explícito en true se vende normal', () => {
    const r = ajustar([item()], [['p1', catalogo({ activo: true })]]);
    expect(r.avisos).toEqual([]);
    expect(r.items).toHaveLength(1);
  });

  test('precio inválido en el catálogo: se quita como "quitado"', () => {
    [0, -5, '', 'gratis', null, undefined].forEach((precio) => {
      const r = ajustar([item()], [['p1', catalogo({ precio })]]);
      expect(r.items).toEqual([]);
      expect(r.avisos).toEqual([expect.objectContaining({ tipo: 'quitado' })]);
    });
  });

  test('cambian precio y stock a la vez: dos avisos', () => {
    const r = ajustar([item({ cantidad: 4 })], [['p1', catalogo({ precio: 90, stock: 2 })]]);
    expect(r.items[0]).toMatchObject({ precio: 90, cantidad: 2, stock: 2 });
    expect(r.avisos.map((a) => a.tipo)).toEqual(['stock', 'precio']);
  });

  test('toma el nombre, la foto y la moneda nuevos', () => {
    const r = ajustar([item()], [['p1', catalogo({ nombre: 'Daypack 2', nombreEn: 'Daypack 2 EN', imagenMochila: 'nueva.jpg', moneda: 'USD' })]]);
    expect(r.cambio).toBe(true);
    expect(r.items[0]).toMatchObject({ nombre: 'Daypack 2', nombreEn: 'Daypack 2 EN', imagenMochila: 'nueva.jpg', moneda: 'USD' });
    expect(r.avisos).toEqual([]);
  });

  test('si el catálogo no trae nombre ni foto conserva los del carrito', () => {
    const r = ajustar([item()], [['p1', catalogo({ nombre: '', imagenMochila: '' })]]);
    expect(r.items[0]).toMatchObject({ nombre: 'Daypack', imagenMochila: 'foto.jpg' });
  });

  test('varios productos: se ajusta cada uno por su cuenta', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' }), item({ id: 'd' })];
    const r = ajustar(items, [
      ['a', catalogo({ id: 'a', precio: 130 })],
      ['b', null],
      ['c', catalogo({ id: 'c' })],
    ]);
    expect(r.items.map((i) => i.id)).toEqual(['a', 'c', 'd']);
    expect(r.items[0].precio).toBe(130);
    expect(r.items[1]).toBe(items[2]);
    expect(r.items[2]).toBe(items[3]);
    expect(r.avisos.map((a) => [a.id, a.tipo])).toEqual([['a', 'precio'], ['b', 'quitado']]);
  });

  test('no modifica el carrito que recibe', () => {
    const items = [item()];
    const copia = JSON.parse(JSON.stringify(items));
    ajustar(items, [['p1', catalogo({ precio: 120, stock: 1 })]]);
    expect(items).toEqual(copia);
  });

  test('el aviso conserva el nombre del carrito aunque el catálogo lo cambie', () => {
    const r = ajustar([item({ nombre: 'Viejo' })], [['p1', catalogo({ nombre: 'Nuevo', precio: 120 })]]);
    expect(r.avisos[0].nombre).toBe('Viejo');
    expect(r.items[0].nombre).toBe('Nuevo');
  });
});
