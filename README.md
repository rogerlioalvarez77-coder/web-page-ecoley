# Sitio Web Ecoley

Sitio web de **Ecoley — Economistas y Consultores de Ley**: página de inicio, tres páginas de servicios (Servicios Jurídicos, Intermediación de Préstamos, Recuperación de Cartera), página de contacto y formulario de solicitud.

---

## 1. Estructura de archivos

```
/
├── Ecoley.dc.html            ← EL SITIO PRINCIPAL (aquí se edita todo)
├── Ecoley Direcciones.dc.html← Bocetos de dirección visual (referencia, no es el sitio)
├── support.js                ← Motor interno. NO editar.
├── README.md                 ← Este archivo
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

Todo el contenido del sitio (texto, iconos, referencias a imágenes y la lógica) vive dentro de **`Ecoley.dc.html`**.

---

## 2. Dependencias / qué instalar

**No hay que instalar nada ni compilar el proyecto.** No usa npm, ni Node build, ni frameworks que instalar.

Solo necesitas:

1. **Un navegador moderno** (Chrome, Edge, Firefox o Safari actualizados).
2. **Conexión a internet** la primera vez que abras la página: las librerías internas (React y Babel) se descargan automáticamente desde un CDN. No requiere instalación.
3. *(Recomendado)* una forma sencilla de servir la carpeta como sitio local. Elige **una** opción:
   - **VS Code + extensión "Live Server"** → clic derecho sobre `Ecoley.dc.html` → *Open with Live Server*.
   - **Python** (ya viene en Mac/Linux): en la carpeta del proyecto ejecuta
     ```
     python3 -m http.server 8080
     ```
     y abre `http://localhost:8080/Ecoley.dc.html`
   - **Node** (si lo tienes):
     ```
     npx serve
     ```

> También puedes hacer doble clic en `Ecoley.dc.html` para abrirlo directo en el navegador; funciona en la mayoría de casos, pero usar un servidor local (opciones de arriba) evita bloqueos de seguridad del navegador.

---

## 3. Cómo editar el TEXTO

Abre `Ecoley.dc.html` con cualquier editor de texto (Bloc de notas, VS Code, etc.).

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

**Opción manual:** en `Ecoley.dc.html` busca la etiqueta `<img src="assets/...">` correspondiente y cambia la ruta al nuevo archivo.

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

## 6. Formulario de solicitud (opcional)

Por defecto el formulario funciona en **modo demostración**: valida los datos y muestra el mensaje de éxito, pero **no envía la información a ningún lado**.

Para que las solicitudes te lleguen de verdad, necesitas un servicio que reciba el formulario (por ejemplo [Web3Forms](https://web3forms.com) o una función de Cloudflare Pages) y pegar su URL en `formEndpoint` dentro de `CONFIG`. Si lo dejas vacío, se queda en modo demostración.

---

## 7. Publicar el sitio en internet

Como es una carpeta de archivos estáticos, puedes subirla tal cual a cualquier hosting estático gratuito: **Cloudflare Pages, Netlify o Vercel** (arrastrar y soltar la carpeta), o el hosting web que ya tengas. No requiere servidor especial.
