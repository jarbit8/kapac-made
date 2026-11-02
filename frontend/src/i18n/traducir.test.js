// La memoria de traducciones vive a nivel de módulo: cada prueba lo carga limpio
function cargar() {
  let traducirEsEn;
  jest.isolateModules(() => { ({ traducirEsEn } = require('./traducir')); });
  return traducirEsEn;
}

const google = (...segmentos) => ({ ok: true, json: async () => [segmentos.map((s) => [s, 'origen'])] });
const myMemory = (texto, estado = 200) => ({ ok: true, json: async () => ({ responseData: { translatedText: texto }, responseStatus: estado }) });
const urls = () => global.fetch.mock.calls.map(([u]) => u);

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});
afterEach(() => { delete global.fetch; localStorage.clear(); });

describe('traducirEsEn', () => {
  test('un texto vacío o solo espacios da cadena vacía sin llamar a nadie', async () => {
    const traducir = cargar();
    expect(await traducir('')).toBe('');
    expect(await traducir('   ')).toBe('');
    expect(await traducir(null)).toBe('');
    expect(await traducir(undefined)).toBe('');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('usa Google primero y une los segmentos de la respuesta', async () => {
    const traducir = cargar();
    global.fetch.mockResolvedValue(google('Hello. ', 'How are you?'));
    expect(await traducir('Hola. ¿Cómo estás?')).toBe('Hello. How are you?');
    expect(urls()).toHaveLength(1);
    expect(urls()[0]).toContain('translate.googleapis.com');
    expect(urls()[0]).toContain('sl=es&tl=en');
  });

  test('el texto va codificado en la URL: & # ? no cortan la consulta ni la alteran', async () => {
    const traducir = cargar();
    global.fetch.mockResolvedValue(google('x'));
    await traducir('Mochilas & carpas #1 ¿ya?');
    expect(urls()[0]).toContain('q=' + encodeURIComponent('Mochilas & carpas #1 ¿ya?'));
  });

  test('guarda el resultado: la segunda vez no llama a la red, ni siquiera tras recargar la página', async () => {
    let traducir = cargar();
    global.fetch.mockResolvedValue(google('Backpack'));
    expect(await traducir('Mochila')).toBe('Backpack');
    expect(await traducir('Mochila')).toBe('Backpack');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('tr:Mochila')).toBe('Backpack');

    traducir = cargar(); // página nueva: memoria vacía, localStorage intacto
    expect(await traducir('Mochila')).toBe('Backpack');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('el texto se recorta antes de traducir y de usar la caché', async () => {
    const traducir = cargar();
    global.fetch.mockResolvedValue(google('Backpack'));
    await traducir('  Mochila  ');
    expect(localStorage.getItem('tr:Mochila')).toBe('Backpack');
    expect(await traducir('Mochila')).toBe('Backpack');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('si Google responde con error pasa a MyMemory', async () => {
    const traducir = cargar();
    global.fetch
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce(myMemory('Backpack'));
    expect(await traducir('Mochila')).toBe('Backpack');
    expect(urls()[1]).toContain('api.mymemory.translated.net');
    expect(urls()[1]).toContain('langpair=es|en');
  });

  test('si Google no responde (sin red o bloqueado) pasa a MyMemory', async () => {
    const traducir = cargar();
    global.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(myMemory('Tent'));
    expect(await traducir('Carpa')).toBe('Tent');
  });

  test('si Google devuelve una traducción vacía pasa a MyMemory', async () => {
    const traducir = cargar();
    global.fetch
      .mockResolvedValueOnce(google('', '  '))
      .mockResolvedValueOnce(myMemory('Tent'));
    expect(await traducir('Carpa')).toBe('Tent');
  });

  test('si los dos fallan devuelve null (nunca el español) y no guarda nada', async () => {
    const traducir = cargar();
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await traducir('Carpa')).toBeNull();
    expect(localStorage.getItem('tr:Carpa')).toBeNull();
    // Se vuelve a intentar la próxima vez
    global.fetch.mockReset();
    global.fetch.mockResolvedValue(google('Tent'));
    expect(await traducir('Carpa')).toBe('Tent');
  });

  test('el aviso de límite de MyMemory no se toma como traducción ni se guarda', async () => {
    const traducir = cargar();
    global.fetch
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce(myMemory('MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY.'));
    expect(await traducir('Carpa')).toBeNull();
    expect(localStorage.getItem('tr:Carpa')).toBeNull();
  });

  test('MyMemory con estado distinto de 200 o sin texto no cuenta', async () => {
    const traducir = cargar();
    global.fetch
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce(myMemory('Algo', 403));
    expect(await traducir('Carpa')).toBeNull();
    global.fetch
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ responseStatus: 200 }) });
    expect(await traducir('Carpa 2')).toBeNull();
  });

  test('si localStorage no funciona (modo privado) igual traduce y recuerda en memoria', async () => {
    const traducir = cargar();
    const leer = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const escribir = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    global.fetch.mockResolvedValue(google('Backpack'));
    expect(await traducir('Mochila')).toBe('Backpack');
    expect(await traducir('Mochila')).toBe('Backpack');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    leer.mockRestore();
    escribir.mockRestore();
  });
});
