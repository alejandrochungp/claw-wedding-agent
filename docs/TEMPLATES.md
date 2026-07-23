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

## Template 1: `save_the_date`

**Nombre Meta:** `wedding_save_the_date`
**Categoría:** MARKETING
**Idioma:** es

### Header (IMAGE)
Imagen del Save the Date (generada por `openai/gpt-image-2` o foto pareja)

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
| {{7}} | Restaurante Meihua, Cerrillo, Santiago |

### Botones
| Tipo | Texto | Acción |
|------|-------|--------|
| URL | 📅 Agregar al calendario | Google Calendar link |
| QUICK_REPLY | ✅ Recibido | Marca como entregado |

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
