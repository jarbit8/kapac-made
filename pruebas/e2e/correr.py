"""Corre las pruebas de punta a punta contra la copia de prueba.

    python pruebas/e2e/correr.py                      todo: PC, celular 390 y 360, español e inglés
    python pruebas/e2e/correr.py --solo compra        solo los grupos o pruebas que contengan "compra"
    python pruebas/e2e/correr.py --tam pc --idioma es solo PC en español (lo más rápido)
    python pruebas/e2e/correr.py --lista              muestra las pruebas y sale

Arma la copia de prueba (o reutiliza la anterior), levanta el servidor en el puerto 6019 y reparte las
pruebas entre varios navegadores. Termina con un resumen y sale con código distinto de 0 si algo falló.
"""
import argparse
import importlib
import os
import socket
import subprocess
import sys
import time
import traceback
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))

FALLAS = Path(os.environ.get('TEMP') or '.') / 'kapac-pruebas' / 'fallas'


def cargar_casos():
    import base
    for f in sorted((AQUI / 'casos').glob('*.py')):
        if f.stem != '__init__':
            importlib.import_module(f'casos.{f.stem}')
    return base.PRUEBAS


def trabajo(grupo, tam, idioma, nombres):
    """Corre en un proceso aparte: un navegador y las pruebas de un grupo para un tamaño e idioma."""
    from playwright.sync_api import sync_playwright
    import base
    pruebas = [p for p in cargar_casos() if p.grupo == grupo and p.nombre in nombres]
    resultados = []
    with sync_playwright() as pw:
        try:
            nav = pw.chromium.launch(channel='chrome')
        except Exception:
            nav = pw.chromium.launch()
        for p in pruebas:
            ctx = base.Contexto(nav, tam, idioma)
            t0 = time.time()
            estado, mensaje = 'OK', ''
            try:
                p.funcion(ctx)
                for s in ctx.sesiones:
                    base.sin_errores(s, getattr(p, 'permitir_errores', ()))
            except AssertionError as e:
                if str(e):
                    mensaje = str(e)
                else:
                    donde = traceback.extract_tb(e.__traceback__)[-1]
                    mensaje = f'falló {Path(donde.filename).name}:{donde.lineno}  {donde.line}'
                estado = 'FALLA'
            except Exception as e:
                estado, mensaje = 'FALLA', f'{type(e).__name__}: {str(e).splitlines()[0][:300] if str(e) else ""}'
                if os.environ.get('E2E_TRAZA'):
                    traceback.print_exc()
            if estado == 'FALLA':
                for i, s in enumerate(ctx.sesiones):
                    try:
                        FALLAS.mkdir(parents=True, exist_ok=True)
                        nombre = ''.join(c if c.isalnum() else '_' for c in f'{grupo}_{p.nombre}')[:70]
                        s.pg.screenshot(path=str(FALLAS / f'{nombre}_{tam}_{idioma}_{i}.png'))
                    except Exception:
                        pass
            ctx.cerrar()
            if p.bug and estado == 'FALLA':
                estado, mensaje = 'BUG', f'{p.bug} | {mensaje}'
            elif p.bug and estado == 'OK':
                estado, mensaje = 'OK', 'ya funciona: quita la marca bug de esta prueba'
            seg = time.time() - t0
            etiqueta = {'OK': 'OK   ', 'FALLA': 'FALLA', 'BUG': 'BUG  '}[estado]
            print(f'{etiqueta} [{tam}/{idioma}] {grupo} · {p.nombre} ({seg:.1f} s)' + (f'\n        {mensaje}' if mensaje else ''), flush=True)
            resultados.append((grupo, p.nombre, tam, idioma, estado, mensaje, seg))
        nav.close()
    return resultados


def puerto_libre(puerto):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1', puerto)) != 0


def levantar_servidor(carpeta, puerto):
    if not puerto_libre(puerto):
        raise SystemExit(f'El puerto {puerto} está ocupado: cierra lo que lo use.')
    proc = subprocess.Popen(['node', str(AQUI / 'servidor.js'), str(carpeta), str(puerto)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if not puerto_libre(puerto):
            return proc
        time.sleep(0.1)
    proc.kill()
    raise SystemExit('El servidor de prueba no arrancó.')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--solo', default='')
    ap.add_argument('--tam', default='pc,c390,c360')
    ap.add_argument('--idioma', default='es,en')
    ap.add_argument('--trabajadores', type=int, default=min(4, os.cpu_count() or 2))
    ap.add_argument('--forzar', action='store_true', help='volver a compilar la copia')
    ap.add_argument('--lista', action='store_true')
    a = ap.parse_args()

    pruebas = cargar_casos()
    tams, idiomas = a.tam.split(','), a.idioma.split(',')
    trabajos = []
    for p in pruebas:
        if a.solo and a.solo.lower() not in f'{p.grupo} {p.nombre}'.lower():
            continue
        for tam in p.tam:
            for idioma in p.idioma:
                if tam in tams and idioma in idiomas:
                    trabajos.append((p.grupo, tam, idioma, p.nombre))
    if a.lista:
        for g, tam, idioma, n in trabajos:
            print(f'{g:14} {tam:5} {idioma} {n}')
        print(f'{len(trabajos)} pruebas')
        return 0
    if not trabajos:
        print('Ninguna prueba coincide con lo pedido.')
        return 1

    import preparar
    carpeta = preparar.preparar(forzar=a.forzar)
    servidor = levantar_servidor(carpeta, 6019)
    t0 = time.time()
    agrupados = {}
    for g, tam, idioma, n in trabajos:
        agrupados.setdefault((g, tam, idioma), []).append(n)
    resultados = []
    try:
        print(f'{len(trabajos)} pruebas en {len(agrupados)} lotes, {a.trabajadores} navegadores a la vez\n', flush=True)
        with ProcessPoolExecutor(max_workers=a.trabajadores) as pool:
            futuros = [pool.submit(trabajo, g, tam, idioma, nombres) for (g, tam, idioma), nombres in agrupados.items()]
            for f in as_completed(futuros):
                try:
                    resultados += f.result()
                except Exception as e:
                    print(f'FALLA un lote entero: {type(e).__name__}: {str(e)[:300]}')
                    resultados.append(('lote', 'lote', '-', '-', 'FALLA', str(e)[:300], 0))
    finally:
        servidor.kill()

    ok = [r for r in resultados if r[4] == 'OK']
    bugs = [r for r in resultados if r[4] == 'BUG']
    mal = [r for r in resultados if r[4] == 'FALLA']
    print('\n' + '=' * 78)
    for grupo in sorted({r[0] for r in resultados}):
        g = [r for r in resultados if r[0] == grupo]
        print(f'{grupo:14} {sum(r[4] == "OK" for r in g):3}/{len(g):<3} ok' + (f'  {sum(r[4] == "FALLA" for r in g)} FALLA' if any(r[4] == 'FALLA' for r in g) else ''))
    print('=' * 78)
    for r in mal:
        print(f'FALLA [{r[2]}/{r[3]}] {r[0]} · {r[1]}\n        {r[5]}')
    for r in bugs:
        print(f'BUG   [{r[2]}/{r[3]}] {r[0]} · {r[1]}\n        {r[5][:300]}')
    print(f'\n{len(ok)} OK, {len(mal)} FALLA, {len(bugs)} bug conocido, de {len(resultados)} en {time.time() - t0:.0f} s')
    if mal:
        print(f'Capturas de lo que falló: {FALLAS}')
    print('RESULTADO: ' + ('FALLA' if mal else 'OK'))
    return 1 if mal else 0


if __name__ == '__main__':
    sys.exit(main())
