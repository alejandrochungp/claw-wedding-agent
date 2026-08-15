# Templates WhatsApp — claw-wedding-agent

> Todos los templates deben ser aprobados por Meta (24-48h).
> Categoría: MARKETING (campañas, invitaciones) o UTILITY (confirmaciones, recordatorios).

## 📋 Catálogo de Templates

| # | Template | Categoría | Flujo | Gatillo |
|---|----------|-----------|-------|---------|
| 1 | `save_the_date` | MARKETING | Save the Date | Campaña manual |
| 2 | `invitacion_formal` | MARKETING | Invitación Formal | Campaña manual |
| 3 | `confirmacion_rsvp` | UTILITY | Post-RSVP | Webhook formulario |
| 4 | `recordatorio_7d` | UTILITY | 7 días antes | Cron automático |
| 5 | `recordatorio_24h` | UTILITY | 24h antes | Cron automático |
| 6 | `dia_evento` | MARKETING | Día del evento | Cron automático |
| 7 | `post_boda` | MARKETING | Día después | Cron automático |
| 8 | `info_adicional` | UTILITY | Cualquier momento | Respuesta a consulta |

---

## Template 1: `save_the_date` (v1 — OBSOLETO)

**Meta ID:** `4059477664346100`
**Status:** APPROVED (25-Jul-2026)
**Categoría:** MARKETING
**Idioma:** es

> ⚠️ Reemplazado por `save_the_date_v2`. Mantener solo para referencia.

### Header (TEXT)
```
💍 {{1}} & {{2}} — ¡Nos casamos!
```

### Body
```
💍 {{1}} & {{2}}

¡Nos casamos!

🗓 {{3}} de {{4}} de {{5}}
🕕 {{6}} hrs
📍 {{7}}

Reserva la fecha — pronto llegará tu invitación formal ✨
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Alejandro |
| {{2}} | Kuilen |
| {{3}} | 17 |
| {{4}} | noviembre |
| {{5}} | 2026 |
| {{6}} | 18:00 |
| {{7}} | Restaurante Meihua, Cerrillos, Santiago |

### Botones
| Tipo | Texto |
|------|-------|
| QUICK_REPLY | Confirmar asistencia |
| QUICK_REPLY | No podre asistir |

---

## Template 1b: `save_the_date_v2` ✅ (ACTIVO)

**Meta ID:** `2274081063416149`
**Status:** APPROVED (25-Jul-2026 21:17)
**Categoría:** MARKETING
**Idioma:** es

> Versión simplificada en tono Alejandro: solo fecha, sin hora ni lugar. Pre-confirmación de asistencia.

### Header (TEXT)
```
Oye, {{1}} — nos casamos pronto
```
> 📌 **HEADER IMAGE logrado:** Ver template `save_the_date_v3` abajo.
> La imagen está en: `https://missclickpro.wordpress.com/wp-content/uploads/2025/07/portadaweb_missclick.jpg`

### Body
```
💍 {{1}} y {{2}} — {{3}} de {{4}} de {{5}}

Nos casamos. Reserva la fecha.

Los detalles te llegan después con la invitación formal. Por ahora solo dime si vienes.
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Alejandro |
| {{2}} | Kuilen |
| {{3}} | 17 |
| {{4}} | noviembre |
| {{5}} | 2026 |

### Botones
| Tipo | Texto |
|------|-------|
| QUICK_REPLY | Confirmar asistencia |
| QUICK_REPLY | No podre asistir |

### Cambios vs v1
- ❌ Sin hora ({{6}} eliminado)
- ❌ Sin lugar ({{7}} eliminado)
- ✅ Tono directo (Alejandro)
- ✅ Solo 5 variables (más simple)
- ✅ Propósito claro: pre-confirmación

---

## Template 1d: `save_the_date_v4_img` ✅ (URL BUTTONS + IMAGE HEADER) — 03-Ago

**Meta ID:** `1585195933335096`
**Status:** ✅ APPROVED (verificado 04-Ago-2026 12:30)
**Categoría:** MARKETING | **Idioma:** es

> Recreación de `save_the_date_v4` con **header IMAGE** (foto pareja vía Resumable Upload API, mismo flujo que v3).
> ⚠️ El nombre original `save_the_date_v4` (texto) se ELIMINÓ y Meta no permitió reusarlo de inmediato (cooldown) → se usa sufijo `_img`.

### Header (IMAGE)
Foto pareja: `projects/boda-china-2026/foto-pareja-save-the-date.jpg` (handle resumable upload)

### Body
```
Nos casamos el {{1}} de {{2}} de {{3}}. Reserva la fecha y confirma tu asistencia tocando un boton:
```

### Variables (3)
| Var | Ejemplo |
|-----|---------|
| {{1}} | 17 |
| {{2}} | noviembre |
| {{3}} | 2026 |

### Botones (URL)
| Tipo | Texto | URL |
|------|-------|-----|
| URL | Confirmar asistencia | https://alejandro-kuilen.noscasamos.vip/rsvp.html |
| URL | No podre asistir | https://alejandro-kuilen.noscasamos.vip/no-confirmado.html |

---

## Template 1e: `save_the_date_v5_img` 🆕 (URL BUTTONS DINÁMICOS + IMAGE) — 15-Ago

**Meta ID:** `1707548530350870`
**Status:** ✅ APPROVED (aprobado 15-Ago-2026 en ~1h) y **ACTIVO** (`SAVE_THE_DATE_TEMPLATE=save_the_date_v5_img`)
**Categoría:** MARKETING | **Idioma:** es

> Evolución de `save_the_date_v4_img`: los botones URL ahora llevan **variable dinámica** con el teléfono del invitado (`?phone={{1}}`) para pre-llenar el formulario RSVP automáticamente.
> ⚠️ **Lección clave (error 2388052):** en botones URL, las variables se numeran **independientes por componente** (`{{1}}`, NO `{{4}}` continuando el body). Usar `{{4}}` en el query string dispara "URL button format invalid". Cada botón usa su propia `{{1}}` = teléfono del invitado.

### Header (IMAGE)
Foto pareja: `site/assets/foto-pareja.jpg` (subida vía Resumable Upload API).

### Body
```
Nos casamos el {{1}} de {{2}} de {{3}}. Reserva la fecha y confirma tu asistencia tocando un boton:
```

### Variables
| Componente | Var | Ejemplo |
|-----------|-----|---------|
| Body | {{1}} | 17 |
| Body | {{2}} | noviembre |
| Body | {{3}} | 2026 |
| Botón 0 | {{1}} | 56912345678 (teléfono invitado) |
| Botón 1 | {{1}} | 56912345678 (teléfono invitado) |

### Botones (URL dinámicos)
| Tipo | Texto | URL |
|------|-------|-----|
| URL | Confirmar asistencia | https://alejandro-kuilen.noscasamos.vip/rsvp.html?phone={{1}} |
| URL | No podre asistir | https://alejandro-kuilen.noscasamos.vip/no-confirmado.html?phone={{1}} |

### Envío (payload con botones)
```json
{
  "type": "template",
  "template": {
    "name": "save_the_date_v5_img",
    "language": {"code": "es"},
    "components": [
      { "type": "header", "parameters": [{"type":"image","image":{"id":"<mediaId>"}}] },
      { "type": "body", "parameters": [
          {"type":"text","text":"17"},
          {"type":"text","text":"noviembre"},
          {"type":"text","text":"2026"}
      ]},
      { "type": "button", "sub_type": "url", "index": "0", "parameters": [{"type":"text","text":"56912345678"}] },
      { "type": "button", "sub_type": "url", "index": "1", "parameters": [{"type":"text","text":"56912345678"}] }
    ]
  }
}
```

### Activación
- El backend usa `SAVE_THE_DATE_TEMPLATE` (env var, default `save_the_date_v4_img`).
- ✅ **Ya activado:** `SAVE_THE_DATE_TEMPLATE=save_the_date_v5_img` seteado en Railway (15-Ago-2026, aprobado ~1h tras creación).
- `sendInviteTemplate()` detecta `.includes('v5')` y agrega los 2 componentes `button` automáticamente.
- E2E verificado: invitación v5 entregada al WhatsApp de Alejandro con botones `?phone=<tel>` (accepted, wamid).

---

## Template 9: `boda_info_img` (URL BUTTONS + IMAGE HEADER) — 03-Ago

**Meta ID:** `2386197625122304` | **Status:** ✅ APPROVED (04-Ago) | **Categoría:** UTILITY | **Idioma:** es

### Header (IMAGE)
Foto pareja (mismo handle que v4_img)

### Body
```
Hola {{1}}, aqui tienes la info de la boda de {{2}} & {{3}}:

Lugar: {{4}}
Dress code: {{5}}
Estacionamiento: {{6}}

Todo el detalle en nuestro sitio:
```

### Variables (6)
| Var | Ejemplo |
|-----|---------|
| {{1}} | Tia Maria |
| {{2}} | Alejandro |
| {{3}} | Kuilen |
| {{4}} | Restaurante Meihua, Cerrillos |
| {{5}} | Formal |
| {{6}} | Muy reducido, llegar en Uber |

### Botones (URL)
| Tipo | Texto | URL |
|------|-------|-----|
| URL | Info del evento | https://alejandro-kuilen.noscasamos.vip/info.html |
| URL | Mesa de regalos | https://alejandro-kuilen.noscasamos.vip/regalos.html |

---

## Template 10: `boda_galeria_img` (URL BUTTON + IMAGE HEADER) — 03-Ago

**Meta ID:** `1922211198453227` | **Status:** ✅ APPROVED (04-Ago) | **Categoría:** MARKETING | **Idioma:** es

### Header (IMAGE)
Foto pareja (mismo handle)

### Body
```
Mira nuestra historia: fotos, hitos y el video de la propuesta de {{1}} & {{2}} estan en nuestra galeria:
```

### Variables (2)
| Var | Ejemplo |
|-----|---------|
| {{1}} | Alejandro |
| {{2}} | Kuilen |

### Botones (URL)
| Tipo | Texto | URL |
|------|-------|-----|
| URL | Ver galeria | https://alejandro-kuilen.noscasamos.vip/galeria.html |

---

## Template 1c: `save_the_date_v3` ✅ (ACTIVO — IMAGE HEADER)

**Meta ID:** `1359786772191285`
**Status:** APPROVED (25-Jul-2026 21:17)
**Categoría:** MARKETING
**Idioma:** es

> ✅ **Con IMAGEN.** Creado vía Resumable Upload API (App token). Método replicado de campaña BTS ARIRANG (Mayo 2026).

### Header (IMAGE)
Foto de la pareja por **Missclick Pro**:
`https://missclickpro.wordpress.com/wp-content/uploads/2025/07/portadaweb_missclick.jpg`

**Media ID para envío:** `1592980732290849` (original, EXPIRADO/INVÁLIDO desde 02-Ago)

> ⚠️ **Lección 02-Ago-2026:** El archivo `tmp/portadaweb_missclick.jpg` y la URL de WordPress devuelven HTML corrupto (no JPEG). El header_handle del template sirve el mismo blob corrupto. Para enviar v3: usar **SIEMPRE** `projects/boda-china-2026/foto-pareja-save-the-date.jpg` (JPEG RGB válido 3241×2160), subir fresco al phone `/media` y usar ese media_id. Los 4 envíos con imagen inválida fallaron con error 131053 "Image is invalid" (visible en logs webhook de Railway).

### Body
```
💍 {{1}} y {{2}} — {{3}} de {{4}} de {{5}}

Nos casamos. Reserva la fecha.

Los detalles te llegan después con la invitación formal. Por ahora solo dime si vienes.
```

### Variables (5)
| Var | Ejemplo |
|-----|---------|
| {{1}} | Alejandro |
| {{2}} | Kuilen |
| {{3}} | 17 |
| {{4}} | noviembre |
| {{5}} | 2026 |

### Botones
| Tipo | Texto |
|------|-------|
| QUICK_REPLY | Confirmar asistencia |
| QUICK_REPLY | No podre asistir |

### Método de creación (Resumable Upload API)
1. `GET /oauth/access_token?client_credentials` → App token
2. `POST /v22.0/{APP_ID}/uploads` → session_id
3. `POST /v22.0/{session_id}` con bytes crudos → handle `h`
4. Inmediatamente crear template con `header_handle: [handle_h]`
5. Para envío: subir a `/media` del phone → usar `image.id` como parámetro

### Envío del template
```json
{
  "type": "template",
  "template": {
    "name": "save_the_date_v3",
    "language": {"code": "es"},
    "components": [
      {
        "type": "header",
        "parameters": [{"type": "image", "image": {"id": "1592980732290849"}}]
      },
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "Alejandro"},
          {"type": "text", "text": "Kuilen"},
          {"type": "text", "text": "17"},
          {"type": "text", "text": "noviembre"},
          {"type": "text", "text": "2026"}
        ]
      }
    ]
  }
}
```

---

## Template 2: `invitacion_formal`

**Nombre Meta:** `wedding_invitacion_formal`
**Categoría:** MARKETING
**Idioma:** es

### Header (DOCUMENT)
PDF de la carta formal de invitación (generado automáticamente)

### Body
```
{{1}}, tienes una invitación formal de parte de {{2}} & {{3}} 💌

Tu invitación personalizada está lista. Confirma tu asistencia en nuestro sitio web:

🔗 {{4}}
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Tía María |
| {{2}} | Alejandro |
| {{3}} | Kuilen |
| {{4}} | https://boda.alejandro-y-kuilen.cl/rsvp?guest=maria123 |

### Botones
| Tipo | Texto | Acción |
|------|-------|--------|
| URL | 💌 Ver invitación | Link al PDF personalizado |
| URL | ✅ Confirmar asistencia | Link al sitio web /rsvp |

---

## Template 3: `confirmacion_rsvp`

**Nombre Meta:** `wedding_confirmacion_rsvp`
**Categoría:** UTILITY
**Idioma:** es

### Body
```
¡Gracias {{1}}! 🎉

Tu asistencia está confirmada:
👥 {{2}} persona(s)
🥗 Preferencia: {{3}}
🪑 Mesa: {{4}}

Nos vemos el {{5}} de {{6}}. ¡Será inolvidable! ✨

¿Necesitas algo más? Responde a este mensaje.
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Tía María |
| {{2}} | 3 |
| {{3}} | Sin restricciones |
| {{4}} | Mesa 12 (Familia Novia) |
| {{5}} | 17 |
| {{6}} | noviembre |

---

## Template 4: `recordatorio_7d`

**Nombre Meta:** `wedding_recordatorio_7d`
**Categoría:** UTILITY
**Idioma:** es

### Body
```
⏰ ¡Falta 1 semana, {{1}}!

La boda de {{2}} & {{3}} es este {{4}} {{5}}.

📋 Info importante:
👔 Dress code: {{6}}
📍 Lugar: {{7}}
🅿️ Estacionamiento: {{8}}
🌤 Clima: {{9}}

¿Dudas? Escríbenos 💬
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Tía María |
| {{2}} | Alejandro |
| {{3}} | Kuilen |
| {{4}} | sábado 17 |
| {{5}} | de noviembre | (necesario por gramática Meta)
| {{6}} | Formal / Temática China-Coreana |
| {{7}} | Restaurante Meihua, Cerrillo |
| {{8}} | Estacionamiento Municipal a 2 cuadras |
| {{9}} | Soleado, 28°C máx |

### Botones
| Tipo | Texto | Acción |
|------|-------|--------|
| URL | 📍 Cómo llegar | Google Maps link |
| URL | 👔 Dress code | Link al sitio /info |

---

## Template 5: `recordatorio_24h`

**Nombre Meta:** `wedding_recordatorio_24h`
**Categoría:** UTILITY
**Idioma:** es

### Body
```
⏰ ¡Mañana es el gran día, {{1}}! 💒

Checklist último minuto:
✅ Ropa lista según dress code
✅ Regalo/sorpresa preparado
✅ Llegar con anticipación (cóctel {{2}} hrs)

📍 {{3}}
🪑 Tu mesa: {{4}}

¡No podemos esperar a verte! 🎉
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Tía María |
| {{2}} | 18:00 |
| {{3}} | Restaurante Meihua, Av. Pedro Aguirre Cerda 5761 |
| {{4}} | Mesa 12 |

---

## Template 6: `dia_evento`

**Nombre Meta:** `wedding_dia_evento`
**Categoría:** MARKETING
**Idioma:** es

### Body
```
🎊 ¡HOY NOS CASAMOS! 🎊

{{1}} & {{2}} 💍

Te esperamos:
📍 {{3}}
🕕 {{4}} hrs
🪑 Mesa {{5}}

¡Hoy es el día, {{6}}! ❤️
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Alejandro |
| {{2}} | Kuilen |
| {{3}} | Restaurante Meihua |
| {{4}} | 18:00 |
| {{5}} | 12 |
| {{6}} | Tía María |

### Botones
| Tipo | Texto | Acción |
|------|-------|--------|
| URL | 📍 Cómo llegar | Google Maps en vivo |

---

## Template 7: `post_boda`

**Nombre Meta:** `wedding_post_boda`
**Categoría:** MARKETING
**Idioma:** es

### Body
```
Gracias {{1}} por acompañarnos en el día más feliz de nuestras vidas ❤️

Las fotos oficiales estarán disponibles aquí:
🔗 {{2}}

Con cariño,
{{3}} & {{4}} 💑
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Tía María |
| {{2}} | https://boda.alejandro-y-kuilen.cl/galeria |
| {{3}} | Alejandro |
| {{4}} | Kuilen |

### Botones
| Tipo | Texto | Acción |
|------|-------|--------|
| URL | 📸 Ver fotos | Link galería |

---

## Template 8: `info_adicional` (Utility — respuesta automática)

**Nombre Meta:** `wedding_info_adicional`
**Categoría:** UTILITY
**Idioma:** es

### Body
```
Hola {{1}}, aquí tienes la info que necesitas:

📍 Lugar: {{2}}
🗓 Fecha: {{3}} de {{4}}
🕕 Hora: {{5}}
👔 Dress code: {{6}}
🎁 Regalos: {{7}}

¿Algo más en que pueda ayudarte?
```

### Variables
| Var | Ejemplo |
|-----|---------|
| {{1}} | Tía María |
| {{2}} | Restaurante Meihua, Cerrillo |
| {{3}} | 17 |
| {{4}} | noviembre |
| {{5}} | 18:00 |
| {{6}} | Formal / Temática China-Coreana |
| {{7}} | https://boda.alejandro-y-kuilen.cl/regalos |

---

## 📝 Reglas de Templates (Meta)

1. **No URLs rastreables en body** — usar botones URL o link estático acortado
2. **Variables numéricas secuenciales** — {{1}}, {{2}}, {{3}}...
3. **Sin saltos de línea dobles** — Meta los rechaza
4. **Máximo 1 header** — imagen O documento O video
5. **Máximo 2 botones** — URL o QUICK_REPLY
6. **Categoría correcta** — MARKETING = campañas, UTILITY = transaccional
7. **Idioma explícito** — `es` (español)

## 🔄 Proceso de Aprobación

```
Crear template → Meta revisa (24-48h) → APPROVED / REJECTED
                                              ↓
                                     Si REJECTED: corregir y reenviar
                                     Si APPROVED: usar en campañas
```

**Nota:** Los templates MARKETING solo se pueden enviar a usuarios que han interactuado en las últimas 24h O a contactos con opt-in explícito.
