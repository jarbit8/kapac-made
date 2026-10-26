"""Corre todas las pruebas una tras otra y termina con un resumen.

    python -X utf8 pruebas/probar_todo.py                 todo
    python -X utf8 pruebas/probar_todo.py --rapido        solo unitarias (frontend y servidor) y reglas
    python -X utf8 pruebas/probar_todo.py --sin-claves    todo menos la búsqueda de claves (2-3 min)
    python -X utf8 pruebas/probar_todo.py --e2e "--tam pc --idioma es"   opciones para el e2e

Sale con código 1 si algún bloque falla.
"""
import argparse
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PY = [sys.executable, '-X', 'utf8']
WIN = os.name == 'nt'


def bloques(a):
    lista = [
        ('Unitarias del frontend', ['npm', 'test'], RAIZ / 'frontend', {'CI': 'true'}),
        ('Unitarias del servidor', ['npm', 'test'], RAIZ / 'functions', {}),
        ('Reglas de Firestore y Storage', PY + ['pruebas/reglas/probar_reglas.py'], RAIZ, {}),
    ]
    if not a.rapido:
        lista.append(('Punta a punta (navegador)', PY + ['pruebas/e2e/correr.py'] + shlex.split(a.e2e), RAIZ, {}))
        if not a.sin_claves:
            lista.append(('Seguridad: claves', PY + ['pruebas/seguridad/buscar_claves.py'], RAIZ, {}))
    return lista


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rapido', action='store_true')
    ap.add_argument('--sin-claves', action='store_true')
    ap.add_argument('--e2e', default='')
    a = ap.parse_args()

    resultados = []
    for nombre, cmd, carpeta, entorno in bloques(a):
        print(f'
{"=" * 78}
{nombre}
{"=" * 78}', flush=True)
        t0 = time.time()
        try:
            codigo = subprocess.run(cmd, cwd=carpeta, env={**os.environ, **entorno}, shell=WIN).returncode
        except OSError as e:
            print(f'No se pudo correr: {e}')
            codigo = 1
        resultados.append((nombre, codigo, time.time() - t0))

    print(f'
{"=" * 78}
RESUMEN
{"=" * 78}')
    for nombre, codigo, seg in resultados:
        print(f'{"OK   " if codigo == 0 else "FALLA"}  {nombre:34} {seg:6.1f} s')
    mal = [n for n, c, _ in resultados if c]
    print('
TODO OK' if not mal else '
FALLÓ: ' + ', '.join(mal))
    return 1 if mal else 0


if __name__ == '__main__':
    sys.exit(main())
