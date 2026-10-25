"""Busca el VALOR exacto de cada clave privada de Secret Manager en todo el historial de git
(todas las ramas, también la que se publica), en la página en vivo y en esta carpeta.
Nunca imprime las claves: solo dónde aparecen. Sale con código 1 si alguna aparece.

Necesita gcloud con sesión de jarb2299@gmail.com. Uso: python pruebas/seguridad/buscar_claves.py"""
import os
import re
import ssl
import subprocess
import sys
import urllib.request
from pathlib import Path

PROYECTO = Path(__file__).resolve().parents[2]
CA = PROYECTO / 'archivo' / 'fotos-originales-productos' / 'ca_todo.pem'
ENV = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
if CA.exists():
    ENV['CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE'] = str(CA)
GCLOUD = 'gcloud.cmd' if os.name == 'nt' else 'gcloud'
SITIO = 'https://www.kapac-made.com/'


def correr(*args):
    return subprocess.run(args, capture_output=True, env=ENV)


def leer_claves():
    claves = {}
    nombres = correr(GCLOUD, 'secrets', 'list', '--project', 'kapac-made', '--format', 'value(name)').stdout.decode().split()
    for nombre in nombres:
        versiones = correr(GCLOUD, 'secrets', 'versions', 'list', nombre, '--project', 'kapac-made',
                           '--filter', 'state=ENABLED', '--format', 'value(name)').stdout.decode().split()
        for v in versiones:
            r = correr(GCLOUD, 'secrets', 'versions', 'access', v, '--secret', nombre, '--project', 'kapac-made')
            # Algunas se guardaron con BOM al inicio
            valor = r.stdout.strip().lstrip(bytes([0xEF, 0xBB, 0xBF])).strip()
            if r.returncode == 0 and len(valor) >= 8:
                claves[f'{nombre} v{v}'] = valor
    return claves


def objetos_git():
    correr('git', '-C', str(PROYECTO), 'fetch', '--all', '-q')
    lista = correr('git', '-C', str(PROYECTO), 'cat-file', '--batch-all-objects', '--batch-check=%(objectname)').stdout.decode().split()
    p = subprocess.Popen(['git', '-C', str(PROYECTO), 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    for oid in lista:
        p.stdin.write((oid + '\n').encode())
        p.stdin.flush()
        tam = int(p.stdout.readline().split()[2])
        datos = p.stdout.read(tam)
        p.stdout.read(1)
        yield f'git {oid[:8]}', datos
    p.stdin.close()
    p.wait()


def archivos_sitio():
    ctx = ssl.create_default_context(cafile=str(CA)) if CA.exists() else None
    html = urllib.request.urlopen(SITIO, context=ctx).read()
    yield 'sitio index.html', html
    for ruta in sorted(set(re.findall(rb'static/(?:js|css)/[\w.-]+\.(?:js|css)', html))):
        yield f'sitio {ruta.decode()}', urllib.request.urlopen(SITIO + ruta.decode(), context=ctx).read()


def archivos_carpeta():
    for raiz, dirs, nombres in os.walk(PROYECTO):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
        for n in nombres:
            ruta = Path(raiz) / n
            try:
                if ruta.stat().st_size <= 60 * 1024 * 1024:
                    yield f'carpeta {ruta.relative_to(PROYECTO)}', ruta.read_bytes()
            except OSError:
                pass


def main():
    claves = leer_claves()
    if not claves:
        sys.exit('No se pudo leer ninguna clave (¿gcloud con sesión?)')
    print('Claves revisadas:', ', '.join(claves))
    hallazgos = {k: [] for k in claves}
    for fuente, nombre in ((objetos_git, 'objetos de git'), (archivos_sitio, 'archivos del sitio'), (archivos_carpeta, 'archivos de la carpeta')):
        n = 0
        for donde, datos in fuente():
            n += 1
            for k, v in claves.items():
                if v in datos:
                    hallazgos[k].append(donde)
        print(f'{n} {nombre} revisados')
    malas = 0
    for k, donde in hallazgos.items():
        print(f'{k}: ' + ('no aparece en ningún lado' if not donde else 'APARECE en ' + ', '.join(donde)))
        malas += bool(donde)
    sys.exit(1 if malas else 0)


if __name__ == '__main__':
    main()
