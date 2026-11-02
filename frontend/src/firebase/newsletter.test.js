import { pedirCodigo, confirmarCodigo } from './newsletter';

const respuesta = (cuerpo, ok = true) => ({ ok, json: async () => cuerpo });

beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(() => { delete global.fetch; });

describe('pedirCodigo', () => {
  test('un correo mal escrito se rechaza sin llamar al servidor', async () => {
    for (const malo of ['', '   ', 'sin-arroba', 'a@b', 'a b@c.com', 'a@@b.com', null, undefined]) {
      expect(await pedirCodigo(malo)).toEqual({ ok: false, error: 'correo' });
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('manda el correo limpio y en minúsculas a enviarCodigoNewsletter por POST', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: true }));
    await pedirCodigo('  Ana.Quispe@Ejemplo.COM ');
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('https://us-central1-kapac-made.cloudfunctions.net/enviarCodigoNewsletter');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opciones.body)).toEqual({ email: 'ana.quispe@ejemplo.com' });
  });

  test('si el servidor acepta, devuelve ok y si el correo ya estaba suscrito', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: true }));
    expect(await pedirCodigo('a@b.com')).toEqual({ ok: true, yaExistia: false });
    global.fetch.mockResolvedValue(respuesta({ ok: true, yaExistia: true }));
    expect(await pedirCodigo('a@b.com')).toEqual({ ok: true, yaExistia: true });
  });

  test('si el servidor rechaza, devuelve su mensaje', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: false, mensaje: 'Espera un minuto.' }, false));
    expect(await pedirCodigo('a@b.com')).toEqual({ ok: false, mensaje: 'Espera un minuto.' });
  });

  test('un 200 sin ok:true no cuenta como éxito', async () => {
    global.fetch.mockResolvedValue(respuesta({ mensaje: 'raro' }, true));
    expect(await pedirCodigo('a@b.com')).toEqual({ ok: false, mensaje: 'raro' });
  });

  test('una respuesta que no es JSON no rompe: ok:false sin mensaje', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => { throw new Error('no es json'); } });
    expect(await pedirCodigo('a@b.com')).toEqual({ ok: false, mensaje: undefined });
  });

  test('sin conexión devuelve error "conexion" (el Footer lo traduce)', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await pedirCodigo('a@b.com')).toEqual({ ok: false, error: 'conexion' });
  });
});

describe('confirmarCodigo', () => {
  test('sin código no llama al servidor', async () => {
    for (const vacio of ['', '   ', null, undefined]) {
      expect(await confirmarCodigo('a@b.com', vacio)).toEqual({ ok: false, error: 'codigo_vacio' });
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('manda correo en minúsculas y código sin espacios a verificarCodigoNewsletter', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: true }));
    expect(await confirmarCodigo(' A@B.com ', ' 123456 ')).toEqual({ ok: true });
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('https://us-central1-kapac-made.cloudfunctions.net/verificarCodigoNewsletter');
    expect(JSON.parse(opciones.body)).toEqual({ email: 'a@b.com', codigo: '123456' });
  });

  test('un código incorrecto devuelve el mensaje del servidor', async () => {
    global.fetch.mockResolvedValue(respuesta({ ok: false, mensaje: 'Código incorrecto.' }, false));
    expect(await confirmarCodigo('a@b.com', '000000')).toEqual({ ok: false, mensaje: 'Código incorrecto.' });
  });

  test('sin conexión devuelve error "conexion"', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await confirmarCodigo('a@b.com', '123456')).toEqual({ ok: false, error: 'conexion' });
  });
});
