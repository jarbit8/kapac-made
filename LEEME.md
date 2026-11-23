# Kapac Made

Tienda online de mochilas artesanales de montaña — **www.kapac-made.com**

Toda esta carpeta es el repositorio `github.com/jarbit8/kapac-made`. Para entender el proyecto completo: **`docs/PROYECTO.md`**.

| Carpeta / archivo | Qué hay |
|---|---|
| `docs/` | `PROYECTO.md` (arquitectura, datos, historia, pendientes) y `PROMPT.md` (contexto para quien trabaje en el código) |
| `frontend/` | La web (React). Se publica en GitHub Pages |
| `functions/` | El servidor (Firebase Cloud Functions): pagos con Culqi, correos, stock, reclamos, boletín, tope de gasto |
| `textos-pedidos/` | Textos de cada estado del pedido y de los correos. Se editan aquí; `Ver cambios.bat` muestra cómo quedan |
| `pruebas/` | Pruebas automáticas: doble clic en `Probar todo.bat` |
| `scripts/` | Doble clic para publicar la web, las funciones o las reglas, y para cambiar claves |
| `firestore.rules`, `storage.rules` | Reglas de seguridad de la base de datos y de las fotos |
| `firebase.json`, `.firebaserc` | Configuración de Firebase (proyecto `kapac-made`) |
| `marca/` | Solo en la PC: isotipo, logotipos (.ai y .png), ilustraciones, etiquetas, fotos de WhatsApp |
| `material/` | Solo en la PC: fotos, videos (Próximamente y teasers), documentos y el QR de pago |
| `archivo/` | Solo en la PC: lo que ya no se usa (respaldos, versiones y scripts viejos) |

**Publicar:** `scripts\Publicar web.bat` (la web) · `scripts\Publicar funciones.bat` (el servidor) · `scripts\Publicar reglas.bat` (reglas de Firestore). Antes, `pruebas\Probar todo.bat`.
