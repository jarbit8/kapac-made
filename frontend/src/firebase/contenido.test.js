const CLAVE = 'kapac_contenido_v1';

// El módulo guarda lo último leído a nivel de módulo: cada prueba lo carga limpio
function cargar({ local, ventana } = {}) {
  localStorage.clear();
  delete window.__CONTENIDO__;
  if (local !== undefined) localStorage.setItem(CLAVE, typeof local === 'string' ? local : JSON.stringify(local));
  if (ventana) window.__CONTENIDO__ = ventana;
  let r;
  jest.isolateModules(() => {
    jest.doMock('./config', () => ({ db: {} }));
    jest.doMock('firebase/firestore', () => ({
      doc: jest.fn((db, coleccion, id) => ({ coleccion, id })), getDoc: jest.fn(), updateDoc: jest.fn(),
    }));
    r = { m: require('./contenido'), fs: require('firebase/firestore') };
  });
  return r;
}

const leerDoc = (fs, datos) => fs.getDoc.mockResolvedValue({ exists: () => datos !== undefined, data: () => datos });

afterEach(() => { localStorage.clear(); delete window.__CONTENIDO__; });

describe('normalizarMedio', () => {
  test('un texto es un video (formato viejo)', () => {
    const { m } = cargar();
    expect(m.normalizarMedio('https://x/v.mp4')).toEqual({ tipo: 'video', url: 'https://x/v.mp4' });
  });
  test('un objeto con url se deja igual y uno sin url es null', () => {
    const { m } = cargar();
    const o = { tipo: 'imagen', url: 'https://x/a.jpg' };
    expect(m.normalizarMedio(o)).toBe(o);
    expect(m.normalizarMedio({ tipo: 'imagen', url: '' })).toBeNull();
    expect(m.normalizarMedio({})).toBeNull();
  });
  test('vacío, null o undefined es null', () => {
    const { m } = cargar();
    expect(m.normalizarMedio(null)).toBeNull();
    expect(m.normalizarMedio(undefined)).toBeNull();
    expect(m.normalizarMedio('')).toBeNull();
  });
});

describe('medioDispositivo', () => {
  const pc = { tipo: 'video', url: 'pc.mp4' };
  const mobile = { tipo: 'imagen', url: 'm.jpg' };

  test('cada dispositivo recibe su medio', () => {
    const { m } = cargar();
    expect(m.medioDispositivo({ pc, mobile }, false)).toBe(pc);
    expect(m.medioDispositivo({ pc, mobile }, true)).toBe(mobile);
  });
  test('si falta el del celular usa el de la PC y al revés', () => {
    const { m } = cargar();
    expect(m.medioDispositivo({ pc, mobile: null }, true)).toBe(pc);
    expect(m.medioDispositivo({ pc: null, mobile }, false)).toBe(mobile);
  });
  test('sin ningún medio devuelve null (se usan los videos del proyecto)', () => {
    const { m } = cargar();
    expect(m.medioDispositivo({ pc: null, mobile: null }, false)).toBeNull();
    expect(m.medioDispositivo(null, false)).toBeNull();
    expect(m.medioDispositivo(undefined, true)).toBeNull();
    expect(m.medioDispositivo({}, true)).toBeNull();
  });
  test('formato viejo: un solo objeto {tipo,url} o un texto vale para los dos', () => {
    const { m } = cargar();
    expect(m.medioDispositivo({ tipo: 'imagen', url: 'a.jpg' }, true)).toEqual({ tipo: 'imagen', url: 'a.jpg' });
    expect(m.medioDispositivo('v.mp4', false)).toEqual({ tipo: 'video', url: 'v.mp4' });
  });
  test('los slots pc/mobile ganan sobre un url viejo que quedó pegado por el merge', () => {
    const { m } = cargar();
    const r = m.medioDispositivo({ url: 'viejo.jpg', tipo: 'imagen', pc, mobile: null }, false);
    expect(r).toBe(pc);
  });
  test('un slot guardado como texto se toma como video', () => {
    const { m } = cargar();
    expect(m.medioDispositivo({ pc: 'a.mp4' }, false)).toEqual({ tipo: 'video', url: 'a.mp4' });
  });
});

describe('urlDispositivo', () => {
  test('devuelve solo la URL según el dispositivo', () => {
    const { m } = cargar();
    const cfg = { pc: { url: 'pc.jpg' }, mobile: { url: 'm.jpg' } };
    expect(m.urlDispositivo(cfg, false)).toBe('pc.jpg');
    expect(m.urlDispositivo(cfg, true)).toBe('m.jpg');
  });
  test('acepta texto en los slots, texto suelto y el formato viejo { url }', () => {
    const { m } = cargar();
    expect(m.urlDispositivo({ pc: 'a.jpg' }, true)).toBe('a.jpg');
    expect(m.urlDispositivo('b.jpg', false)).toBe('b.jpg');
    expect(m.urlDispositivo({ url: 'c.jpg' }, false)).toBe('c.jpg');
  });
  test('sin nada devuelve cadena vacía, nunca undefined', () => {
    const { m } = cargar();
    expect(m.urlDispositivo(null, false)).toBe('');
    expect(m.urlDispositivo({}, false)).toBe('');
    expect(m.urlDispositivo({ pc: {}, mobile: null }, false)).toBe('');
  });
});

describe('slotMedio', () => {
  test('lee el slot pc o mobile para el panel', () => {
    const { m } = cargar();
    const cfg = { pc: { tipo: 'imagen', url: 'p.jpg' }, mobile: { tipo: 'video', url: 'm.mp4' } };
    expect(m.slotMedio(cfg, 'pc')).toEqual({ tipo: 'imagen', url: 'p.jpg' });
    expect(m.slotMedio(cfg, 'mobile')).toEqual({ tipo: 'video', url: 'm.mp4' });
  });
  test('un slot vacío es null (no hereda del otro: el panel muestra "sin medio")', () => {
    const { m } = cargar();
    expect(m.slotMedio({ pc: { url: 'p.jpg' }, mobile: null }, 'mobile')).toBeNull();
  });
  test('formato viejo: el medio único se muestra solo en el slot de la PC', () => {
    const { m } = cargar();
    expect(m.slotMedio({ tipo: 'imagen', url: 'a.jpg' }, 'pc')).toEqual({ tipo: 'imagen', url: 'a.jpg' });
    expect(m.slotMedio({ tipo: 'imagen', url: 'a.jpg' }, 'mobile')).toBeNull();
    expect(m.slotMedio('a.jpg', 'pc')).toEqual({ tipo: 'imagen', url: 'a.jpg' });
    expect(m.slotMedio('a.jpg', 'mobile')).toBeNull();
  });
  test('sin configuración es null', () => {
    const { m } = cargar();
    expect(m.slotMedio(null, 'pc')).toBeNull();
    expect(m.slotMedio({}, 'pc')).toBeNull();
  });
});

describe('obtenerContenido', () => {
  test('con el documento inexistente devuelve los valores de fábrica, tienda ABIERTA', async () => {
    const { m, fs } = cargar();
    leerDoc(fs, undefined);
    const c = await m.obtenerContenido();
    expect(c.cerrado).toBe(false);
    expect(c.homeFotos).toEqual(['foto1', 'foto2', 'foto3', 'foto4']);
    expect(c.galeriaProducto).toHaveLength(4);
    expect(c.acento).toBe(m.ACENTO_DEFAULT);
    expect(c.inTheZoneFoto).toBe(m.IN_THE_ZONE_DEFAULT);
    expect(c.heroVideo).toEqual({ pc: null, mobile: null });
    expect(c.footerFondo.tipo).toBe('imagen');
    expect(c.almaFotos).toEqual([]);
    expect(c.infoExtra).toEqual([]);
    expect(c.infoOcultos).toEqual([]);
  });

  test('la tienda solo se cierra con true exacto (no con "true", 1 ni un valor raro)', async () => {
    for (const [valor, esperado] of [[true, true], ['true', false], [1, false], [null, false], [false, false]]) {
      const { m, fs } = cargar();
      leerDoc(fs, { cerrado: valor });
      expect((await m.obtenerContenido()).cerrado).toBe(esperado);
    }
  });

  test('una lista guardada vacía vuelve a la de fábrica, salvo las que pueden estar vacías', async () => {
    const { m, fs } = cargar();
    leerDoc(fs, { homeFotos: [], galeriaProducto: [], b2bBeneficios: [], almaBloques: [], almaFotos: [], infoExtra: [] });
    const c = await m.obtenerContenido();
    expect(c.homeFotos).toHaveLength(4);
    expect(c.galeriaProducto).toHaveLength(4);
    expect(c.b2bBeneficios).toHaveLength(4);
    expect(c.almaBloques).toHaveLength(3);
    expect(c.almaFotos).toEqual([]);
    expect(c.infoExtra).toEqual([]);
  });

  test('lo guardado por el admin gana sobre lo de fábrica', async () => {
    const { m, fs } = cargar();
    leerDoc(fs, {
      homeFotos: ['a', 'b'], acento: '#123456', logo: 'logo.png', fondo: '#000000', texto: '#ffffff',
      almaFotos: ['x.jpg'], infoOcultos: ['envios'], cerrado: true,
      footerFondo: { tipo: 'video', url: 'f.mp4' }, heroVideo: { pc: { tipo: 'video', url: 'h.mp4' }, mobile: null },
    });
    const c = await m.obtenerContenido();
    expect(c).toMatchObject({
      homeFotos: ['a', 'b'], acento: '#123456', logo: 'logo.png', fondo: '#000000', texto: '#ffffff',
      almaFotos: ['x.jpg'], infoOcultos: ['envios'], cerrado: true,
      footerFondo: { tipo: 'video', url: 'f.mp4' },
    });
    expect(c.heroVideo.pc.url).toBe('h.mp4');
  });

  test('un footerFondo sin ninguna url vuelve al de fábrica; con url solo en el slot del celular se respeta', async () => {
    let r = cargar();
    leerDoc(r.fs, { footerFondo: { tipo: 'imagen', url: '' } });
    expect((await r.m.obtenerContenido()).footerFondo.url).toContain('unsplash');
    r = cargar();
    leerDoc(r.fs, { footerFondo: { mobile: { tipo: 'imagen', url: 'm.jpg' } } });
    expect((await r.m.obtenerContenido()).footerFondo.mobile.url).toBe('m.jpg');
  });

  test('guarda lo leído para la próxima visita y lo deja disponible al instante', async () => {
    const { m, fs } = cargar();
    expect(m.contenidoGuardado()).toBeNull();
    leerDoc(fs, { cerrado: true });
    const c = await m.obtenerContenido();
    expect(m.contenidoGuardado()).toBe(c);
    expect(JSON.parse(localStorage.getItem(CLAVE)).cerrado).toBe(true);
  });

  test('si Firestore falla lanza el error y NO toca lo guardado (no abre una tienda cerrada)', async () => {
    const { m, fs } = cargar({ local: { cerrado: true, acento: '#111111' } });
    fs.getDoc.mockRejectedValue(new Error('unavailable'));
    await expect(m.obtenerContenido()).rejects.toThrow('unavailable');
    expect(m.contenidoGuardado().cerrado).toBe(true);
    expect(JSON.parse(localStorage.getItem(CLAVE)).cerrado).toBe(true);
  });
});

describe('lo guardado de la visita anterior', () => {
  test('usa lo del navegador si lo hay', () => {
    const { m } = cargar({ local: { cerrado: true } });
    expect(m.contenidoGuardado()).toEqual({ cerrado: true });
  });

  test('un JSON roto en el navegador se ignora y se usa lo publicado', () => {
    const { m } = cargar({ local: '{roto', ventana: { sitio: { cerrado: true, acento: '#abcdef' } } });
    expect(m.contenidoGuardado().cerrado).toBe(true);
    expect(m.contenidoGuardado().acento).toBe('#abcdef');
    expect(m.contenidoGuardado().homeFotos).toEqual(['foto1', 'foto2', 'foto3', 'foto4']);
  });

  test('lo del navegador gana sobre lo publicado', () => {
    const { m } = cargar({ local: { cerrado: false }, ventana: { sitio: { cerrado: true } } });
    expect(m.contenidoGuardado().cerrado).toBe(false);
  });

  test('primera visita sin nada guardado ni publicado: null', () => {
    expect(cargar().m.contenidoGuardado()).toBeNull();
    expect(cargar({ ventana: {} }).m.contenidoGuardado()).toBeNull();
  });
});

describe('guardarContenido', () => {
  test('escribe solo los campos que cambiaron respecto de "anterior"', async () => {
    const { m, fs } = cargar();
    fs.updateDoc.mockResolvedValue();
    await m.guardarContenido({ acento: '#fff', logo: 'a', cerrado: false }, { acento: '#000', logo: 'a', cerrado: false });
    expect(fs.updateDoc).toHaveBeenCalledTimes(1);
    expect(fs.updateDoc).toHaveBeenCalledWith({ coleccion: 'contenido', id: 'sitio' }, { acento: '#fff' });
  });

  test('compara listas y objetos por contenido, no por referencia', async () => {
    const { m, fs } = cargar();
    fs.updateDoc.mockResolvedValue();
    await m.guardarContenido(
      { homeFotos: ['a', 'b'], heroVideo: { pc: null, mobile: null }, almaFotos: ['x', 'y'] },
      { homeFotos: ['a', 'b'], heroVideo: { pc: null, mobile: null }, almaFotos: ['x'] },
    );
    expect(fs.updateDoc.mock.calls[0][1]).toEqual({ almaFotos: ['x', 'y'] });
  });

  test('si nada cambió no escribe en Firestore', async () => {
    const { m, fs } = cargar();
    await m.guardarContenido({ acento: '#fff' }, { acento: '#fff' });
    expect(fs.updateDoc).not.toHaveBeenCalled();
  });

  test('una página abierta hace rato no pisa lo que se cambió desde otra: solo manda lo que ella tocó', async () => {
    const { m, fs } = cargar();
    fs.updateDoc.mockResolvedValue();
    const copiaVieja = { cerrado: true, acento: '#000' };
    await m.guardarContenido({ cerrado: true, acento: '#fff' }, copiaVieja);
    expect(Object.keys(fs.updateDoc.mock.calls[0][1])).toEqual(['acento']);
  });

  test('un campo nuevo cuenta como cambio aunque "anterior" no lo tenga', async () => {
    const { m, fs } = cargar();
    fs.updateDoc.mockResolvedValue();
    await m.guardarContenido({ logo: 'a.png' });
    expect(fs.updateDoc.mock.calls[0][1]).toEqual({ logo: 'a.png' });
  });

  test('tras guardar actualiza la copia recordada sin perder los otros campos', async () => {
    const { m, fs } = cargar({ local: { cerrado: true, acento: '#000' } });
    fs.updateDoc.mockResolvedValue();
    await m.guardarContenido({ acento: '#fff' }, { acento: '#000' });
    expect(m.contenidoGuardado()).toEqual({ cerrado: true, acento: '#fff' });
    expect(JSON.parse(localStorage.getItem(CLAVE))).toEqual({ cerrado: true, acento: '#fff' });
  });

  test('si Firestore rechaza el cambio lanza el error y la copia recordada queda igual', async () => {
    const { m, fs } = cargar({ local: { acento: '#000' } });
    fs.updateDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(m.guardarContenido({ acento: '#fff' }, { acento: '#000' })).rejects.toThrow('permission-denied');
    expect(m.contenidoGuardado()).toEqual({ acento: '#000' });
  });
});

describe('cambiarContenido', () => {
  test('parte de lo último de Firestore, no de la copia de la página, y solo escribe lo que cambia', async () => {
    const { m, fs } = cargar({ local: { cerrado: true } });
    leerDoc(fs, { cerrado: false, acento: '#222222' });
    fs.updateDoc.mockResolvedValue();
    const r = await m.cambiarContenido((base) => ({ cerrado: !base.cerrado }));
    expect(fs.updateDoc).toHaveBeenCalledTimes(1);
    expect(fs.updateDoc.mock.calls[0][1]).toEqual({ cerrado: true });
    expect(r.cerrado).toBe(true);
    expect(r.acento).toBe('#222222');
  });

  test('abrir y cerrar la tienda desde cero parte de la tienda abierta', async () => {
    const { m, fs } = cargar();
    leerDoc(fs, undefined);
    fs.updateDoc.mockResolvedValue();
    const r = await m.cambiarContenido((base) => ({ cerrado: !base.cerrado }));
    expect(r.cerrado).toBe(true);
  });

  test('si no se puede leer Firestore no escribe nada', async () => {
    const { m, fs } = cargar();
    fs.getDoc.mockRejectedValue(new Error('unavailable'));
    await expect(m.cambiarContenido(() => ({ cerrado: true }))).rejects.toThrow('unavailable');
    expect(fs.updateDoc).not.toHaveBeenCalled();
  });
});
