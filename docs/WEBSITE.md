# Especificación Sitio Web Nupcial

> Sitio estático personalizado para cada boda, hosteable en GitHub Pages o Railway Static.
> URL sugerida: `boda.nombrenovios.cl` o subdominio de `wedding-planner.cl`

## 🏠 Páginas

### 1. Landing (`/` — index.html)

**Propósito:** Primera impresión, bienvenida emotiva.

**Contenido:**
- Foto principal de los novios (hero image)
- Nombres de los novios + fecha
- Frase romántica o cita significativa
- Countdown animado hasta el día de la boda
- Botones principales:
  - ✅ Confirmar asistencia → /rsvp
  - 📸 Galería → /galeria
  - 🎁 Regalos → /regalos
- Música de fondo opcional (toggle on/off)

**Referencia visual:** Estilo elegante-minimalista con colores de la boda (paleta personalizable por tenant).

---

### 2. RSVP — Confirmación de Asistencia (`/rsvp`)

**Propósito:** Formulario para que los invitados confirmen.

**Campos:**
| Campo | Tipo | Requerido |
|-------|------|-----------|
| Nombre completo | text | ✅ |
| Teléfono (WhatsApp) | tel | ✅ |
| ¿Asistirás? | radio: Sí/No/Tal vez | ✅ |
| N° de acompañantes | number (0-5) | ✅ |
| Restricciones alimentarias | text | ❌ |
| ¿Necesitas estacionamiento? | radio: Sí/No | ❌ |
| Mensaje para los novios | textarea | ❌ |

**Flujo:**
1. Invitado llena formulario
2. POST → Railway `/rsvp/submit`
3. Guarda en Redis + Notion
4. Dispara template `confirmacion_rsvp` vía WhatsApp
5. Redirige a página de gracias con resumen

**Página de gracias:**
- ✅ Confirmación recibida
- Resumen de datos confirmados
- N° de mesa asignado (si ya está definido)
- Link para volver al sitio

**URL mágica (query params):**
`/rsvp?guest=NOMBRE&phone=+569...` → pre-llena formulario con datos del invitado.

---

### 3. Información del Evento (`/info`)

**Propósito:** Toda la info logística en un solo lugar.

**Secciones:**

**📍 Lugar**
- Mapa interactivo (Google Maps embed)
- Dirección completa
- Link a Waze / Google Maps

**👔 Dress Code**
- Descripción detallada
- Imágenes de referencia/inspiración
- Qué NO usar

**🅿️ Estacionamiento**
- Opciones disponibles
- Mapa de estacionamientos cercanos
- Costo (si aplica)

**🗓 Cronograma**
| Hora | Actividad |
|------|-----------|
| 18:00 | Cóctel de bienvenida |
| 18:30 | Ceremonia |
| 19:00 | Cena |
| 21:00 | Baile / Fiesta |
| 00:00 | Fin del evento |

**🌤 Clima**
- Widget de clima para la fecha (API OpenWeatherMap)

**📞 Contacto**
- WhatsApp de contacto (link directo)
- Email de respaldo

---

### 4. Galería de Fotos y Videos (`/galeria`)

**Propósito:** Fotos de los novios, love story, momentos previos.

**Secciones:**
- Historia de amor (timeline visual)
- Sesión de fotos pre-boda
- Videos (propuesta, momentos especiales)
- Behind the scenes

**Features:**
- Grid masonry responsivo
- Lightbox para ver en grande
- Reproductor de video embebido (YouTube/Vimeo)
- Carrusel automático opcional

**Privacidad:** Galería pública pero sin indexar (noindex meta tag).

---

### 5. Mesa de Regalos (`/regalos`)

**Propósito:** Opciones para que los invitados hagan regalos a los novios.

**Secciones:**

**🎁 Código Novios (Chile)**
- Link directo a lista en codigonovios.cl
- Código de la lista
- Instrucciones paso a paso

**🏬 Tiendas (Paris / Falabella)**
- Link a lista de novios en cada tienda
- Número de lista
- Instrucciones

**💵 Transferencia Bancaria**
| Dato | Valor |
|------|-------|
| Banco | [Banco] |
| Tipo Cuenta | Cuenta Corriente / Vista |
| RUT | [RUT novios] |
| N° Cuenta | [Número] |
| Correo | [Email] |

**🌎 Invitados internacionales**
- PayPal / Wise
- Western Union

**Mensaje:** "Tu presencia es el mejor regalo, pero si deseas tener un gesto adicional..."

---

## 🎨 Diseño

### Paleta de colores (personalizable)
```css
:root {
  --color-primary: #8B3232;     /* Rojo chino / burgundy */
  --color-secondary: #C9A84C;   /* Dorado */
  --color-bg: #F5F0E8;          /* Crema / parchment */
  --color-text: #3C2415;        /* Marrón oscuro */
  --color-accent: #D4A574;      /* Rose gold */
  --font-heading: 'Playfair Display', 'Georgia', serif;
  --font-body: 'Lato', -apple-system, sans-serif;
}
```

### Componentes UI
- Countdown animado (JS vanilla, sin dependencias)
- Mapa Google Maps (iframe embed)
- Formulario RSVP (fetch API → Railway)
- Galería lightbox (CSS-only o vanilla JS)
- Reproductor video (YouTube iframe API)
- Animaciones suaves (CSS transitions)
- Responsive (mobile-first)

### Tech Stack del Sitio
- HTML5 + CSS3 + Vanilla JS (sin frameworks)
- Hosting: GitHub Pages (gratis, SSL incluido)
- Formulario: fetch → Railway webhook
- Mapas: Google Maps Embed API
- Clima: OpenWeatherMap One Call API
- Fuentes: Google Fonts (Playfair Display + Lato)
- Íconos: Font Awesome o emoji nativos

---

## 🚀 Template Base (HTML)

Estructura base del index.html con las 5 secciones linkeadas. Variables reemplazables por tenant:

```html
<!-- Variables tenant (reemplazar por script de build) -->
<!-- {{NOVIO1}} {{NOVIO2}} {{FECHA}} {{LUGAR}} {{FOTO_HERO}} -->
<!-- {{COLOR_PRIMARY}} {{COLOR_SECONDARY}} {{URL_RSVP}} {{URL_GALERIA}} -->
```

Cada boda tiene su propia carpeta en `src/site/{wedding_id}/` con los assets personalizados (fotos, paleta, textos).

---

## 📱 Integración WhatsApp

El sitio web tiene un botón flotante de WhatsApp:
```html
<a href="https://wa.me/{{WA_NUMBER}}?text=Hola!%20Tengo%20una%20consulta%20sobre%20la%20boda"
   class="wa-float" target="_blank">
  💬
</a>
```

Y el formulario RSVP envía los datos al webhook de Railway que dispara la confirmación por WhatsApp.
