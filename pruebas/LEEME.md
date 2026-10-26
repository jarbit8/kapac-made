# Pruebas de Kapac Made

Todo se corre con doble clic en `pruebas\Probar todo.bat`. Al final dice `TODO OK` o qué bloque falló.
Ninguna prueba toca Firebase, Culqi ni Resend de verdad: usan bases y servidores falsos.

| Bloque | Qué prueba | Cómo correrlo solo |
|---|---|---|
| Frontend | Funciones puras de la página (carrito, textos, traducciones, categorías, fechas) con Jest | `cd frontend && npm test` |
| Servidor | `functions/`: cobro, PagoEfectivo, webhook, stock, correos, boletín, reclamos, con una base en memoria y `node --test` | `cd functions && npm test` |
| Reglas | `firestore.rules` y `storage.rules` contra la API de Google (no despliega nada; necesita `gcloud` con sesión) | `python -X utf8 pruebaseglas\probar_reglas.py` |
| Punta a punta | La página compilada en un navegador (PC y celular, español e inglés) con Firebase y Culqi falsos | `python -X utf8 pruebas\e2e\correr.py` (`--solo texto`, `--tam pc,c390,c360`, `--idioma es,en`, `--lista`) |
| Claves | Busca el valor exacto de cada clave de Secret Manager en git, el sitio en vivo y la carpeta (2-3 min; necesita `gcloud`) | `python -X utf8 pruebas\seguridaduscar_claves.py` |

- `Probar todo.bat --rapido` corre solo frontend, servidor y reglas; `--sin-claves` salta la búsqueda de claves.
- El punta a punta arma una copia en `%TEMP%\kapac-pruebas` (no toca el repo) y la reutiliza si el código no cambió. Algunas pruebas lentas corren solo en PC y 390 px.
- Una prueba marcada `bug` falla hoy a propósito y no corta la corrida; si empieza a pasar, avisa que hay que quitarle la marca.
- En GitHub, cada push a `main` corre solo frontend y servidor (`.github/workflows/pruebas.yml`).
