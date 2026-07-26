# Guía de Deploy — claw-wedding-agent

> Basado en la arquitectura probada de `claw-whatsapp-agent` (Softify) en Railway.
> **Última actualización:** 25-Jul-2026 18:14 CLT

## 📊 Estado Actual

| Componente | Estado | Detalle |
|-----------|--------|--------|
| Repo GitHub | ✅ | `softifycl/claw-wedding-agent` (canonical) |
| Mirror GitHub | ✅ | `alejandrochungp/claw-wedding-agent` (commit `5c561c0`) |
| Railway Service | ✅ | `claw-wedding-agent` ONLINE en `claw-whatsapp-webook` |
| Railway Deploy | ✅ | v1.3.0 desplegada con phone filtering + Meta App separada |
| Server.js | ✅ | v1.3.0 — WhatsApp + Slack + templates + Redis RSVP + QUICK_REPLY + phone filtering |
| Env Vars Railway | ✅ | 8/8 configuradas (incluye META_APP_ID y META_APP_SECRET) |
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

### Meta App Wedding Planner (reciclada 25-Jul-2026)
| Campo | Valor |
|-------|-------|
| App ID | `1261291912568631` |
| App Secret | `118b4faddf91c211a13c166b58cb9c14` |
| WABA ID | `1004041115557689` (compartido) |
| Phone Number ID | `1268610086327579` (+56994635497) |
| Archivo | `.secrets/wedding_meta_app.txt` |

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

## 🚀 Railway Env Vars (8/8)

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

## 🔗 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/status` | Healthcheck (versión, Redis, RSVP count) |
| GET | `/webhook` | Meta webhook verification |
| POST | `/webhook` | Meta webhook event handler |
| GET | `/admin/config` | Tenant + configuración |
| POST | `/admin/test-message` | Enviar mensaje de prueba `{to, text}` |
| POST | `/admin/test-template` | Enviar template `{to, template, params}` |
| GET | `/admin/rsvps` | Listar todos los RSVPs |
| GET | `/admin/stats` | Estadísticas (confirmados, rechazados, pendientes) |

Dominio público: `https://claw-wedding-agent-production.up.railway.app`

## 📦 Deploy

```bash
# Push a ambos remotos (Railway auto-deploy desde mirror)
cd projects/wedding-planner
git push origin master    # softifycl/claw-wedding-agent (canonical)
git push mirror master    # alejandrochungp/claw-wedding-agent (Railway)
```

## ⚠️ Pendientes

1. **Probar envío desde número 5497** — una vez que el template `save_the_date` sea aprobado por Meta
2. **Añadir imagen al template** — HEADER TEXT → HEADER IMAGE con `portadaweb_missclick.jpg`
3. **Probar flujo completo de RSVP** — enviar WhatsApp → botones → Redis → Slack PE
4. **Someter 7 templates restantes** — `recordatorio_7d`, `recordatorio_24h`, `invitacion_formal`, etc.
5. **Sitio web nupcial** — GitHub Pages con 5 páginas estáticas

## 📚 Referencias

- **Proyecto:** `projects/wedding-planner/`
- **README:** `projects/wedding-planner/README.md`
- **Arquitectura:** `projects/wedding-planner/docs/ARCHITECTURE.md`
- **Templates:** `projects/wedding-planner/docs/TEMPLATES.md`
- **Flows:** `projects/wedding-planner/docs/FLOWS.md`
- **Website:** `projects/wedding-planner/docs/WEBSITE.md`
- **Secrets:** `.secrets/wedding_meta_app.txt`, `.secrets/softify_meta_app.txt`, `.secrets/softify_wa_token.txt`
