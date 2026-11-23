# Kapac Made — documento del proyecto

Tienda online de **mochilas artesanales de montaña** hechas en Arequipa (Perú).
Sitio: **https://www.kapac-made.com** · Repositorio: `github.com/jarbit8/kapac-made` (público).

Empresa titular: **QHAPAQ BRANDS S.A.C.S.** (nombre comercial Kapac Made), RUC 20613661604, Arequipa.

> Este archivo explica qué es cada parte, dónde está, cómo se publica y qué se hizo en el camino.
> `docs/PROMPT.md` tiene el resumen para dárselo a quien vaya a trabajar en el código.
> Ninguna clave privada va en este repo: aquí solo aparecen sus nombres.

---

## 1. Estado actual

- La web está **en vivo pero cerrada al público**: todo visitante ve la pantalla **"Próximamente"** (video de fondo con el título *COMING SOON*). Solo los administradores ven la tienda real.
- Todo lo necesario para vender ya funciona: catálogo, carrito, checkout, 4 formas de pago, correos, panel de administración, libro de reclamaciones y estadísticas de visitas.
- **Falta para abrir** (ver §12): pruebas de pago con dinero real, cargar los productos definitivos y el "día de abrir".

---

## 2. Cómo funciona (arquitectura)

```
 Navegador (React)  ──►  GitHub Pages  (www.kapac-made.com, rama gh-pages)
        │
        ├──►  Firebase Auth        cuentas con correo/Google + invitados anónimos
        ├──►  Firestore            productos, pedidos, textos, visitas, reclamos...
        ├──►  Firebase Storage     fotos y videos que sube el admin
        └──►  Cloud Functions      todo lo que no puede hacer el navegador:
                 ├── Culqi         cobros con tarjeta / Yape y códigos PagoEfectivo
                 ├── Resend        correos desde pedidos@kapac-made.com
                 ├── stock         reserva, descuento y devolución
                 ├── reclamos      número correlativo y correos del libro
                 ├── boletín       código de verificación por correo
                 └── facturación   corte automático si el gasto llega a S/ 1
```

| Servicio | Para qué | Notas |
|---|---|---|
| **GitHub Pages** | Sirve la web compilada | Se publica la carpeta `frontend/build` en la rama `gh-pages`. |
| **Porkbun** | Dominio `kapac-made.com` | `www` apunta a GitHub Pages; `kapac-made.com` redirige al `www`. **Vence el 19 ene 2027.** |
| **Firebase** (proyecto `kapac-made`) | Auth, Firestore, Storage, Cloud Functions | Plan Blaze (requerido por las Functions) con tope de gasto de S/ 1. |
| **Culqi** | Pasarela de pagos | La llave pública va en la web; la secreta solo en el servidor. |
| **Resend** | Envío de correos | Dominio `kapac-made.com` verificado (región São Paulo). |
| **WhatsApp** | Contacto | Botón flotante que abre el chat con un mensaje listo. |

---

## 3. Dónde está todo

```
KAPAC-MADE/
├── LEEME.md               Entrada rápida: qué es y cómo empezar
├── docs/
│   ├── PROYECTO.md        Este documento
│   └── PROMPT.md          Contexto completo para quien vaya a trabajar en el código
├── frontend/              La web (React, Create React App)
├── functions/             El servidor (Firebase Cloud Functions, Node 22)
├── textos-pedidos/        Los textos de cada estado del pedido y de los correos (se editan aquí)
├── pruebas/               Pruebas automáticas (unitarias, reglas, navegador, claves)
├── scripts/               .bat para publicar y cambiar claves (doble clic)
├── firebase.json          Configuración de Firebase (qué se despliega y desde dónde)
├── .firebaserc            Proyecto de Firebase por defecto: kapac-made
├── firestore.rules        Reglas de seguridad de la base de datos
├── storage.rules          Reglas de seguridad de las fotos y videos
├── .github/workflows/     Pruebas automáticas en cada push a main
│
│   (solo en la PC, fuera de git)
├── marca/                 Identidad visual: isotipo, logotipos (.ai/.png), ilustraciones, etiquetas
├── material/              Fotos, videos (Próximamente y teasers), documentos y QR de pago
└── archivo/               Lo que ya no se usa: respaldos y versiones viejas
```

### 3.1 `frontend/` — la web

```
frontend/
├── public/            index.html (SEO, arranque de "tienda cerrada"), CNAME del dominio,
│                      robots.txt, sitemap.xml, og-kapac.jpg (imagen para compartir),
│                      correo/ (logo y cabecera que usan los correos)
├── scripts/           Se corren solos al compilar:
│   ├── textos.js      copia textos-pedidos/textos-pedidos.json a src/config/ (antes de compilar)
│   ├── fotos.js       copia las fotos de Storage al sitio publicado (carga rápida)
│   └── paginas.js     crea /shop.html, /info.html... y 404.html para que cada ruta tenga su página
└── src/
    ├── App.js         Rutas + CierreGate (muestra "Próximamente" si la tienda está cerrada)
    ├── pages/         Una página por ruta (ver tabla abajo); las grandes tienen su carpeta
    │                  con sus partes (p. ej. pages/admin/)
    ├── components/    Piezas compartidas: NavBar, Header, Footer, Hero, Lifestyle, WhatsApp,
    │                  SitioCerrado (Próximamente), Editable / EditableImage (edición en la página),
    │                  ProductoEditable (ficha editable), BarraEdicion, Modal, Cargando...
    ├── context/       Estado global: AuthContext (sesión, admin, modo edición), CartContext
    │                  (carrito), LanguageContext (ES/EN), TemaContext (logo, colores, tienda
    │                  cerrada), TextosContext (textos editables)
    ├── firebase/      Una capa por colección: productos, pedidos, carritos, perfil, visitas,
    │                  newsletter, reclamos, textos, contenido, almacenamiento (subir fotos), auth, config
    ├── hooks/         usePedidoPago (estado del pedido en las pantallas de pago), useTrackVisita
    ├── i18n/          translations.js (ES/EN), categorías, estados del pedido, mensajes del
    │                  servidor, traducción automática ES→EN (traducir.js, useTraducido)
    ├── utils/         compra (correo y carrito de respaldo), días hábiles, fotos, fuentes
    ├── config/        admins.js (quién es admin), empresa.js (razón social y RUC),
    │                  textosPedidos.json (copia generada, no editar)
    ├── styles/        CSS por página
    └── assets/        Imágenes y videos que van dentro del sitio (video de Próximamente)
```

**Rutas**

| Ruta | Página | Qué es |
|---|---|---|
| `/` | Inicio | Hero, fotos "lifestyle", productos, valores |
| `/shop` | Catalogo | Catálogo con búsqueda y categorías (Alpinismo, Trekking, Climbing) |
| `/producto/:id` | Producto | Ficha: fotos, precio, stock, características; editable por el admin |
| `/kapac-made` | Alma | Historia de la marca |
| `/b2b` | B2B | Ventas a empresas |
| `/info` | Contacto | Datos de contacto, envíos y preguntas |
| `/zone` | Zone | Foto "in the zone" a pantalla completa |
| `/carrito` → `/checkout` → `/metodo-pago` | Carrito, Checkout, MetodoPago | Compra (solo envío a domicilio) |
| `/pago/tarjeta/:id`, `/pago/yape-codigo/:id` | PagoCulqi | Pago con Culqi (tarjeta o Yape con código) |
| `/pago/:metodo/:id` | Pago | Yape QR y PagoEfectivo (código CIP) |
| `/confirmacion/:id` | Confirmacion | Estado del pedido y aviso por correo opcional |
| `/pedidos`, `/perfil`, `/login` | Pedidos, Perfil, Login | Cuenta del cliente |
| `/libro-reclamaciones` | LibroReclamaciones | Libro de Reclamaciones virtual (INDECOPI) |
| `/legal` | Legal | Términos, privacidad, datos del proveedor |
| `/admin` | Admin | Panel: pedidos, visitas, reclamos y botón tienda abierta/cerrada |

Rutas viejas (`/catalogo`, `/alma`, `/contacto`, `/#/...`) redirigen a las nuevas.

### 3.2 `functions/` — el servidor

| Función | Se dispara con | Qué hace | Claves |
|---|---|---|---|
| `cobrarCulqi` | Llamada HTTPS desde la web | Cobra con tarjeta o Yape con código. Recalcula el monto desde la base, nunca confía en el navegador; máximo 5 intentos por pedido; límite por IP | `CULQI_SECRET_KEY` |
| `crearOrdenCulqi` | Llamada HTTPS | Crea la orden de PagoEfectivo y devuelve el código CIP (o el vigente si ya existe). Mínimo S/ 6 | `CULQI_SECRET_KEY` |
| `culqiWebhook` | Aviso de Culqi (`order.status.changed`) | Cuando pagan un CIP, vuelve a consultar la orden en Culqi, compara el monto y marca el pedido como pagado; si venció, lo cancela | `CULQI_SECRET_KEY` |
| `notificarCambioEstado` | Cambio de un pedido en Firestore | Reserva, descuenta o devuelve el stock (una sola vez) y manda el correo de cada estado (uno por estado) | `RESEND_API_KEY` |
| `enviarCodigoNewsletter` / `verificarCodigoNewsletter` | Llamada HTTPS | Boletín con código de 6 dígitos por correo; límites por correo, por IP y por día | `RESEND_API_KEY` |
| `registrarReclamo` | Llamada HTTPS | Valida la hoja, le da número correlativo por año (000001-2026), calcula 15 días hábiles y manda copia al cliente y aviso a la tienda | `RESEND_API_KEY` |
| `responderReclamo` | Cambio de un reclamo | Cuando el admin responde, envía la respuesta al cliente | `RESEND_API_KEY` |
| `cortarFacturacion` | Aviso del presupuesto (Pub/Sub `corte-facturacion`) | Si el gasto del mes llega a S/ 1, desvincula la facturación del proyecto y el servidor se apaga | — |

- `functions/index.js` solo declara las funciones; la lógica está en `functions/lib/` (un módulo por tema) y `functions/correos.js` (HTML de los correos).
- `functions/textos-pedidos.json` es una **copia**: el original está en `textos-pedidos/`.
- Pruebas del servidor: `functions/test/` (con una base de datos falsa en memoria).

### 3.3 Datos

**Firestore (colecciones)**

| Colección | Qué guarda | Quién escribe |
|---|---|---|
| `productos` | nombre, precio (número), stock, fotos, galería, categoría (en inglés), características, especificaciones, `activo` (borrador o visible) | solo admin |
| `pedidos` | cliente, items, total, estado, método de pago, envío, `stockDescontado`, `stockReservado`, CIP... | el cliente lo crea (solo 10 campos fijos) y el servidor lo actualiza |
| `contenido/sitio` | fotos del inicio, fondo del pie, foto "in the zone", logo, color de acento, `cerrado` (tienda cerrada) | admin |
| `contenido/textos` | todos los textos editables, `clave__es` / `clave__en` | admin |
| `visitas` | una por página vista: zona, ruta, país, ciudad, dispositivo, navegador, robot, dirección que quiso abrir | cualquiera (solo crear; solo el admin lee) |
| `reclamos`, `contadores` | hojas del libro y su número correlativo | el servidor; el admin solo responde |
| `usuarios`, `carritos` | perfil y carrito guardado de cada cliente | el dueño de la cuenta |
| `newsletter`, `newsletter_codigos` | suscriptores y códigos | el servidor |
| `limites_ip` | último uso por IP (anti-abuso) | el servidor |

**Storage:** fotos y videos que sube el admin (lectura pública; escribe y borra solo el admin; menos de 50 MB).

### 3.4 `textos-pedidos/`

`textos-pedidos.json` tiene el nombre de cada estado del pedido, lo que dice la página y el correo, en español e inglés.
Al editarlo: doble clic en `Ver cambios.bat` (valida el archivo, lo copia a `frontend` y `functions` y arma vistas HTML para revisar cada caso), luego publicar la web y las funciones.

### 3.5 `pruebas/`

Doble clic en `pruebas\Probar todo.bat`. Ninguna prueba toca datos reales.

| Bloque | Qué cubre |
|---|---|
| Unitarias de la web (Jest) | carrito, compra, textos, traducciones, visitas, servicios de Firebase |
| Unitarias del servidor (`node --test`) | cobro, PagoEfectivo, webhook, stock, correos, boletín, reclamos |
| Reglas | cada colección de `firestore.rules` y `storage.rules`, contra la API de prueba de Firebase |
| Navegador (Playwright) | la web compilada con Firebase y Culqi falsos, en PC y celular (390 y 360 px), español e inglés |
| Claves | busca el valor exacto de cada clave privada en git, el sitio en vivo y la carpeta |

En GitHub, cada push a `main` corre las unitarias.

---

## 4. Compra, pagos y stock

**Estados del pedido:** `procesando_pago` (así nace) → `verificando_pago` → `pendiente_envio` (pagado) → `enviado` → `entregado`; aparte, `cancelado`.

| Método | Cómo se paga | Quién confirma |
|---|---|---|
| Tarjeta | Ventana de Culqi → `cobrarCulqi` | El servidor, al instante |
| Yape con código | Ventana de Culqi (Yape) → `cobrarCulqi` | El servidor, al instante |
| Yape / Plin con QR | QR de QHAPAQ BRANDS en pantalla, el cliente toca "Ya pagué" | El admin, a mano en el panel |
| PagoEfectivo | Código CIP (`crearOrdenCulqi`) que el cliente paga en banco o agente | El webhook de Culqi |

**Stock**
- Se **reserva** cuando el pedido pasa a `verificando_pago` (Yape QR o CIP generado), así nadie más compra esa unidad mientras se confirma.
- Con tarjeta o Yape con código se **descuenta** al pagarse.
- Si el pedido se **cancela**, vuelve exactamente lo que se descontó (`stockReservado`).
- El servidor revisa el stock sumando todas las líneas del mismo producto.

**Correos:** solo si el cliente dejó su correo en la Confirmación (`canalNotificacion: 'email'`). Remitente `Kapac Made <pedidos@kapac-made.com>`; las respuestas llegan al correo de la tienda (`RESPONDER_A` en `functions/correos.js`).

---

## 5. Panel de administración y edición en la página

- **Quién es admin:** la lista está en `frontend/src/config/admins.js` **y** en `esAdmin()` de `firestore.rules` y `storage.rules`. Al agregar o quitar a alguien hay que cambiar los tres archivos y publicar web y reglas. Las reglas comparan el correo en minúsculas.
- **Panel `/admin`:** pedidos (avanzar o cancelar, con confirmación y aviso de correo), visitas, reclamos (responder dentro de 15 días hábiles) y el botón **Tienda abierta / cerrada** en la esquina.
- **Visitas, en 3 zonas:** *Próximamente* (quién vio el video y qué dirección quiso abrir), *Login* (quién intentó entrar y si lo logró) y *Página* (qué recorrió por dentro). Se cuentan personas distintas, países con sus ciudades, dispositivos y navegadores; los robots se cuentan y se marcan. Las visitas del dueño no se cuentan.
- **Modo edición:** el admin activa "Editar" en el menú y cambia textos, fotos, videos, logo y productos directamente en la página. Se edita en español; el inglés se traduce solo al guardar.
- **Productos:** "+ Agregar producto" en `/shop` crea un borrador; en la ficha se edita todo y se publica con "Visible" (exige nombre, precio y foto).

---

## 6. Seguridad

- **Claves privadas** (`CULQI_SECRET_KEY`, `RESEND_API_KEY`): solo en **Google Secret Manager**; las leen las Cloud Functions. No están en el código, ni en GitHub, ni en la web (lo verifica `pruebas/seguridad/buscar_claves.py`).
- **Claves públicas por diseño:** la `apiKey` de Firebase (`frontend/src/firebase/config.js`) y la llave pública de Culqi `pk_live_...` (`frontend/src/pages/PagoCulqi.jsx`). Solo identifican; lo que protege los datos son las reglas.
- **Reglas de Firestore:** el cliente solo crea pedidos con los 10 campos del checkout y en estado `procesando_pago`; no puede cambiar montos, items ni marcar pagos. Las visitas aceptan solo campos fijos (`keys().hasOnly`): **si se agrega un campo a una visita o a un pedido sin agregarlo a las reglas, esas escrituras fallan**.
- **Servidor:** recalcula precio y stock desde la base, verifica el webhook consultando a Culqi, límites por IP (toma la IP real, no una inventada), tope de intentos de cobro.
- **Gasto:** presupuesto "Tope 1 sol" conectado a `cortarFacturacion`: si el gasto llega a S/ 1 se apaga la facturación (para volver, re-vincular la cuenta de facturación en la consola). La cuenta de servicio `...-compute@developer.gserviceaccount.com` necesita **Editor** + Administrador de facturación del proyecto + Invocador de Cloud Run + Receptor de eventos de Eventarc: **no quitarle Editor**.
- **Datos personales:** la web avisa en Legal qué guarda (carrito y preferencias en el navegador, número de visitante al azar, correo solo si hay sesión, ubicación aproximada sin guardar la IP).

---

## 7. Cómo publicar

| Qué | Cómo |
|---|---|
| **La web** | Doble clic en `scripts\Publicar web.bat` (compila y publica en GitHub Pages). Tarda unos minutos en verse por la caché (10 min). |
| **Las funciones** (servidor) + reglas de Storage | Doble clic en `scripts\Publicar funciones.bat` |
| **Reglas de Firestore** | Doble clic en `scripts\Publicar reglas.bat` |
| **Cambiar una clave privada** | `scripts\Cambiar clave Culqi.bat` o `scripts\Cambiar clave Resend.bat` (la pide sin mostrarla, la guarda en Secret Manager y vuelve a subir las funciones) |
| **Textos de pedidos y correos** | Editar `textos-pedidos/textos-pedidos.json` → `Ver cambios.bat` → publicar web y funciones |
| **Respaldo en GitHub** | `git push origin main` (publicar la web no sube el código) |

- La web se publica **siempre con `--add`** (lo hace el .bat): así no se borran los archivos de la versión anterior que algunos navegadores aún tienen en caché.
- **Después de abrir o cerrar la tienda, volver a publicar la web**, para que la primera carga de los visitantes nuevos ya sepa si está abierta.
- En esta PC el antivirus (Avast) revisa las conexiones seguras; los .bat ya le indican a Node y a gcloud su certificado.

---

## 8. Cómo trabajar en local

```
cd frontend
npm install
npm start                      # http://localhost:3000
```

- Para ver la tienda con el sitio cerrado hay que entrar con una cuenta admin (`/login`).
- Para que las visitas de prueba no se cuenten: en el navegador, `localStorage.kapac_no_contar = '1'`.
- Antes de publicar: `pruebas\Probar todo.bat` (todo en verde) y revisar **siempre en PC y en celular**, también en incógnito (el admin ve una página distinta a la del visitante).

---

## 9. Historia (pasos clave)

| Fecha | Qué se hizo |
|---|---|
| **May 2026** | Inicio del sitio propio en React + Firebase para reemplazar la tienda en Jumpseller. |
| **Jun 2026** | Primera auditoría de seguridad (pagos recalculados en el servidor, reglas de pedidos). |
| **Jul 2026** | Dominio propio `www.kapac-made.com` (Porkbun → GitHub Pages, HTTPS). Editor visual en la página (textos, colores, tipografías, fotos). Compra como invitado. Stock descontado en el servidor. Panel admin con varios administradores. Modo "Próximamente" con la tienda cerrada. Se quitaron los avisos por Telegram. |
| **13 oct** | Se eliminó el chat con IA (queda el botón de WhatsApp). Facturación reactivada con **tope automático de S/ 1**. Pantalla Próximamente nueva con video propio (sin cara) y título animado. Video teaser con música original. |
| **19 oct** | Google: solo se indexa el inicio, título "Kapac Made" y descripción "Mountaineering, Climbing & Trekking". URLs sin `#` (`/shop`, `/kapac-made`, `/info`). Fotos completas y comprimidas a WebP al subir. Guardado por campos (una pestaña vieja ya no pisa cambios). |
| **20 oct** | **Carga rápida**: fotos livianas, contenido recordado y fotos servidas desde GitHub Pages. Todo el proyecto en una carpeta y en un solo repositorio (web, servidor y reglas). |
| **21–22 oct** | Correos con dominio propio (`pedidos@kapac-made.com`). Edición de productos y fotos en la misma página. **Auditoría de seguridad**: reglas endurecidas, límites por IP correctos, webhook de Culqi verificado. **Libro de Reclamaciones** virtual con QHAPAQ BRANDS. Textos de pedidos y correos en un archivo editable. |
| **23–24 oct** | Auditoría final antes de abrir: 13 bugs corregidos (correo de invitado, cambiar método de pago, refresco del carrito con el catálogo...). Claves verificadas por valor exacto: ninguna filtrada. |
| **25–26 oct** | **Claves de Resend y Culqi cambiadas.** Reserva de stock al confirmar el pago manual. QR de pago de QHAPAQ BRANDS. Checkout solo con envío a domicilio. Menú del celular a pantalla completa. |
| **29–30 oct** | Próximamente con *COMING SOON* y tono de película. **Visitas en 3 zonas** (Próximamente, Login, Página), ciudades por país, robots contados y marcados, hora de Perú. |
| **1 nov** | **Limpieza completa**: código y CSS sin uso fuera, panel admin por pestañas, servidor en módulos, 500+ pruebas unitarias y casi 600 de navegador. Bugs de stock corregidos (devolución de más al cancelar, mismo producto en dos líneas). |
| **23 nov** | Estructura final de carpetas (`docs/`, `scripts/`, `textos-pedidos/`), servidor y páginas grandes ordenados en módulos, documentación. |

---

## 10. Decisiones tomadas (no cambiar sin hablarlo)

- La tienda se abre y cierra desde el botón del panel admin; con la tienda cerrada **no hay enlace visible al login**: el admin entra escribiendo `kapac-made.com/login`.
- Próximamente: solo *COMING SOON*, sin más texto; en el video **no se ve la cara** de quien camina.
- En Google solo aparece el inicio, sin imagen ni sub-secciones.
- El correo del cliente es **opcional** (se ofrece en la Confirmación), no se pide en el checkout.
- Solo **envío a domicilio** (no hay recojo en tienda).
- Los textos se editan en español; el inglés se genera solo.
- Precios sin decimales.

---

## 11. Trampas conocidas

- **Campos nuevos en pedidos o visitas** → agregarlos también a `firestore.rules` (si no, fallan todas esas escrituras). Hay pruebas que lo vigilan.
- **El admin y el visitante ven DOMs distintos** (lápices, marcos): revisar siempre sin sesión o en incógnito.
- **Videos:** solo MP4 (H.264) de menos de 50 MB; los `.mov`/HEVC del celular no se reproducen en todos los navegadores.
- **GitHub Pages** a veces dice "Published" pero sigue sirviendo lo viejo: revisar que el archivo `main.*.js` del sitio cambió y, si no, volver a publicar.
- Las rutas de producto y de pago responden con estado 404 en GitHub Pages aunque la página funciona (es la misma app); no importa porque no se indexan.
- **Pagos:** PagoEfectivo exige mínimo S/ 6. El webhook de Culqi debe estar registrado en el panel de Culqi (evento `order.status.changed`).

---

## 12. Pendientes

**Para abrir la tienda**
1. Prueba con dinero real: tarjeta S/ 6 (y devolución) y un CIP de PagoEfectivo de S/ 6 pagado (comprobar que la reserva de stock y el webhook lo pasan a pagado).
2. Cargar los productos definitivos con fotos.
3. Día de abrir: botón "Tienda abierta" en el panel → volver a publicar la web → cambiar `RESPONDER_A` al correo de la tienda y publicar las funciones → revisar que `/libro-reclamaciones` abre para los visitantes.
4. Agregar en login y registro: "Al continuar aceptas la Política de privacidad" con enlace.

**Mantenimiento**
- Renovar el dominio antes del **19 ene 2027** (renovación automática con tarjeta vigente).
- Verificación en dos pasos en Google, Culqi, Resend, GitHub y Porkbun.
- Opcional: App Check (reCAPTCHA v3) contra abuso, actualizar `react-router`, `firebase-admin` 14.
