# Guía de Deploy — claw-wedding-agent

> Basado en la arquitectura probada de `claw-whatsapp-agent` (Softify) en Railway.
> **Última actualización:** 02-Ago-2026 20:10 CLT — DeepSeek LLM funcional (fix 401) + proyecto fca8623e

## 📊 Estado Actual (02-Ago-2026 20:10)

| Componente | Estado | Detalle |
|-----------|--------|--------|
| Repo GitHub | ✅ | `softifycl/claw-wedding-agent` (origin) + `alejandrochungp/claw-wedding-agent` (mirror, Railway auto-deploy) — rama `master` |
| Railway Service | ✅ | `claw-wedding-agent` ONLINE en proyecto dedicado `fca8623e` |
| Railway Deploy | ✅ | v1.6.0 — DeepSeek RSVP + auto-replies + Slack↔WA bridge |
| Server.js | ✅ | v1.6.0 — DeepSeek (deepseek-chat) + Slack Events + RSVP LLM + auto-reply |
| Env Vars Railway | ✅ | DEEPSEEK_API_KEY **válida** (fix 20:10) + DEEPSEEK_MODEL + META_APP_ID v2 |
| Redis | ✅ | Railway Redis nativo — conexión funcionando |
| Webhook Verification | ✅ | Verificado con `VERIFY_TOKEN` real |
| Meta App Wedding Planner v2 | ✅ | App `1590375222487560` — suscrita al WABA + webhook → `claw-wedding-agent...railway.app` |
| Número Wedding Planner 5497 | ✅ | CONNECTED, CLOUD_API, VERIFIED — Phone ID `1268610086327579` |
| Slack Canal | ✅ | `C0BK70984TZ` (#wedding-planner) — app Wedding Planner dedicada |
| Flujo completo E2E | ✅ | Template → botón → RSVP Redis → respuesta WA + texto libre LLM (20:10) |
| Filtro Softify (5497/3050) | ✅ | Verificado en logs: Softify skipea eventos del 5497 |
| Sitio Web | ⏳ | Pendiente — addon domain `noscasamos.vip` requiere UI cPanel Bluehost |

## 🔑 CREDENCIALES ACTUALES (02-Ago)

### Meta App Wedding Planner v2 ✅ ACTUAL
| Campo | Valor |
|-------|-------|
| App ID | `1590375222487560` |
| App Secret | `9f2ac26c72733fd7a771b6b858cad3de` |
| WABA ID | `1004041115557689` (compartido con Softify) |
| Phone Number ID | `1268610086327579` (+56994635497) |
| System User | `61590110639479` (employee) |
| Archivos | `.secrets/wedding_meta_app_v2.txt`, `.secrets/wedding_meta_app_v2_token.txt` |
| Suscripción WABA | ✅ `POST /1004041115557689/subscribed_apps` (02-Ago) |
| Webhook | ✅ `claw-wedding-agent-production.up.railway.app/webhook` + campo `messages` v26.0 |

### Railway (proyecto CORRECTO — separado de Yeppo/Softify)
| Campo | Valor |
|-------|-------|
| Proyecto | `claw-wedding-agent` |
| Project ID | `fca8623e-d99c-40be-89e6-619957ab189d` |
| Service ID | `8ab66ea2-366b-4155-928e-0163df175c5a` |
| Project Token | `23f5f6ec-f449-4f81-954d-881a5c9c0767` → `.secrets/railway_wedding_project_token.txt` |
| Dominio público | `claw-wedding-agent-production.up.railway.app` |

## 🚀 Railway Env Vars (estado 02-Ago 20:10)

| Variable | Valor | Nota |
|----------|-------|------|
| `PHONE_NUMBER_ID` | `1268610086327579` | Número Wedding Planner 5497 |
| `WHATSAPP_TOKEN` | `EAAXQQ5f0RxU...` | System User token (WABA-level) |
| `VERIFY_TOKEN` | `J-drYsspYZMpK29djINiH2arK2EU_DNvxP9LNiM0fuU` | Webhook verification |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Railway Redis nativo |
| `SLACK_BOT_TOKEN` | `xoxb-6062936...` | App Wedding Planner (`.secrets/slack_wedding_planner.txt`) |
| `SLACK_SIGNING_SECRET` | `8a58a7b969d40aca33c020324e4fff2c` | App Wedding Planner |
| `SLACK_CHANNEL_ID` | `C0BK70984TZ` | #wedding-planner (privado) |
| `META_APP_ID` | `1590375222487560` | Wedding Planner v2 |
| `META_APP_SECRET` | `9f2ac26c72733fd7a771b6b858cad3de` | Wedding Planner v2 |
| `DEEPSEEK_API_KEY` | `sk-db6f22a...b4dc` | **FIX 20:10** — la anterior daba 401 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | DeepSeek Flash (regla: sin Anthropic) |
| `CLAUDE_API_KEY` | `sk-ant...` | 🗑️ RESIDUO — borrar (ya no se usa) |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | 🗑️ RESIDUO — borrar (ya no se usa) |

## 🔑 Lección crítica: sesión OAuth del CLI Railway (02-Ago)

- El CLI guarda sesión OAuth en `C:\Users\achun\.railway\config.json` (accessToken + refreshToken de alejandro@yeppo.cl)
- **Si se setea `RAILWAY_TOKEN` (env var) → TODO da "Unauthorized"** (el env sobreescribe la sesión OAuth)
- **Solución:** en Python usar `env.pop("RAILWAY_TOKEN", None)` y dejar que el CLI use la sesión guardada → `railway whoami` = "Logged in as alejandro@yeppo.cl"
- `config.json` puede tener el repo linkeado al proyecto EQUIVOCADO (ej: wedding-planner → 5278e66d Softify). Verificar con `railway status` y relinkear: `railway link -p fca8623e-d99c-40be-89e6-619957ab189d -s claw-wedding-agent` desde el repo
- GraphQL API (`backboard.railway.app/graphql/v2`) bloqueada por Cloudflare (403 error 1010) — NO usar
- Los project tokens en `.secrets/` pueden dar Unauthorized/Invalid — la sesión OAuth es la vía confiable
- Comandos útiles: `railway logs` (runtime), `railway variable list`, `railway variable --set "KEY=val"`, `railway deployment list`
- Verificar redeploy: GET `/status` → `uptime` bajo = build nuevo

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
