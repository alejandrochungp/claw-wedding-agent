# Propuesta v2: Ciclo de vida de invitados + envío de templates (ACTUALIZADA 04-Ago 14:57)

> **Fecha:** 04-Ago-2026 | **Autor:** Claw
> **Estado:** PROPUESTA v2 — NADA implementado (esperando aprobación de Alejandro)
> **Cambios vs v1:** incorpora decisiones de Alejandro (14:57): envío manual, carta formal post-RSVP, campo stage en BD, auto-envío solo calendario, recordatorios con días propuestos.

---

## 1. Decisiones de Alejandro (incorporadas)

| # | Decisión | Impacto |
|---|----------|---------|
| 1 | **Plantillas se envían MANUALMENTE por comando** | NO hay auto-envío de templates al agregar invitado. El novio dispara con comandos. |
| 2 | **Luego del RSVP → carta de invitación oficial y formal** | Template nuevo: carta formal (lugar, hora, código de novios, etc.) enviada a quien confirma |
| 3 | **Campo de estado del ciclo de vida en la BD** | Cada invitado tiene `stage` persistido (nuevo → invitado → confirmado → carta_enviada → etc.) |
| 4 | **Auto-envío al confirmar = SOLO link del calendario** | Se mantiene el comportamiento actual (`confirmMsg` con `calendarUrl`) — NO se envía template al confirmar, solo el link |
| 5 | **Recordatorios automáticos según días propuestos** | Propuesta de calendario de recordatorios abajo |

---

## 2. Ciclo de vida del invitado (state machine)

### Etapas (`stage`)
```
nuevo ──(comando enviar invitación)──▶ invitacion_enviada
invitacion_enviada ──(RSVP confirmado)──▶ confirmado
confirmado ──(comando enviar carta formal)──▶ carta_formal_enviada
confirmado/carta_formal_enviada ──(recordatorio automático)──▶ recordatorio_enviado
invitacion_enviada ──(RSVP decline)──▶ no_asistira
cualquiera ──(fecha boda)──▶ post_boda
```

### Campo `stage` en BD
- **Dónde:** cada entrada de `wedding:guests` (Redis) + campo nuevo en Postgres si se requiere reporte
- **Formato:**
```json
{
  "name": "María Pérez",
  "phone": "+56912345678",
  "email": "maria@mail.com",
  "addedBy": "+56966283141",
  "createdAt": "...",
  "stage": "confirmado",          // ← NUEVO: ciclo de vida
  "rsvpStatus": "✅ Confirmado (form)",
  "templatesSent": [              // ← NUEVO: historial de envíos
    { "name": "save_the_date_v4_img", "ts": "...", "wamid": "..." }
  ],
  "stageUpdatedAt": "..."
}
```

---

## 3. Comandos del novio (envío MANUAL de plantillas)

| Comando | Acción |
|---------|--------|
| `enviar invitación a {phone}` | Envía `save_the_date_v4_img` al invitado → stage `invitacion_enviada` |
| `enviar invitación a todos` | Batch a todos en stage `nuevo` |
| `enviar carta formal a {phone}` | Envía carta de invitación formal → stage `carta_formal_enviada` |
| `enviar carta formal a confirmados` | Batch a todos en stage `confirmado` |
| `enviar info a {phone}` | Envía `boda_info_img` (manual alternativo) |
| `ver invitados` | Lista con stage de cada invitado |
| `ver confirmaciones` / `ver nombres` | (ya implementado) |

---

## 4. Carta de invitación formal (template NUEVO a crear)

**Nombre sugerido:** `invitacion_formal` (o `carta_invitacion`)
**Categoría:** UTILITY | **Idioma:** es | **Header:** IMAGE (foto pareja) | **Requiere aprobación Meta (~24-48h)**

### Body propuesto
```
Tenemos el honor de invitarte a nuestra boda.

{{1}} y {{2}} nos casamos el {{3}} de {{4}} de {{5}}.

📍 Lugar: {{6}}
🕕 Hora: {{7}} hrs
👔 Dress code: {{8}}

🎁 Código de novios: {{9}}
🔗 Confirma o consulta: {{10}}

¡Te esperamos! 💍
```

### Variables (10)
| Var | Ejemplo |
|-----|---------|
| {{1}} | Alejandro |
| {{2}} | Kuilen |
| {{3}} | 17 |
| {{4}} | noviembre |
| {{5}} | 2026 |
| {{6}} | Restaurante Meihua, Av. Pedro Aguirre Cerda 5761, Cerrillos |
| {{7}} | 18:00 |
| {{8}} | Semi Formal |
| {{9}} | ALEJKUIL (código de novios codigonovios.cl) |
| {{10}} | alejandro-kuilen.noscasamos.vip |

### Botones (URL)
| Texto | URL |
|-------|-----|
| Confirmar asistencia | https://alejandro-kuilen.noscasamos.vip/rsvp.html |
| Mesa de regalos | https://codigonovios.cl/n/ALEJKUIL |

---

## 5. Auto-envío al confirmar (SOLO calendario — comportamiento actual)

Se MANTIENE el `confirmMsg` actual que se envía cuando el invitado confirma:
```
¡Gracias por confirmar, nos alegra mucho! 🎉

📅 Agregá el evento a tu calendario: {calendarUrl}

📍 {lugar}
🕕 {hora} hrs
👔 {dressCode}

Pronto te llegará la invitación formal. ¡Nos vemos! ✨
```
- ✅ **Solo texto con link del calendario** — NO es un template de Meta
- La **carta formal** se envía aparte, por comando manual del novio (decisión #2)

---

## 6. Recordatorios automáticos (propuesta de días)

> Cron programado en el bot. Solo a invitados con `stage: invitacion_enviada` (sin RSVP aún).

| Recordatorio | Cuándo (antes de la boda) | Ejemplo (boda 17-Nov) | Contenido |
|--------------|---------------------------|------------------------|-----------|
| R1 | **T-30 días** | 18-Oct | Texto libre: "Faltan 30 días... ¿Confirmas?" (o template) |
| R2 | **T-7 días** | 10-Nov | Template `save_the_date_v4_img` reenvío o texto con botón URL |
| R3 | **T-24h** | 16-Nov | Texto libre: "¡Mañana es la boda! Confirma si vas" |

**Reglas:**
- Solo a invitados sin respuesta (`stage: invitacion_enviada`)
- Máx 1 recordatorio cada 7 días por invitado (anti-spam Meta)
- Los recordatorios usan **texto libre dentro de la ventana 24h** si el invitado ya interactuó; si no, template
- Configurable: `reminders: { tMinus30: true, tMinus7: true, tMinus1: true }`

---

## 7. Fases de implementación (si se aprueba)

| Fase | Alcance |
|------|---------|
| **F1** | Campo `stage` en `wedding:guests` + comandos manuales (`enviar invitación a {phone}` / `a todos`) |
| **F2** | Crear y aprobar template `invitacion_formal` en Meta + comando `enviar carta formal` |
| **F3** | Cron de recordatorios (T-30 / T-7 / T-24h) con reglas anti-spam |
| **F4** | Batch `enviar carta formal a confirmados` + endpoint admin `GET /admin/guests` con stages |

---

## 8. Decisiones pendientes de Alejandro (para aprobar la v2)

1. ✅ Template de invitación inicial: `save_the_date_v4_img` (aprobado) — confirmar
2. ✅ Nombre del template formal: `invitacion_formal` vs `carta_invitacion`
3. ✅ Días de recordatorios: ¿T-30 / T-7 / T-24h está bien? ¿Agregar T-14?
4. ✅ ¿Código de novios real para la carta? (ALEJKUIL es placeholder — confirmar slug de codigonovios)
5. ✅ ¿El campo `stage` va también a Postgres o solo Redis?
