# Prompt para trabajar en Kapac Made

Copia todo lo que está debajo de la línea y pégalo al empezar a trabajar con un desarrollador o un asistente nuevo.

---

Vas a trabajar en **Kapac Made**, la tienda online de mochilas artesanales de montaña de **QHAPAQ BRANDS S.A.C.S.** (Arequipa, Perú). Sitio en vivo: https://www.kapac-made.com. Hoy la tienda está **cerrada al público**: los visitantes ven la pantalla "Próximamente" y solo los administradores ven la tienda real.

## Dónde está el proyecto

Todo está en una sola carpeta, que es el repositorio `github.com/jarbit8/kapac-made` (público, rama `main`):

```
KAPAC-MADE/
├── docs/PROYECTO.md       Documento completo: arquitectura, datos, historia, decisiones, pendientes. LEERLO PRIMERO.
├── frontend/              Web en React 18 (Create React App), español e inglés
│   ├── src/App.js         Rutas (BrowserRouter) y CierreGate (Próximamente con la tienda cerrada)
│   ├── src/pages/         Una página por ruta; las grandes tienen su carpeta (pages/admin/, ...)
│   ├── src/components/    NavBar, Header, Footer, Hero, SitioCerrado, Editable, EditableImage, ProductoEditable...
│   ├── src/context/       AuthContext, CartContext, LanguageContext, TemaContext, TextosContext
│   ├── src/firebase/      Acceso a datos: un archivo por colección (productos, pedidos, visitas, reclamos...)
│   ├── src/i18n/          Traducciones ES/EN, categorías, estados del pedido, traducción automática
│   ├── src/utils/         Lógica pura (compra, días hábiles, fotos, fuentes)
│   ├── src/config/        admins.js, empresa.js, textosPedidos.json (copia generada)
│   ├── src/styles/        CSS por página
│   ├── public/            index.html (SEO y arranque), CNAME, robots.txt, sitemap.xml, imágenes de los correos
│   └── scripts/           Pasos de la compilación: textos.js (antes), fotos.js y paginas.js (después)
├── functions/             Servidor: Firebase Cloud Functions (Node 22)
│   ├── index.js           Solo declara las 9 funciones con sus opciones
│   ├── lib/               La lógica, un módulo por tema: servicios (base, correo, RESPONDER_A), pagos,
│   │                      notificaciones, pedidos (stock), boletin, reclamos, facturacion, validar.
│   │                      Reciben Firebase y Resend desde index.js: no los importan por su cuenta
│   ├── correos.js         HTML de todos los correos
│   └── test/              Pruebas con node --test y una base de datos falsa
├── textos-pedidos/        textos-pedidos.json: nombres de los estados, textos de la página y de los correos (ES/EN)
├── pruebas/               Probar todo.bat: unitarias, reglas, navegador (Playwright) y búsqueda de claves
├── scripts/               .bat para publicar la web, las funciones y las reglas, y para cambiar claves
├── firestore.rules        Reglas de la base de datos
├── storage.rules          Reglas de fotos y videos
└── firebase.json, .firebaserc   Proyecto de Firebase "kapac-made"
```

`marca/`, `material/` y `archivo/` existen solo en la PC del dueño (fuera de git): identidad visual, fotos y videos originales, y respaldos viejos.

## Cómo funciona

- **Web:** se compila (`cd frontend && npm run build`) y se publica en GitHub Pages (rama `gh-pages`) con `npx gh-pages -d build --dotfiles --add`. Siempre con `--add`. Dominio en Porkbun.
- **Datos:** Firebase Auth (correo, Google e invitados anónimos), Firestore y Storage.
- **Servidor:** Cloud Functions para lo que el navegador no puede hacer:
  - `cobrarCulqi`: tarjeta y Yape con código.
  - `crearOrdenCulqi`: código CIP de PagoEfectivo.
  - `culqiWebhook`: confirma los CIP pagados consultando a Culqi.
  - `notificarCambioEstado`: stock y correos por estado.
  - `enviarCodigoNewsletter` y `verificarCodigoNewsletter`: boletín.
  - `registrarReclamo` y `responderReclamo`: Libro de Reclamaciones.
  - `cortarFacturacion`: apaga la facturación si el gasto llega a S/ 1.
- **Pagos:** Culqi para tarjeta, Yape con código y PagoEfectivo. Además hay un QR de Yape/Plin que el admin confirma a mano.
- **Correos:** Resend, desde `pedidos@kapac-made.com`.
- **Estados del pedido:** `procesando_pago` → `verificando_pago` → `pendiente_envio` (pagado) → `enviado` → `entregado`; aparte, `cancelado`.
- **Stock:**
  - se reserva en `verificando_pago`;
  - con tarjeta o Yape con código se descuenta al pagar;
  - al cancelar vuelve exactamente lo descontado (`stockReservado`).
  - Todo lo hace el servidor, nunca el navegador.
- **Admin:**
  - la lista de admins está en `frontend/src/config/admins.js` y en `esAdmin()` de las dos reglas (cambiar los tres juntos);
  - el panel `/admin` tiene pedidos, visitas en 3 zonas (Próximamente, Login, Página), reclamos y el botón tienda abierta/cerrada;
  - en "modo edición" se cambian textos, fotos y productos en la misma página.

## Reglas para trabajar

1. **Nunca escribas claves privadas** en el código, en archivos ni en mensajes.
   - `CULQI_SECRET_KEY` y `RESEND_API_KEY` viven solo en Google Secret Manager.
   - Son públicas a propósito la `apiKey` de Firebase y la llave `pk_live_` de Culqi.
2. **Nada de confiar en el navegador** para montos, stock o estados: lo valida el servidor y lo protegen las reglas.
3. **Si agregas un campo** a un pedido o a una visita, agrégalo también a `firestore.rules`. Si no, fallan todas esas escrituras, porque las reglas usan `keys().hasOnly`.
4. Para cambiar los textos de los pedidos, edita `textos-pedidos/textos-pedidos.json`, no sus copias en `frontend/src/config/` ni en `functions/`.
5. **Prueba siempre en PC y en celular**, y también sin sesión o en incógnito: el admin ve una página distinta a la del visitante.
6. Antes de publicar, `pruebas\Probar todo.bat` debe terminar en `TODO OK`. Si agregas una función o un flujo, agrega su prueba:
   - la web, en `frontend/src/**/*.test.js`;
   - el servidor, en `functions/test/`;
   - el navegador, en `pruebas/e2e/casos/`.
7. **Código:**
   - nombres en español como el resto;
   - pocos comentarios y que sean útiles;
   - componentes cortos (si una página crece, sepárala en su carpeta);
   - la lógica pura va en `utils/` o `functions/lib/`, con su prueba.
8. Los commits van a nombre de `jarbit8`. Publicar la web y hacer `git push origin main` son pasos distintos: haz los dos.
9. No cambies sin consultar las decisiones de `docs/PROYECTO.md` §10, por ejemplo:
   - Próximamente solo con *COMING SOON*;
   - sin enlace visible al login con la tienda cerrada;
   - en Google solo se indexa el inicio;
   - solo envío a domicilio;
   - el correo es opcional.
10. **Después de abrir o cerrar la tienda, vuelve a publicar la web.**

## Comandos

```
cd frontend && npm install && npm start          # web en local
cd frontend && npm test                          # unitarias de la web
cd functions && npm test                         # unitarias del servidor
python -X utf8 pruebas\probar_todo.py            # todo (o doble clic en pruebas\Probar todo.bat)
scripts\Publicar web.bat                         # compilar y publicar la web
scripts\Publicar funciones.bat                   # subir funciones y reglas de Storage
scripts\Publicar reglas.bat                      # subir reglas de Firestore
```

## Lo que falta para abrir

1. Prueba de pago con dinero real: tarjeta y PagoEfectivo, S/ 6 cada uno.
2. Cargar los productos definitivos.
3. Día de abrir:
   - botón "Tienda abierta";
   - volver a publicar la web;
   - poner en `RESPONDER_A` (`functions/lib/servicios.js`) el correo de la tienda y publicar las funciones.
4. Agregar el aviso de privacidad en login y registro.
5. El dominio vence el 19 ene 2027.
