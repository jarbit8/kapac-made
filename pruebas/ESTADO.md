# Estado de las pruebas (26 oct 2026, rama `limpieza2`, pausado por el límite de uso)

## Hecho y verificado
| Bloque | Resultado | Tiempo |
|---|---|---|
| Frontend (Jest, `cd frontend && npm test`) | 130 de 130 (la prueba de categorías se adaptó a Alpinismo/Trekking/Climbing) | 7 s |
| Servidor (`cd functions && npm test`, `node --test`) | 234 pruebas: 233 pasan, 1 `todo` (bug real, abajo), 0 fallan | 0,3 s |

Archivos nuevos o cambiados:
- `functions/test/stock.test.js` (nuevo, 27 pruebas): reserva de stock (Yape QR y PagoEfectivo al pasar a `verificando_pago`, una sola vez, no vuelve a descontar al pagarse, devolución al cancelar), tarjeta descuenta al pagar, `crearOrdenCulqi` no cuenta contra su propia reserva, webhook `paid` con reserva y stock 0, webhook `expired` (cancela, devuelve la unidad, no toca pedidos ya procesados), flujo completo de PagoEfectivo.
- `functions/test/index.test.js`: la prueba "orden no pagada" ya no usa `expired` (ahora cancela).
- `functions/test/validar.test.js`: `leerReclamo` rechaza objetos y listas, sin `todo`.
- `functions/test/correos.test.js`: "una queja nueva" sin `todo`, "ante INDECOPI", pie "Mountaineering, Climbing & Trekking" en todos los correos.
- `frontend/src/i18n/categorias.test.js`, `frontend/package.json` (`test` sin vigilancia), `functions/package.json` (`test` con `node --test`).
- `pruebas/probar_todo.py` + `pruebas/Probar todo.bat` (CRLF; `--rapido`, `--sin-claves`, `--e2e "..."`), `pruebas/LEEME.md`, `.github/workflows/pruebas.yml` (push a main: frontend + servidor, Node 22).
- e2e: `base.py`/`preparar.py`/`correr.py` con puerto 6035 (`E2E_PUERTO`), `E2E_REPO` y `E2E_DESTINO` para probar otra copia del código; `Culqi.close` cuenta sus llamadas (`window.__culqiCerrado`).

## Escrito pero SIN correr todavía (revisar primero)
Se adaptó el e2e a `main` y se agregaron casos, pero la última corrida completa quedó lanzada en segundo plano (`%TEMP%\kapac-e2e-ultima.txt`, ~15 min) y no se leyó. Antes de las adaptaciones, la línea base sobre `main` dio 412 OK, 112 FALLA (casi todas por el checkout sin recojo y el menú nuevo), 8 bug conocido, en 869 s.
- `casos/compra.py`: checkout solo domicilio (una sola opción, 5 campos, sin "recojo"), `llenar_checkout`/`a_metodo_pago` sin parámetro `recojo`.
- `casos/pagos.py`: "QHAPAQ BRANDS" centrado bajo el QR, correo del token de Culqi (tarjeta y Yape con código), `Culqi.close()` cuando el cobro falla (rechazo y sin red) y no cuando sale bien, aviso al volver al carrito si cambia el precio o el stock en MetodoPago, marcas `bug` quitadas (vence en hora de Lima, aviso de precio).
- `casos/varios.py`: menú del celular a pantalla completa (cubre la pantalla, logo, `Carrito (n)`, la página de atrás no se mueve, se cierra con X, enlaces, logo y carrito) y barra gris al bajar.
- `casos/cierre.py`: marca `bug` de Instagram quitada (ya arreglado en `main`).

## Falta (en este orden)
1. Leer `%TEMP%\kapac-e2e-ultima.txt` y corregir los casos nuevos que fallen.
2. `casos/admin.py`: aviso "El código de PagoEfectivo venció sin pagarse" (pedido `efectivo` en `verificando_pago` con `codigoPagoVence` pasado; no debe salir con uno vigente ni con otros métodos). La prueba "Reclamos: plazos en días hábiles" depende del día de la semana: falla hoy lunes 26 oct (`Quedan 14 días hábiles` / `Vence hoy`); hay que calcular lo esperado con la fecha real.
3. Producto o catálogo: "¡Última unidad!" con stock 1 (en inglés "Last one left!"), "¡Últimas 2 unidades!" con 2-3.
4. `casos/edicion.py` (no existe): modo edición (`.navbar-modo`, `.barra-edicion`, idioma forzado a ES, EN deshabilitado), editar un texto (se guardan `__es` y `__en`), guardado fallido (`window.__fallarEscrituras`), ficha de producto, logo (`__storage`), Info con "× Quitar campo" (`contenido.infoOcultos`, `confirm`, el visitante deja de verlo, el botón de mostrar los vuelve). Para cancelar usar `.editable-cancel` (Escape no llega si el foco está en OK) y comparar texto sin mayúsculas.
5. Reglas: correr `python -X utf8 pruebas\reglas\probar_reglas.py` y pasar a esperado el caso "bug" de borrado de Storage (ahora `allow delete: if esAdmin()`).
6. Unitarias de `utils/formato.js`, `avisos.js`, `imagen.js` y hooks: solo si la limpieza del frontend los crea.
7. Corrida final con `Probar todo.bat` y anotar tiempos.

## Bugs reales
1. `functions/lib/pedidos.js`, `moverStock`: si el pedido reservó sin tener stock suficiente (Yape QR deja pasar), el stock baja solo hasta 0 pero al cancelar se devuelve la cantidad completa. Repro: producto con stock 2, pedido de 9 en `verificando_pago` (queda 0), pasar a `cancelado` (queda 9). Prueba `todo` en `functions/test/stock.test.js`.
2. La prueba e2e "Reclamos: plazos en días hábiles" depende del día en que se corre (no es un bug de la tienda).
3. Los bugs 1, 2, 3, 4, 5 y 6 de la lista de la rama `limpieza` ya están arreglados en `main`.

No son bugs (para no volver a reportarlos): los precios con decimales no se soportan a propósito; los textos de producto en inglés salen de la traducción automática; las áreas de toque se miden con `behavior: 'instant'`.
