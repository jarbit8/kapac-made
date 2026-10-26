"""GET de texto sin dependencias (urllib), para revisar lo que sirve la copia de prueba."""
import urllib.error
import urllib.request


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return r.read().decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:  # GitHub Pages responde 404 con la misma página
        return e.read().decode('utf-8', errors='replace')
