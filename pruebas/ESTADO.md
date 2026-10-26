# Estado de las pruebas (24 oct 2026, se detuvo a mitad)

## Lo que existe y cómo está

| Bloque | Dónde | Cómo correrlo | Resultado la última vez |
|---|---|---|---|
| Unitarias del frontend | `frontend/src/**/*.test.js` (11 archivos: compra, diasHabiles, fuentes, fotos, admins, empresa, estadosPedido, categorias, producto, mensajes, translations) | `cd frontend && npm test` (ya es `--watchAll=false`) | 130 de 130 pasan, 3 s |
| Unitarias del servidor | `functions/test/*.test.js` + `functions/test/ayudas/` (base falsa de Firestore y cargador de `index.js` con Firebase, Resend y la red simuladas) | `cd functions && npm test` | 207 pruebas: 205 pasan y 2 quedan marcadas `todo` por bugs reales; 0,25 s |
| Reglas de Firestore y Storage | `pruebas/reglas/probar_reglas.py` (65 casos Firestore + 21 Storage; usa la API de pruebas, no despliega nada, necesita gcloud con sesión) | `python -X utf8 pruebas\reglas\probar_reglas.py` | 85 de 86 como se esperaba, 1 bug conocido (Storage), 6 s |
| Punta a punta (Playwright) | `pruebas/e2e/` | `python -X utf8 pruebas\e2e\correr.py` (opciones: `--solo texto`, `--tam pc,c390,c360`, `--idioma es,en`, `--lista`, `--forzar`) | Cada grupo pasó por separado; la corrida completa junta NO se hizo todavía |

### E2E: cómo funciona
- `preparar.py` arma la copia en `%TEMP%\kapac-pruebas` (no toca el repo), cambia los imports de `firebase/firestore`, `firebase/auth` y `firebase/storage` por los falsos de `e2e/falso/` y compila con react-scripts (solo si el código cambió; unos 10 s).
- La base falsa (`falso/firestore.js` + semilla en `datos.py`) imita las reglas (campos del pedido, solo admin escribe productos/contenido, etc.), guarda lo escrito en localStorage y no sale a la red. Todo lo externo (Culqi, Cloud Functions, fotos, traducción, ipwho) está simulado o bloqueado.
- `correr.py` levanta `servidor.js` en el puerto 6019 y reparte las pruebas en varios navegadores (PC 1440x900, celular 390x844 y 360x740 con touch, en ES y EN). Sale con código distinto de 0 si algo falla; las capturas de lo que falla quedan en `%TEMP%\kapac-pruebas\fallas`.
- Grupos en `pruebas/e2e/casos/` (último resultado por grupo): rutas, catalogo 54/54, carrito 26/26 (solo PC y 390), compra, pagos (84 ok + 6 bugs conocidos), confirmacion, cuentas, libro 46/46, varios 60/60, cierre, admin 36/36.
- Quedó pendiente volver a correr completos `compra`, `confirmacion`, `cuentas` y `cierre` después de los últimos arreglos de las pruebas (esperar la lectura automática del carrito, esperar el guardado del aviso, permitir el error de carrito remoto, selectores del perfil).

## Lo que falta
1. `pruebas/Probar todo.bat` (CRLF): frontend, servidor, reglas, e2e y el bloque "Seguridad: claves" (`python -X utf8 pruebas\seguridad\buscar_claves.py`, 2-3 min, necesita gcloud; sale 1 si una clave aparece), con resumen final "TODO OK" o qué falló.
2. `pruebas/LEEME.md` corto (qué prueba cada cosa, cómo correrla, una línea de la búsqueda de claves; aclarar que algunas pruebas lentas corren solo en PC y 390).
3. `.github/workflows/pruebas.yml`: en cada push a main, Node 22, `npm ci && npm test` en `frontend/` y `npm test` en `functions/` (no necesita `npm ci` en functions: las pruebas simulan todo). Sin reglas, e2e ni claves. Validar el YAML sin hacer push.
4. `pruebas/e2e/casos/edicion.py` (no se escribió): modo edición (botón `.navbar-modo`, barra, idioma forzado a ES, EN deshabilitado, Salir), editar un texto (se guardan `__es` y `__en`), guardado fallido con `window.__fallarEscrituras`, ficha de producto (precio entero, "Sin decimales", `.pe-estado-btn` Borrador/Visible exige foto, "+ Agregar producto" en /shop, Eliminar), subir logo (`__storage`), páginas en modo edición sin desbordes. Ya se exploró: las pruebas deben cancelar con `.editable-cancel` (Escape no llega si el foco está en el botón OK) y comparar texto sin distinguir mayúsculas (la página lo pone en mayúsculas con CSS).
5. Pruebas unitarias de lo nuevo que dejó la limpieza del frontend: `utils/formato.js` (`soles`, `numeroPedido`, `fechaHora`, `limpiar`, `letras`), `utils/avisos.js`, `utils/imagen.js` y los hooks.
6. Una corrida completa de e2e para medir el tiempo total y ver si algo es inestable (se esperan 4-8 min con 4 navegadores).

## Bugs reales encontrados (no se arregló ninguno)
1. `functions/correos.js`, `correoReclamo` (aviso a la tienda): una queja dice "Llegó una queja **nuevoa**". Prueba en `functions/test/correos.test.js`, marcada `todo`.
2. `functions/lib/validar.js`, `leerReclamo`: un objeto o lista en lugar de texto pasa la validación y se guarda como "[object Object]". Prueba `todo` en `functions/test/validar.test.js`.
3. `storage.rules`: el admin no puede borrar archivos (la regla usa `request.resource.size` y en un borrado no hay `request.resource`). `borrarMedia` ignora el error, así que las fotos reemplazadas quedan huérfanas en el bucket. Caso marcado "bug" en `probar_reglas.py`.
4. `pages/Pago.jsx`: "Vence el ..." del CIP usa la zona horaria del navegador y la Confirmación, Mis pedidos y el correo usan hora de Lima; un cliente fuera de Perú ve dos horas distintas (Madrid: 7:41 p. m. contra 1:41 p. m.). Prueba e2e marcada `bug` en `casos/pagos.py`.
5. `context/CartContext.jsx` + `pages/MetodoPago.jsx`: si el precio cambia mientras el cliente está en el método de pago y la lectura automática (1,5 s después de abrir) lo detecta antes de que toque "Continuar al pago", el total cambia solo, el aviso queda guardado pero esa pantalla no lo muestra y el pedido se crea con el precio nuevo. Prueba e2e marcada `bug`.
6. Pantalla Próximamente (la única pública hoy): el enlace "INSTAGRAM ↗" mide 81x18 px de área de toque en celular. Prueba marcada `bug` en `casos/cierre.py`.
7. Menores, solo en el panel de admin en celular: el botón "Tienda abierta/cerrada" mide 29 px de alto y un enlace de la pestaña Visitas 16 px (las pruebas de admin los toleran).

No son bugs (para no volver a reportarlos): los precios con decimales no se soportan a propósito (`soles()` agrega ".00"); los textos de producto en inglés salen de la traducción automática, no del campo `nombreEn`; las medidas de "área de toque" hay que tomarlas con `behavior: 'instant'` porque el CSS tiene scroll suave.

## Cambios fuera de las carpetas de pruebas (solo scripts)
- `frontend/package.json`: `"test": "react-scripts test --watchAll=false"`.
- `functions/package.json`: `"test": "node --test \"test/**/*.test.js\""`.
