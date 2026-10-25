# Kapac Made

Toda esta carpeta es el repo de GitHub `jarbit8/kapac-made` (público). `marca\`, `material\` y `archivo\` quedan solo en la PC.

Tienda online de mochilas artesanales — www.kapac-made.com

| Carpeta / archivo | Qué hay |
|---|---|
| `frontend\` | La página (React); se publica en GitHub Pages. |
| `functions\` | Funciones del servidor en Firebase (pagos Culqi, correos, stock, Libro de Reclamaciones, corte de facturación). `lib\` tiene las validaciones y el cálculo de pedidos y stock. |
| `descripcion\` | `textos-pedidos.json`: nombres de los estados del pedido, textos de la página y de los correos. `Ver cambios.bat` arma `pedidos.html`, `visitas.html` y `reclamos.html` para ver cómo quedan. |
| `pruebas\` | Pruebas automáticas (ver `pruebas\LEEME.md`). `Probar todo.bat` las corre todas, incluida la búsqueda de claves privadas. |
| `firestore.rules`, `storage.rules` | Reglas de seguridad de la base de datos y de las fotos. |
| `firebase.json`, `.firebaserc` | Configuración de Firebase (proyecto `kapac-made`). |
| `marca\` | Identidad de marca: isotipos, logotipos (.ai y .png), ilustraciones, etiquetas. |
| `material\fotos\` | Fotos de la portada y de "in the zone" (`para subir\` son las versiones optimizadas) y `originales\`. |
| `material\video\` | Video original de la pantalla Próximamente y los teasers. En `trabajo\` está lo necesario para volver a generarlos (video base, logo, letra Archivo y músicas). |
| `material\documentos\` | Pedidos de cambios (INSTRUCCIONES y KAPAC INFO), PDF con los textos de la web y el mapa del proyecto. |
| `material\seguridad\` | Capturas de la auditoría de seguridad (jun 2026). |
| `archivo\` | Lo que ya no se usa (chat Kapac AI retirado, respaldos viejos, propuesta de diseño descartada) y los `.bat` para publicar las funciones (`Publicar correos.bat`) y borrar claves sin uso. |

Publicar la página: dentro de `frontend\`, `npm run build` y luego `npx gh-pages -d build --dotfiles --add`.
Funciones: doble clic en `archivo\Publicar correos.bat`. Reglas: `firebase deploy --only firestore:rules` desde esta carpeta.

Las claves privadas (Culqi, Resend) viven solo en Google Secret Manager; nunca en el código ni en archivos de esta carpeta.
