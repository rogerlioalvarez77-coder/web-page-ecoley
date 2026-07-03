# Sitio Web Ecoley

Sitio web de **Ecoley — Economistas y Consultores de Ley**: página de inicio, tres páginas de servicios (Servicios Jurídicos, Intermediación de Préstamos, Recuperación de Cartera), página de contacto y formulario de solicitud.

---

## 1. Estructura de archivos

```
/
├── index.html                ← EL SITIO PRINCIPAL (aquí se edita todo)
├── support.js                ← Motor interno. NO editar.
├── README.md                 ← Este archivo
├── ejemplo_pagina/
│   └── Direcciones.html      ← Bocetos de dirección visual (referencia, no es el sitio)
└── assets/                   ← Todas las imágenes y el logo
    ├── logo.png
    ├── reunion-oficina.jpg
    ├── abogado-contrato.png
    ├── handshake.jpg
    ├── abogado-asesorando.png
    ├── revisando-cuenta.jpg
    ├── prestamo-personal.jpg
    ├── prestamo-prendario.jpg
    └── prestamo-hipotecario.jpg
```

Todo el contenido del sitio (texto, iconos, referencias a imágenes y la lógica) vive dentro de **`index.html`**.

---

## 2. Dependencias / qué instalar

**No hay que instalar nada ni compilar el proyecto.** No usa npm, ni Node build, ni frameworks que instalar.

Solo necesitas:

1. **Un navegador moderno** (Chrome, Edge, Firefox o Safari actualizados).
2. **Conexión a internet** la primera vez que abras la página: las librerías internas (React y Babel) se descargan automáticamente desde un CDN. No requiere instalación.
3. *(Recomendado)* una forma sencilla de servir la carpeta como sitio local. Elige **una** opción:
   - **VS Code + extensión "Live Server"** → clic derecho sobre `index.html` → *Open with Live Server*.
   - **Python** (ya viene en Mac/Linux): en la carpeta del proyecto ejecuta
     ```
     python3 -m http.server 8080
     ```
     y abre `http://localhost:8080/index.html`
   - **Node** (si lo tienes):
     ```
     npx serve
     ```

> También puedes hacer doble clic en `index.html` para abrirlo directo en el navegador; funciona en la mayoría de casos, pero usar un servidor local (opciones de arriba) evita bloqueos de seguridad del navegador.

---

## 3. Cómo editar el TEXTO

Abre `index.html` con cualquier editor de texto (Bloc de notas, VS Code, etc.).

### a) Datos de contacto (correo, teléfono, WhatsApp, Facebook)
Busca el bloque **`CONFIG`** cerca del final del archivo (dentro de `<script ... data-dc-script>`):

```js
CONFIG = {
  email: 'atencionalcliente@ecoleysv.com',
  telefono: '+503 7386-9004',
  whatsapp: '50373869004',   // solo números, sin + ni espacios (para el enlace de WhatsApp)
  facebook: 'https://www.facebook.com/profile.php?id=61560088484137',
  direccion: 'San Salvador, El Salvador',
  formEndpoint: ''           // ver punto 6
};
```
Cambia el valor entre comillas y guarda.

### b) Listas de servicios
En ese mismo `<script>` están las listas fáciles de editar:
- `juridicosItems` → viñetas de la página **Servicios Jurídicos**
- `carteraItems` → viñetas de la página **Recuperación de Cartera**
- `prestamosProductos` → las 3 tarjetas de **Préstamos** (título `t`, descripción `d`, imagen `img`)

Agrega o quita líneas respetando las comillas y las comas.

### c) Títulos y párrafos de las secciones
El resto de los textos (títulos, encabezados, párrafos del inicio, etc.) están escritos directamente en el HTML, más arriba en el archivo. Busca el texto que quieres cambiar (por ejemplo `Soluciones jurídicas y financieras`) y edítalo en su lugar.

---

## 4. Cómo cambiar los ICONOS

En la página de inicio, cada tarjeta de servicio tiene un icono hecho con un símbolo de texto. Búscalos en el HTML (sección de las 3 tarjetas de servicios):

| Servicio | Símbolo actual |
|---|---|
| Servicios Jurídicos | `⚖` (balanza) |
| Intermediación de Préstamos | `$` (dólar) |
| Recuperación de Cartera | `↺` (ciclo) |

Para cambiar uno, reemplaza el símbolo que está entre `...margin-bottom:16px">` y `</div>`. Puedes pegar cualquier símbolo (por ejemplo `§`, `%`, `⚑`, etc.).

---

## 5. Cómo cambiar las IMÁGENES

Tienes dos formas:

**Opción fácil (recomendada):** reemplaza el archivo dentro de `assets/` manteniendo **el mismo nombre**. Por ejemplo, para cambiar la foto del inicio, sustituye `assets/reunion-oficina.jpg` por tu nueva foto y renómbrala igual. El sitio la tomará automáticamente.

**Opción manual:** en `index.html` busca la etiqueta `<img src="assets/...">` correspondiente y cambia la ruta al nuevo archivo.

Referencia de dónde se usa cada imagen:
- `logo.png` → logo en encabezado y pie de página
- `reunion-oficina.jpg` → foto grande del inicio (hero)
- `abogado-contrato.png` → tarjeta "Servicios Jurídicos" (inicio)
- `prestamo-hipotecario.jpg` → tarjeta "Préstamos" (inicio) y producto Hipotecario
- `handshake.jpg` → tarjeta "Recuperación de Cartera" (inicio)
- `abogado-asesorando.png` → página Servicios Jurídicos
- `revisando-cuenta.jpg` → página Recuperación de Cartera
- `prestamo-personal.jpg` → producto Préstamos Personales
- `prestamo-prendario.jpg` → producto Préstamos Prendarios

> Consejo: usa imágenes horizontales de buena resolución (aprox. 1200 px de ancho) para que se vean nítidas.

---

## 6. Formulario de solicitud

El formulario ya está conectado a un backend real mediante una **Cloudflare Pages Function** (`functions/api/enviar-solicitud.js`), que recibe los datos y envía un correo usando [Resend](https://resend.com). `CONFIG.formEndpoint` apunta a `/api/enviar-solicitud`; si lo dejas vacío vuelve al modo demostración (no envía nada, solo muestra el mensaje de éxito).

### Configurar Resend en Cloudflare Pages

En el panel de Cloudflare Pages del proyecto → **Settings → Environment variables**, agrega:

| Variable | Tipo | Descripción |
|---|---|---|
| `RESEND_API_KEY` | Secret | Tu API key de Resend (la misma que tienes en `.env` local — **no la subas al repo**). |
| `TO_EMAIL` | Texto (opcional) | Correo donde quieres recibir las solicitudes. Por defecto: `atencionalcliente@ecoleysv.com`. |
| `FROM_EMAIL` | Texto (opcional) | Remitente del correo. Por defecto usa el dominio de pruebas `onboarding@resend.dev`. |

> **Importante — dominio de pruebas vs. dominio propio:** mientras no verifiques un dominio en Resend, `onboarding@resend.dev` **solo puede enviar correos a la dirección con la que creaste la cuenta de Resend**, no a cualquier destinatario. Para recibir las solicitudes en `atencionalcliente@ecoleysv.com` (o cualquier otro correo) hay que:
> 1. Verificar el dominio `ecoleysv.com` en Resend (Dashboard → Domains → agregar los registros DNS que te indiquen).
> 2. Cambiar `FROM_EMAIL` a algo del dominio verificado, por ejemplo `Ecoley <notificaciones@ecoleysv.com>`.

Después de configurar las variables, vuelve a desplegar (Cloudflare re-despliega automáticamente al hacer push, o puedes forzar un "Retry deployment").

### Probar localmente

Las Cloudflare Pages Functions no corren con un servidor estático simple (`python3 -m http.server`, Live Server, etc.) — solo funcionan una vez desplegadas en Cloudflare, o localmente con `npx wrangler pages dev . --binding RESEND_API_KEY=tu_key`.

### Protecciones ya incluidas en el backend

- **Validación de formato en el servidor**: DUI, teléfono y correo se revisan también en `functions/api/enviar-solicitud.js`, no solo en el navegador.
- **Consentimiento obligatorio**: si el checkbox de privacidad no llega marcado, el servidor rechaza la solicitud (antes solo se exigía en el navegador).
- **Límite de adjunto en el servidor**: además del máximo de 10 MB en el formulario, la función rechaza cualquier archivo mayor a 10 MB aunque alguien llame al endpoint directamente.
- **Honeypot anti-bot**: el formulario incluye un campo oculto (`honeypot`) invisible para personas; si llega lleno, la función responde "ok" sin enviar el correo, para frenar bots simples sin necesidad de CAPTCHA.

### Recomendado además (fuera del código): límite de solicitudes

El endpoint es público, así que un bot más sofisticado podría llamarlo repetidamente y agotar tu cuota de Resend. Cloudflare Pages no permite limitar esto solo con código de la función; actívalo desde el dashboard:

1. Cloudflare → tu dominio → **Security → WAF → Rate limiting rules**.
2. Crea una regla sobre la ruta `/api/enviar-solicitud`, por ejemplo: máximo 5 solicitudes por IP cada 10 minutos.

---

## 7. Publicar el sitio en internet

El sitio (incluyendo el formulario) está pensado para **Cloudflare Pages**: conecta el repositorio de Git en el dashboard de Cloudflare Pages, o sube la carpeta directamente — la carpeta `functions/` se detecta automáticamente y no requiere configuración de build.

Netlify y Vercel también sirven para el sitio estático, pero la función `functions/api/enviar-solicitud.js` es específica del formato de Cloudflare Pages Functions; si migras de hosting habría que reescribirla en el formato de ese proveedor (Netlify Functions, Vercel Serverless Functions, etc.).
