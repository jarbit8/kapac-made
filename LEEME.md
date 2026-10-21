# Kapac Made

Toda esta carpeta es el repo de GitHub `jarbit8/kapac-made` (público). `marca\`, `material\` y `archivo\` quedan solo en la PC.

Tienda online de mochilas artesanales — www.kapac-made.com

| Carpeta / archivo | Qué hay |
|---|---|
| `frontend\` | La página (React); se publica en GitHub Pages. |
| `functions\` | Funciones del servidor en Firebase (pagos Culqi, correos, stock, corte de facturación). |
| `firestore.rules`, `storage.rules` | Reglas de seguridad de la base de datos y de las fotos. |
| `firebase.json`, `.firebaserc` | Configuración de Firebase (proyecto `kapac-made`). |
| `scripts\` | Script viejo para cargar productos. |
| `marca\` | Identidad de marca: isotipos, logotipos (.ai y .png), ilustraciones, etiquetas. |
| `material\fotos\` | Fotos de la portada y de "in the zone" (`para subir\` son las versiones optimizadas) y `originales\`. |
| `material\video\` | Video original de la pantalla Próximamente y los teasers. En `trabajo\` está lo necesario para volver a generarlos (video base, logo, letra Archivo y músicas). |
| `material\documentos\` | Pedidos de cambios (INSTRUCCIONES y KAPAC INFO), PDF con los textos de la web y el mapa del proyecto. |
| `material\seguridad\` | Capturas de la auditoría de seguridad (jun 2026). |
| `archivo\` | Lo que ya no se usa: el chat Kapac AI retirado, un respaldo viejo del código la propuesta de diseño descartada y respaldos de las reglas y funciones del 13 oct. |

Publicar la página: dentro de `frontend\`, `npm run build` y luego `npx gh-pages -d build --dotfiles --add`.
Funciones y reglas: `firebase deploy --only ...` desde esta carpeta.
