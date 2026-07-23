# Arquitectura Técnica — claw-wedding-agent

## Diagrama de Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                        META WHATSAPP CLOUD API                    │
│                    graph.facebook.com/v21.0/{WABA_ID}             │
└──────────────────────────┬───────────────────────────────────────┘
                           │ webhook (inbound) + send (outbound)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      RAILWAY.APP                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  claw-wedding-agent (Node.js + Express)                     │ │
│  │                                                              │ │
│  │  POST /webhook  ←── Mensajes entrantes (Meta)               │ │
│  │  POST /webhook  ←── Status updates (sent/delivered/read)    │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  core/flows.js                                       │  │ │
│  │  │  State machine: IDLE → SAVE_THE_DATE → INVITACION →  │  │ │
│  │  │  RSVP → RECORDATORIOS → DIA_EVENTO → POST_BODA       │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  core/templates.js                                   │  │ │
│  │  │  Sends template messages via Meta API                 │  │ │
│  │  │  Template resolution: nombre → template_id            │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  core/contacts.js                                    │  │ │
│  │  │  Guest DB: phone, name, rsvp_status, table, group    │  │ │
│  │  │  Import: CSV, Google Sheets, Notion                   │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  tenants/{wedding_id}/config.js                      │  │ │
│  │  │  Per-wedding: WABA, phone, templates, site URL,      │  │ │
│  │  │  novios names, fecha, lugar, dress code, regalos     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                       │
│  ┌────────────────────────┼────────────────────────────────────┐ │
│  │  Redis                 │                                    │ │
│  │  session:{phone}  ─────┘  Estado de conversación            │ │
│  │  rsvp:{wedding_id}       Lista confirmados                  │ │
│  │  campaign:{id}           Estado de campaña en curso         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌─────────┐ ┌──────────┐
        │  NOTION   │ │  DRIVE  │ │  SLACK   │
        │  RSVPs    │ │  PDFs   │ │  Notif.  │
        │ Contactos │ │ Fotos   │ │  Logs    │
        └──────────┘ └─────────┘ └──────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    SITIO WEB NUPCIAL                              │
│               GitHub Pages o Railway Static                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  boda.nombrenovios.cl o nombrenovios.wedding-planner.cl     │ │
│  │                                                              │ │
│  │  /index.html      ← Landing: nombres, fecha, foto           │ │
│  │  /rsvp.html       ← Formulario confirmación asistencia      │ │
│  │  /info.html       ← Dress code, mapa, estacionamiento       │ │
│  │  /galeria.html    ← Fotos/videos de novios                  │ │
│  │  /regalos.html    ← Mesa de regalos + transferencia         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Endpoints

### WhatsApp Webhook (Meta → Railway)
```
POST /webhook
  - Recibe mensajes entrantes de invitados
  - Valida X-Hub-Signature-256
  - Procesa respuestas a templates (botones)
  - Actualiza estado RSVP en Redis/Notion
```

### WhatsApp Send (Railway → Meta)
```
POST graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
  - Envía templates aprobados
  - Envía mensajes de texto libre (24h window)
  - Envía media (PDFs, imágenes)
```

### Admin (Railway local)
```
GET  /status                          — Uptime + tenant info
GET  /admin/logs?n=100                — Últimos N logs
POST /admin/campaign/start            — Iniciar campaña
POST /admin/campaign/pause            — Pausar campaña
GET  /admin/campaign/{id}/status      — Métricas campaña
GET  /admin/rsvp/{wedding_id}         — Lista confirmados
POST /admin/contacts/import           — Importar CSV invitados
```

### Sitio Web (público)
```
GET  /rsvp/submit?name=X&phone=Y&guests=N&diet=Z
  - Recibe confirmación del formulario web
  - Guarda en Redis → Notion
  - Dispara template confirmación_rsvp por WhatsApp
```

## Variables de Entorno (Railway)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `WA_TOKEN` | Token permanente Meta API | `EAAx...` |
| `WABA_ID` | WhatsApp Business Account ID | `1004041115557689` |
| `PHONE_NUMBER_ID` | ID del número de teléfono | `217563878110256` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `NOTION_TOKEN` | Notion integration token | `ntn_...` |
| `NOTION_DB_ID` | DB de RSVPs en Notion | `215c8973...` |
| `SLACK_WEBHOOK` | Webhook para logs | `https://hooks.slack...` |
| `SITE_URL` | URL del sitio nupcial | `https://boda.alejandro-y-kuilen.cl` |
| `VERIFY_TOKEN` | Token verificación webhook Meta | `wedding_verify_2026` |

## State Machine

```
        ┌──────────┐
        │   IDLE   │ ← Estado inicial / mensaje random
        └────┬─────┘
             │ trigger: campaña save_the_date
             ▼
        ┌──────────────┐
        │ SAVE_THE_DATE │ → Envía template con PDF + link calendario
        └──────┬───────┘
               │ trigger: campaña invitacion
               ▼
        ┌──────────────┐
        │  INVITACION   │ → Envía carta formal PDF + link sitio web
        └──────┬───────┘
               │ trigger: invitado abre sitio / responde template
               ▼
        ┌──────────┐
        │   RSVP   │ → Recibe confirmación + asigna mesa
        └────┬─────┘
             │ trigger: cron 7 días antes del evento
             ▼
        ┌────────────────┐
        │ RECORDATORIO_7D │ → Info final, clima, estacionamiento
        └──────┬─────────┘
               │ trigger: cron 24h antes
               ▼
        ┌────────────────┐
        │ RECORDATORIO_24H│ → Checklist último minuto
        └──────┬─────────┘
               │ trigger: cron día del evento
               ▼
        ┌──────────────┐
        │ DIA_EVENTO   │ → "¡Nos casamos hoy!" + mapa en vivo
        └──────┬───────┘
               │ trigger: cron día después
               ▼
        ┌──────────┐
        │ POST_BODA │ → Agradecimiento + link fotos
        └──────────┘
```

## Campañas (Batch Sending)

Las campañas se disparan vía endpoint admin o cron:

```
POST /admin/campaign/start
{
  "wedding_id": "boda-alejandro-kuilen",
  "template": "save_the_date",
  "contacts": ["+56966283141", "+56912345678", ...],
  "ratePerMinute": 10   // límite para evitar rate-limit de Meta
}
```

- **Rate limit:** 30-60 msg/minuto por número (Meta guideline)
- **Batch size:** 50 contactos por lote
- **Delay entre lotes:** 60 segundos
- **Retry:** 3 intentos con backoff exponencial
- **Métricas:** delivered, read, clicked por campaña

## Multi-Tenant

Cada boda es un tenant con su propia:
- WABA + número de teléfono (o sub-número)
- Templates aprobados
- Sitio web personalizado
- Lista de invitados
- Configuración (fecha, lugar, dress code, regalos)

```javascript
// tenants/boda-alejandro-kuilen/config.js
module.exports = {
  id: 'boda-alejandro-kuilen',
  novios: { nombre1: 'Alejandro', nombre2: 'Kuilen' },
  fecha: '2026-11-17',
  hora: '18:00',
  lugar: 'Restaurante Meihua, Av. Pedro Aguirre Cerda 5761, Cerrillo',
  dressCode: 'Formal / Temática China-Coreana',
  wabaId: process.env.WABA_ID,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  siteUrl: 'https://boda.alejandro-y-kuilen.cl',
  templates: {
    save_the_date: 'plantilla_save_the_date',
    invitacion_formal: 'plantilla_invitacion_formal',
    confirmacion_rsvp: 'plantilla_confirmacion_rsvp',
    recordatorio_7d: 'plantilla_recordatorio_7d',
    recordatorio_24h: 'plantilla_recordatorio_24h',
    dia_evento: 'plantilla_dia_evento',
    post_boda: 'plantilla_post_boda',
  },
  regalos: {
    codigoNovios: 'https://www.codigonovios.cl/...',
    paris: 'https://www.paris.cl/listas-de-novios/...',
    falabella: 'https://www.falabella.com/...',
    transferencia: { banco: 'BancoEstado', rut: '18.463.025-7', cuenta: '...' },
  }
};
```
