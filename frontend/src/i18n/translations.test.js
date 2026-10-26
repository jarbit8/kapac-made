import fs from 'fs';
import path from 'path';
import translations from './translations';

const { es, en } = translations;
const SRC = path.join(__dirname, '..');

function archivos(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) return archivos(ruta);
    return /\.(js|jsx)$/.test(e.name) && !/\.test\.js$/.test(e.name) ? [ruta] : [];
  });
}

const marcadores = (texto) => [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('traducciones', () => {
  test('español e inglés tienen exactamente las mismas claves', () => {
    const soloEs = Object.keys(es).filter((k) => !(k in en));
    const soloEn = Object.keys(en).filter((k) => !(k in es));
    expect({ soloEs, soloEn }).toEqual({ soloEs: [], soloEn: [] });
  });

  test('ningún texto está vacío', () => {
    const vacios = [...Object.entries(es).map(([k, v]) => ['es', k, v]), ...Object.entries(en).map(([k, v]) => ['en', k, v])]
      .filter(([, , v]) => typeof v !== 'string' || !v.trim())
      .map(([idioma, k]) => `${idioma}:${k}`);
    expect(vacios).toEqual([]);
  });

  test('los marcadores {n} {antes} ... son los mismos en los dos idiomas', () => {
    const distintos = Object.keys(es)
      .filter((k) => en[k] && marcadores(es[k]).join() !== marcadores(en[k]).join())
      .map((k) => `${k}: ${marcadores(es[k])} / ${marcadores(en[k])}`);
    expect(distintos).toEqual([]);
  });

  test('las claves tienen forma area.nombre', () => {
    const raras = Object.keys(es).filter((k) => !/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(k));
    expect(raras).toEqual([]);
  });

  test('el inglés no quedó copiado del español en las frases largas', () => {
    const iguales = Object.keys(es).filter((k) => es[k].length > 40 && es[k] === en[k]);
    expect(iguales).toEqual([]);
  });

  test('toda clave que la página pide con t("...") existe en los dos idiomas', () => {
    const usadas = new Map();
    archivos(SRC).filter((f) => !f.endsWith('translations.js')).forEach((f) => {
      const texto = fs.readFileSync(f, 'utf8');
      for (const [, clave] of texto.matchAll(/(?<![\w.$])t\(\s*['"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)['"]/g)) {
        if (!usadas.has(clave)) usadas.set(clave, path.relative(SRC, f));
      }
    });
    expect(usadas.size).toBeGreaterThan(50);
    const faltan = [...usadas].filter(([clave]) => !(clave in es) || !(clave in en)).map(([clave, f]) => `${clave} (${f})`);
    expect(faltan).toEqual([]);
  });
});
