# Limpieza y pruebas sobre main: a medias (rama `limpieza2`, 26 oct 2026)

Se paró por el límite de uso. **Nada de esta rama está publicado ni desplegado**: lo que está en vivo es `main` (`adf02e9`).
Esta rama vive en un worktree aparte: `D:\Documentos\3. PROYECTOS\KAPAC-MADE-limpieza` (los `node_modules` son junctions al proyecto principal).

## Hecho (Opus, probado)
- `functions/lib/validar.js` y `functions/lib/pedidos.js`; `functions/index.js` usa esos módulos y conserva lo de `main`:
  - reserva de stock al pasar a `verificando_pago` o a `pendiente_envio`, y devolución al cancelar;
  - `revisarStock: !stockDescontado` en crearOrdenCulqi y webhook;
  - webhook `expired` → cancelado.
- Sin `node-fetch`; el boletín usa `permitirIP(req, 30, 'news_')`.
- Bug arreglado: `leerReclamo` ya no guarda "[object Object]" (solo acepta texto o números).
- `storage.rules`: el admin puede borrar fotos (`allow delete: if esAdmin()`).
- Pendiente: desplegarlo (`firebase deploy --only storage`; si el clasificador lo bloquea, un .bat).

## A medias
- **Pruebas (Sonnet B):** trajo de la rama `limpieza` `pruebas/` (e2e, reglas, seguridad), `functions/test/` y los `*.test.js` del frontend (están agregados con git add). Faltaba:
  - adaptarlas a `main` (categorías, sin recojo, textos nuevos);
  - pruebas del servidor sobre `lib/`;
  - `Probar todo.bat` con `buscar_claves.py`, `LEEME.md` y GitHub Actions;
  - e2e de edición y del menú del celular;
  - correr todo.
- **Limpieza del frontend (Sonnet A):** no alcanzó a dejar cambios. Hay que hacerla de nuevo sobre esta rama, usando como guía la rama `limpieza` (`LIMPIEZA_ESTADO.md`).
- **Bugs del frontend sin arreglar:**
  - el vencimiento del CIP en `Pago.jsx` sale en la hora del navegador (debe ser Lima, con `venceCIP`);
  - no hay aviso si el precio cambia en MetodoPago;
  - el Instagram de Próximamente tiene un área de toque menor a 40 px.

## Para cerrar
1. Revisar todo y correr las pruebas.
2. Merge de `limpieza2` en `main`.
3. Publicar la web.
4. `archivo/Publicar correos.bat` (functions).
5. Desplegar `storage.rules`.
6. `buscar_claves.py` y `probar_reglas.py`.

## Actualización (26 oct, más tarde)
- Los 3 bugs del frontend (CIP en hora de Lima, aviso si el precio cambia en MetodoPago, Instagram de Próximamente) ya se arreglaron en `main` (`bd48c16`) y se trajeron aquí con un merge (`2a87512`): ya no son pendientes de esta rama.
- `storage.rules` con borrado del admin también está en `main`; `archivo/Publicar correos.bat` ahora la despliega después de las funciones.
