# Guía de Deploy — claw-wedding-agent

> Basado en la arquitectura probada de `claw-whatsapp-agent` (Softify) en Railway.
> **Última actualización:** 26-Jul-2026 14:35 CLT — Migración Claude v1.6.0

## 📊 Estado Actual

| Componente | Estado | Detalle |
|-----------|--------|--------|
| Repo GitHub | ✅ | `softifycl/claw-wedding-agent` (canonical) |
| Mirror GitHub | ✅ | `alejandrochungp/claw-wedding-agent` (commit `5c561c0`) |
| Railway Service | ✅ | `claw-wedding-agent` ONLINE en `claw-whatsapp-webook` |
| Railway Deploy | ✅ | v1.6.0 — Claude RSVP + auto-replies + Slack↔WA bridge |
| Server.js | ✅ | v1.6.0 — Claude (claude-sonnet-4-6) + Slack Events + RSVP LLM + auto-reply |
| Env Vars Railway | ✅ | 10/10 configuradas (incluye CLAUDE_API_KEY + CLAUDE_MODEL) |
| Redis | ✅ | Railway Redis nativo — conexión funcionando |
| Webhook Verification | ✅ | Verificado con `VERIFY_TOKEN` real |
| Meta App Softify | ✅ | App `1636363614308117` — webhook → `softify-...railway.app` |
| Meta App Wedding Planner | ✅ | App `1261291912568631` (reciclada, no usada) — webhook → `claw-wedding-agent...railway.app` |
| Número Wedding Planner 5497 | ✅ | CONNECTED, CLOUD_API, VERIFIED — listo para enviar |
| Número Softify 3050 | ✅ | CONNECTED, CLOUD_API — 3050 se usa activamente |
| Slack Canal | ✅ | `C0BK70984TZ` (canal PE) |
| Template save_the_date | ⏳ | ID `4059477664346100`, status PENDING (HEADER TEXT, 2 QUICK_REPLY) |
| Sitio Web | ⏳ | Pendiente GitHub Pages |

## 🏗️ Arquitectura Final — 2 Meta Apps Separadas

```
WABA 1004041115557689
├── Meta App Softify (1636363614308117)
│   ├── Webhook → softify-whatsapp-webhook-production.up.railway.app/webhook
│   └── Número: +56 9 4170 3050 (Phone ID 1122911184237640)
│
└── Meta App Wedding Planner (1261291912568631) ← RECICLADA
    ├── Webhook → claw-wedding-agent-production.up.railway.app/webhook
    └── Número: +56 9 9463 5497 (Phone ID 1268610086327579)
```

**Flujo de mensajes:**
- Ambas apps comparten el mismo WABA → ambas reciben webhooks de TODOS los números
- Cada servidor filtra por `metadata.phone_number_id` en el payload
- Softify server procesa solo mensajes del 3050
- Wedding Agent procesa solo mensajes del 5497

**Ventajas de Meta Apps separadas:**
- Webhooks independientes sin conflicto
- Aislamiento total entre proyectos
- No requiere phone-level webhook (que NO existe vía API)
- Cada app puede tener sus propios templates, tokens, y config

## 🔑 Credenciales

### Meta App Softify (existente)
| Campo | Valor |
|-------|-------|
| App ID | `1636363614308117` |
| App Secret | `cccf4cdca8ea02b2fb3da682b9e5e345` |
| WABA ID | `1004041115557689` |
| WhatsApp Token | `EAAXQQ5f0RxU...` |
| Archivo | `.secrets/softify_meta_app.txt` |

### Meta App Wedding Planner v2 (creada 02-Ago-2026) ✅ ACTUAL
| Campo | Valor |
|-------|-------|
| App ID | `1590375222487560` |
| App Secret | `9f2ac26c72733fd7a771b6b858cad3de` |
| WABA ID | `1004041115557689` (compartido) |
| Phone Number ID | `1268610086327579` (+56994635497) |
| System User | `61590110639479` (employee) |
| Archivos | `.secrets/wedding_meta_app_v2.txt`, `.secrets/wedding_meta_app_v2_token.txt` |
| Suscripción WABA | ✅ `POST /1004041115557689/subscribed_apps` (02-Ago) |
| Webhook | ✅ `claw-wedding-agent-production.up.railway.app/webhook` + campo `messages` v26.0 |
| Reemplaza a | `1261291912568631` (app reciclada, descartada) |

### Railway (proyecto CORRECTO — separado de Yeppo/Softify)
| Campo | Valor |
|-------|-------|
| Proyecto | `claw-wedding-agent` |
| Project ID | `fca8623e-d99c-40be-89e6-619957ab189d` |
| Service ID | `8ab66ea2-366b-4155-928e-0163df175c5a` |
| URL | `https://railway.com/project/fca8623e-d99c-40be-89e6-619957ab189d` |
| Project Token | `23f5f6ec-f449-4f81-954d-881a5c9c0767` → `.secrets/railway_wedding_project_token.txt` |
| Dominio público | `claw-wedding-agent-production.up.railway.app` |

> ⚠️ **Lección 02-Ago:** el servicio estaba originalmente en el proyecto `claw-whatsapp-webook` (c43915bc, de Yeppo/Softify) — por eso las respuestas salían desde otro teléfono. Alejandro creó proyecto separado `fca8623e`. NUNCA mezclar servicios de distintos negocios en el mismo proyecto Railway.

## 📋 Diagnóstico 25-Jul-2026 — Resuelto

### Problema original: Conflicto de Meta App compartida
Softify y Wedding Planner compartían la misma Meta App. Una Meta App = un solo webhook URL.
Al cambiar el webhook a Wedding Planner, Softify dejó de recibir mensajes.

### Solución: Meta App separada (Opción A)
Alejandro recicló una Meta App existente que no se usaba (ID `1261291912568631`):
1. ✅ Webhook de Softify restaurado → `softify-...railway.app`
2. ✅ Webhook de Wedding Planner configurado en nueva app → `claw-wedding-agent...railway.app`
3. ✅ server.js v1.3.0 con phone-level filtering para que cada server procese solo sus mensajes
4. ✅ META_APP_ID y META_APP_SECRET agregados a Railway env vars

### Phone-level webhook: NO disponible
Subagente `wa-phone-webhook-register` confirmó que el webhook a nivel de número es read-only vía API.
No se puede cambiar programáticamente. La solución de Meta Apps separadas es la correcta.

### Corrección: 5497 está CONNECTED con CLOUD_API
Diagnóstico anterior de `platform_type: NOT_APPLICABLE` y `#133010` estaba equivocado:
- 5497: status CONNECTED, platform_type CLOUD_API, code_verification VERIFIED ✅
- 3050: status CONNECTED, platform_type CLOUD_API, code_verification EXPIRED (pero funciona) ✅

## 🚀 Railway Env Vars (10/10)

| Variable | Valor | Nota |
|----------|-------|------|
| `PHONE_NUMBER_ID` | `1268610086327579` | Número Wedding Planner 5497 |
| `WHATSAPP_TOKEN` | `EAAXQQ5f0RxU...` | System User token (WABA-level) |
| `VERIFY_TOKEN` | `J-drYsspYZMpK29djINiH2arK2EU_DNvxP9LNiM0fuU` | Webhook verification |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Railway Redis nativo |
| `SLACK_BOT_TOKEN` | `xoxb-6…elrl` | Bot "Mateo" |
| `SLACK_CHANNEL_ID` | `C0BK70984TZ` | Canal PE |
| `META_APP_ID` | `1261291912568631` | Wedding Planner Meta App |
| `META_APP_SECRET` | `118b4faddf91c211a13c166b58cb9c14` | Wedding Planner App Secret |
| `CLAUDE_API_KEY` | `sk-ant…UwAA` | Anthropic API (mismo que Yeppo) |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Modelo Claude (mismo que chatbot Yeppo) |

### Pendientes de configurar

| Variable | Prioridad | Bloquea |
|----------|-----------|---------|
| `SLACK_SIGNING_SECRET` | 🟡 P1 | Slack Events API bidireccional |

## 🔗 Endpoints (v1.6.0)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/status` | Healthcheck (version, redis, llmRSVP, uptime) |
| GET | `/webhook` | Meta webhook verification |
| POST | `/webhook` | Meta webhook event handler |
| POST | `/slack/events` | Slack Events API (pendiente SLACK_SIGNING_SECRET) |
| GET | `/admin/config` | Tenant + configuración actual |
| GET | `/admin/rsvps` | Listar todos los RSVPs |
| GET | `/admin/stats` | Estadísticas (confirmados, rechazados, pendientes) |
| POST | `/admin/test-message` | Enviar mensaje de prueba `{to, text}` |
| POST | `/admin/test-template` | Enviar template `{to, template, params}` |
| POST | `/admin/send-from-slack` | Enviar WhatsApp desde Slack (manual) |
| POST | `/admin/simulate-webhook` | Simular mensaje entrante de WhatsApp |
| POST | `/admin/simulate-batch` | Simular múltiples RSVPs a la vez |
| GET | `/admin/conversations` | Ver mapeo Slack↔WhatsApp |

Dominio público: `https://claw-wedding-agent-production.up.railway.app`

## 📦 Deploy

```bash
# Push a ambos remotos (Railway auto-deploy desde mirror)
cd projects/wedding-planner
git push origin master    # softifycl/claw-wedding-agent (canonical)
git push mirror master    # alejandrochungp/claw-wedding-agent (Railway)
```

## ⚠️ Pendientes

1. **Esperar aprobación Business Verification** — documentos subidos 26-Jul ~09:55, ETA ~28-Jul
2. **Probar flujo completo de RSVP con Claude** — una vez que se levante el bloqueo 141010
3. **Probar `generateAndSendClaudeReply()`** — auto-replies conversacionales para mensajes no-RSVP
4. **Someter 7 templates restantes** — `recordatorio_7d`, `recordatorio_24h`, `invitacion_formal`, etc.
5. **Sitio web nupcial** — GitHub Pages con 5 páginas estáticas
6. **Crear canal #wedding-planner en Slack PE** — invitar a @Mateo y configurar `SLACK_CHANNEL_ID`
7. **Obtener `SLACK_SIGNING_SECRET` de Mateo** — para activar Slack Events API bidireccional

## 📚 Referencias

- **Proyecto:** `projects/wedding-planner/`
- **README:** `projects/wedding-planner/README.md`
- **Arquitectura:** `projects/wedding-planner/docs/ARCHITECTURE.md`
- **Templates:** `projects/wedding-planner/docs/TEMPLATES.md`
- **Flows:** `projects/wedding-planner/docs/FLOWS.md`
- **Website:** `projects/wedding-planner/docs/WEBSITE.md`
- **Claude Engine:** `projects/wedding-planner/docs/CLAUDE_REPLY_ENGINE.md` ← v1.6.0
- **SLA & Runbook:** `projects/wedding-planner/docs/SLA_RUNBOOK.md` ← v1.6.0
- **Changelog:** `projects/wedding-planner/docs/CHANGELOG.md`
- **WhatsApp Debug:** `projects/wedding-planner/docs/WHATSAPP_DEBUG.md`
- **Business Verification:** `projects/wedding-planner/docs/BUSINESS_VERIFICATION.md`
- **Resumable Upload:** `projects/wedding-planner/docs/RESUMABLE_UPLOAD_API.md`
- **Secrets:** `.secrets/wedding_meta_app.txt`, `.secrets/softify_meta_app.txt`, `.secrets/claude_yeppo_key.txt`
