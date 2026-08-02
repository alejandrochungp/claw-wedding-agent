# Changelog — claw-wedding-agent

## v1.6.0 — 26-Jul-2026 14:35 CLT

### Cambios
- **OpenAI → Claude:** RSVP classification migrada de `gpt-4o-mini` a `claude-sonnet-4-6`
- **Auto-reply engine:** Nueva función `generateAndSendClaudeReply()` para respuestas conversacionales
- **Mismo modelo que Yeppo:** Consistencia operativa con el chatbot de WhatsApp principal

### Technical
- `OPENAI_API_KEY` → `CLAUDE_API_KEY` (env var)
- Nuevo `CLAUDE_MODEL` = `claude-sonnet-4-6` (env var)
- API endpoint: `https://api.anthropic.com/v1/messages`
- Auth: `x-api-key` header + `anthropic-version: 2023-06-01`
- `llmRSVP: true` en `/status` cuando CLAUDE_API_KEY está configurada
- Fallback: `heuristicRSVP()` con detección de negación si Claude no disponible

### Railway
- 10/10 env vars (delete OPENAI_API_KEY, add CLAUDE_API_KEY + CLAUDE_MODEL)
- Railway Redis nativo (referencia `${{Redis.REDIS_URL}}`)

### Archivos nuevos
- `docs/CLAUDE_REPLY_ENGINE.md` — Documentación del engine de auto-reply
- `docs/SLA_RUNBOOK.md` — SLA & Runbook operativo
- `docs/CHANGELOG.md` — Este archivo

## v1.5.0 — 26-Jul-2026 13:23 CLT

### Cambios
- **LLM RSVP classification:** OpenAI `gpt-4o-mini` para clasificar intención semántica
- **Fallback heurístico:** Detección de negación si no hay API key
- **Mateo Slack App:** Reutilización del token existente

## v1.4.0 — 26-Jul-2026 10:32 CLT

### Cambios
- **Slack↔WhatsApp bridge:** Formato `+569XXXXXXXX mensaje` en Slack
- **Slack Events endpoint:** `POST /slack/events` (pendiente SLACK_SIGNING_SECRET)
- **RSVP mejorado:** Detección de confirmaciones en texto libre
- **Webhook simulator:** `POST /admin/simulate-webhook` y `/admin/simulate-batch`
- **Conversation tracking:** Redis mapeo Slack ↔ WhatsApp
- **Delivery notifications:** Status de entrega a Slack

## v1.3.0 — 25-Jul-2026

### Cambios
- **Phone-level filtering:** Filtro por `metadata.phone_number_id`
- **Meta App separada:** Wedding Planner app `1261291912568631` independiente de Softify
- Nuevas env vars: `META_APP_ID`, `META_APP_SECRET`

## v1.2.1 — 25-Jul-2026

### Cambios
- **QUICK_REPLY handling:** Soporte para IDs de Meta + IDs legacy

## v1.2.0 — 25-Jul-2026

### Cambios
- **Redis nativo Railway:** `${{Redis.REDIS_URL}}` en lugar de Upstash
- **Botones interactivos:** `confirmar_asistencia` / `no_asistire`
- Endpoints: `/admin/rsvps`, `/admin/stats`

## v1.1.0 — 25-Jul-2026

### Cambios
- **Forward WhatsApp → Slack:** Mensajes entrantes a canal PE
- **Auto-reply keywords:** hola, fecha, confirmar, RSVP
- **Admin endpoints:** `/admin/config`, `/admin/test-message`, `/admin/test-template`

## v1.0.0 — 24-Jul-2026

### Cambios
- **Deploy inicial en Railway**
- Webhook verification con Meta
- 5 env vars configuradas
- Repo canonical: `softifycl/claw-wedding-agent`
- Mirror deploy: `alejandrochungp/claw-wedding-agent`
