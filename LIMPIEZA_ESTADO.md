# Limpieza y pruebas: a medias (rama `limpieza`, 24 oct 2026)

Se paró antes del lanzamiento a pedido de jarbit. **Nada de esta rama está publicado ni desplegado**: lo que está en vivo es `main` (commit `11e5add`).

## Servidor (`functions/`), hecho por Opus, probado
- `lib/validar.js`: correoValido, ipCliente, nombreCulqi, ordenDelAviso, leerReclamo, sumarDiasHabiles.
- `lib/pedidos.js`: recalcularPedido, moverStock (descontar/devolver stock en una sola función, idempotente) y permitirIP; reciben la base como argumento.
- `index.js`: usa esos módulos, `CORS` en una constante y el boletín con su propio límite por IP (`news_`). Se quitó `node-fetch` (Node 22 trae `fetch`).
- Probado con 207 pruebas unitarias (`functions/test/`). Al pasar a `main` hay que correr `archivo/Publicar correos.bat`.

## Frontend, limpieza SIN VERIFICAR
Se cortó justo después de correr las pruebas de "antes"; las de "después" no se corrieron. **Antes de pasar a `main`: compilar, correr `pruebas/e2e` en PC y celular y comparar con lo publicado.**
- Borrado (sin uso): `public/kapac_made_3.png`, `src/assets/images/` (foto 1, foto 2, gonzalo, gonzalo2, kapac_made_3, mochila 1, mochila 2), `components/ET.jsx`, `firebase/imagenesProductos.js`.
- `pages/PagoTarjeta.jsx` y `pages/PagoYapeCulqi.jsx` se juntaron en `pages/PagoCulqi.jsx`.
- Nuevo: `components/Admin/` (el panel partido en piezas), `components/IconoInstagram.jsx`, `config/redes.js`, `hooks/useContenido.js`, `hooks/useEsMobile.js`, `hooks/useMarcado.js`, `utils/formato.js`, `utils/avisos.js`, `utils/imagen.js`.
- 66 archivos tocados (437 líneas nuevas, 2220 quitadas): código muerto, warnings y repeticiones.

## Pruebas
Ver `pruebas/ESTADO.md` (qué pasa, qué falta: `Probar todo.bat`, `LEEME.md`, GitHub Actions, edición y lo nuevo de la limpieza). `pruebas/seguridad/buscar_claves.py` ya funciona: 0 claves en git, sitio y carpeta.

## Bugs reales que encontraron las pruebas (no arreglados)
1. Correo a la tienda por una queja dice "nuevoa" (`functions/correos.js`, `correoReclamo` con `paraTienda`).
2. `leerReclamo` guarda "[object Object]" si llega un objeto en vez de texto.
3. `storage.rules`: el admin no puede borrar fotos (en un borrado no hay `request.resource`).
4. `Pago.jsx` muestra el vencimiento del CIP en la hora del navegador (la Confirmación y el correo usan Lima).
5. Si el precio sube mientras el cliente está en "Elige cómo pagar", el total cambia sin aviso.
6. Instagram en Próximamente: área de toque de 81x18 px en celular.
