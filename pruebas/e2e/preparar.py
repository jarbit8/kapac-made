"""Arma la copia de prueba de la página en %TEMP%\\kapac-pruebas y la compila.

Nada de esto toca el repo: se copia frontend/src, public y scripts, se cambian los imports de
Firebase (firestore, auth y storage) por los falsos de falso/ y se compila con react-scripts.
Si el código no cambió desde la última vez, se reutiliza la compilación.

    python pruebas/e2e/preparar.py           arma (o reutiliza) la copia
    python pruebas/e2e/preparar.py --forzar  vuelve a compilar aunque nada haya cambiado
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = Path(os.environ.get('E2E_REPO') or AQUI.parents[1])
FRONT = REPO / 'frontend'
MODULOS = AQUI.parents[1] / 'frontend' / 'node_modules'
DESTINO = Path(os.environ.get('E2E_DESTINO') or Path(os.environ.get('TEMP') or '/tmp') / 'kapac-pruebas')
COPIA = DESTINO / 'frontend'
BUILD = COPIA / 'build'
HUELLA = DESTINO / '.huella'

sys.path.insert(0, str(AQUI))
import datos  # noqa: E402

FALSOS = {'firebase/firestore': 'firestore', 'firebase/auth': 'auth', 'firebase/storage': 'storage'}


def nombre_de(f):
    for raiz in (REPO, AQUI.parents[1]):
        try:
            return str(f.relative_to(raiz))
        except ValueError:
            pass
    return f.name


def huella():
    h = hashlib.sha1()
    for base in (FRONT / 'src', FRONT / 'scripts', AQUI / 'falso'):
        for f in sorted(base.rglob('*')):
            if f.is_file() and not f.name.endswith('.test.js'):
                h.update(nombre_de(f).encode())
                h.update(f.read_bytes())
    for f in sorted((FRONT / 'public').rglob('*')):
        if f.is_file():
            e = f.stat()
            h.update(f'{nombre_de(f)}{e.st_size}{e.st_mtime_ns}'.encode())
    for f in (FRONT / 'package.json', REPO / 'descripcion' / 'textos-pedidos.json', AQUI / 'datos.py', Path(__file__)):
        h.update(f.read_bytes())
    return h.hexdigest()


def espejo(origen, destino, excluir_archivos=()):
    cmd = ['robocopy', str(origen), str(destino), '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XD', 'node_modules', 'build']
    if excluir_archivos:
        cmd += ['/XF', *excluir_archivos]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode >= 8:
        raise SystemExit(f'robocopy falló ({r.returncode}) copiando {origen}')


def copiar_codigo():
    DESTINO.mkdir(parents=True, exist_ok=True)
    COPIA.mkdir(parents=True, exist_ok=True)
    espejo(FRONT / 'src', COPIA / 'src', ('*.test.js',))
    espejo(FRONT / 'public', COPIA / 'public')
    espejo(FRONT / 'scripts', COPIA / 'scripts')
    shutil.copy(FRONT / 'package.json', COPIA / 'package.json')
    (DESTINO / 'descripcion').mkdir(exist_ok=True)
    shutil.copy(REPO / 'descripcion' / 'textos-pedidos.json', DESTINO / 'descripcion' / 'textos-pedidos.json')
    modulos = COPIA / 'node_modules'
    if not modulos.exists():
        r = subprocess.run(['cmd', '/c', 'mklink', '/J', str(modulos), str(MODULOS)], capture_output=True, text=True, errors='replace')
        if r.returncode:
            raise SystemExit('No se pudo enlazar node_modules: ' + (r.stdout + r.stderr).strip())


def poner_falsos():
    """Los imports de firebase/firestore, firebase/auth y firebase/storage pasan a los módulos falsos."""
    falso = COPIA / 'src' / '__falso'
    falso.mkdir(exist_ok=True)
    for f in (AQUI / 'falso').glob('*.js'):
        shutil.copy(f, falso / f.name)
    datos.escribir_semilla(falso / 'semilla.json')
    cambiados = {nombre: 0 for nombre in FALSOS.values()}
    for f in (COPIA / 'src').rglob('*'):
        if not f.is_file() or f.suffix not in ('.js', '.jsx') or falso in f.parents:
            continue
        texto = f.read_text(encoding='utf-8')
        original = texto
        rel = os.path.relpath(falso, f.parent).replace(os.sep, '/')
        rel = rel if rel.startswith('.') else './' + rel
        for real, nombre in FALSOS.items():
            nuevo = re.sub(rf"from\s+(['\"]){re.escape(real)}\1", f"from '{rel}/{nombre}'", texto)
            if nuevo != texto:
                cambiados[nombre] += 1
                texto = nuevo
        if texto != original:
            f.write_text(texto, encoding='utf-8', newline='')
    faltan = [n for n, c in cambiados.items() if not c]
    if faltan:
        raise SystemExit(f'El código ya no importa {faltan} desde firebase: hay que actualizar pruebas/e2e/preparar.py')
    print('imports de Firebase cambiados:', cambiados)


def compilar():
    entorno = {**os.environ, 'PUBLIC_URL': '/', 'GENERATE_SOURCEMAP': 'false', 'CI': 'false', 'DISABLE_ESLINT_PLUGIN': 'true', 'BROWSERSLIST_IGNORE_OLD_DATA': '1'}
    entorno.pop('NODE_OPTIONS', None)
    for paso in (['node', 'scripts/textos.js'],
                 ['node', 'node_modules/react-scripts/bin/react-scripts.js', 'build'],
                 ['node', 'scripts/paginas.js']):
        r = subprocess.run(paso, cwd=COPIA, env=entorno, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode:
            print((r.stdout + r.stderr)[-4000:])
            raise SystemExit(f'Falló: {" ".join(paso)}')


def preparar(forzar=False):
    nueva = huella()
    if not forzar and (BUILD / 'index.html').exists() and HUELLA.exists() and HUELLA.read_text() == nueva:
        print('copia de prueba al día:', BUILD)
        return BUILD
    t0 = time.time()
    if BUILD.exists():
        shutil.rmtree(BUILD, ignore_errors=True)
    copiar_codigo()
    poner_falsos()
    print('compilando (1-2 min)...')
    compilar()
    HUELLA.write_text(nueva)
    print(f'listo en {time.time() - t0:.0f} s: {BUILD}')
    return BUILD


if __name__ == '__main__':
    preparar(forzar='--forzar' in sys.argv)
