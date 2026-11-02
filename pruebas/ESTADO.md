# Estado de las pruebas

Se corren con `pruebas\Probar todo.bat` (ver `LEEME.md`). Ninguna toca datos reales.

| Bloque | Qué cubre |
|---|---|
| Frontend (Jest) | carrito, textos, traducciones, categorías, fechas, visitas |
| Servidor (`node --test`) | cobro, PagoEfectivo, webhook, stock, correos, boletín, reclamos |
| Reglas | `firestore.rules` y `storage.rules` contra la API de prueba de Firebase |
| Punta a punta | la página compilada en PC y celular, español e inglés, con Firebase y Culqi falsos |
| Claves | el valor de cada clave de Secret Manager en git, el sitio en vivo y la carpeta |

## A tener en cuenta
- La API de prueba de reglas toma el texto que empieza con `/` como ruta y no como texto: en esos casos el valor va sin la barra.
- No son bugs: los precios con decimales no se soportan a propósito; los textos de producto en inglés salen de la traducción automática; las áreas de toque se miden con `behavior: 'instant'`.
