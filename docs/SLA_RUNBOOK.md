# SLA & Runbook — claw-wedding-agent

> v1.6.0 — 26-Jul-2026
> Tenant: Boda Kuilen & Alejandro (17 Nov 2026)

## SLA Objetivo

| Servicio | Target | Medición |
|----------|--------|----------|
| Uptime | 99.5% | Railway status + `/status` endpoint |
| Latencia RSVP | <3s | Claude API timeout 10s + Redis write |
| Latencia auto-reply | <5s | Claude API timeout 15s + WhatsApp send |
| Entrega mensajes | Depende de Meta (fuera de control directo) | Webhook delivery notifications |

## Dependencias

```
claw-wedding-agent (Railway)
├── Redis (Railway nativo) ← ONLINE
├── Meta WhatsApp API (v22.0) ← token EAAXQQ5f0RxU...
├── Anthropic API (claude-sonnet-4-6) ← CLAUDE_API_KEY
├── Slack API (Mateo bot) ← SLACK_BOT_TOKEN
└── Railway Platform ← https://railway.com
```

## Variables de Entorno (10/10 Railway + 8 internas)

### Railway (Service Variables)
| Variable | Configurada | Nota |
|----------|-----------|------|
| CLAUDE_API_KEY | ✅ | Anthropic API key |
| CLAUDE_MODEL | ✅ | `claude-sonnet-4-6` |
| META_APP_ID | ✅ | `1261291912568631` |
| META_APP_SECRET | ✅ | App secret |
| PHONE_NUMBER_ID | ✅ | `1268610086327579` |
| REDIS_URL | ✅ | `${{Redis.REDIS_URL}}` (referencia nativa) |
| SLACK_BOT_TOKEN | ✅ | Mateo bot `xoxb-6…elrl` |
| SLACK_CHANNEL_ID | ✅ | `C0BK70984TZ` (PE) |
| VERIFY_TOKEN | ✅ | Webhook verification |
| WHATSAPP_TOKEN | ✅ | System User token |

### Pendientes
| Variable | Prioridad | Bloquea |
|----------|-----------|---------|
| SLACK_SIGNING_SECRET | 🟡 P1 | Slack Events API bidireccional |

## Monitoreo

### Health Checks

```bash
# 1. Status endpoint
curl https://claw-wedding-agent-production.up.railway.app/status
# Esperado: { "status": "ok", "llmRSVP": true, "redis": true, "version": "1.6.0" }

# 2. WhatsApp number health
curl -H "Authorization: Bearer $WHATSAPP_TOKEN" \
  "https://graph.facebook.com/v22.0/1268610086327579/whatsapp_business_health"
# Esperado: can_send_message: AVAILABLE

# 3. Redis connectivity (vía /status)
# llmRSVP: true + redis: true = todo OK

# 4. Slack connectivity (vía /status)
# slack: true = SLACK_BOT_TOKEN válido
```

### Logs clave en Railway Console

| Log | Qué indica |
|-----|-----------|
| `🚀 claw-wedding-agent v1.6.0` | Inicio correcto |
| `✅ Redis connected` | Redis online |
| `🤖 Claude RSVP:` | Clasificación LLM exitosa |
| `⚠️ Claude disabled, falling back` | CLAUDE_API_KEY no configurada |
| `📨 Webhook received` | WhatsApp message entrante |
| `✅ Message sent` | WhatsApp delivery aceptado por Meta |
| `⚠️ Slack message send failed` | Problema de conectividad Slack |

## Incidentes

### Incidente 1: Business Verification (25-26 Jul)
- **Síntoma:** `message_status: accepted` pero mensajes no entregados
- **Causa:** BUSINESS `2065338583688337` en estado LIMITED (error 141010)
- **Impacto:** Templates de marketing bloqueados, texto libre funciona dentro de ventana 24h
- **Resolución:** Documentos subidos a Meta 26-Jul ~09:55, ETA aprobación ~28-Jul
- **Workaround:** Usar texto libre (requiere ventana 24h abierta) o esperar aprobación

### Incidente 2: Token 401 (25-Jul)
- **Síntoma:** WhatsApp API devuelve 401 Unauthorized
- **Causa:** Meta App Wedding Planner no asignada al System User `61566630796479`
- **Resolución:** Alejandro asignó la app al System User en Meta Business Settings
- **Lección:** Token 401 ≠ expirado. Verificar permisos de app primero.

## Procedimientos de Recuperación

### Redeploy manual
```bash
# Desde Railway dashboard: Deployments → Deploy
# O push a mirror:
cd projects/wedding-planner
git push mirror master
```

### Rollback a v1.5.0 (OpenAI)
```bash
git revert 5eca0bb 836e020
git push origin master && git push mirror master
# Railway auto-deploy
```

### Rotar WHATSAPP_TOKEN
1. Generar nuevo token en Meta Business Settings → System Users → `61566630796479`
2. Actualizar en Railway dashboard → Variables → WHATSAPP_TOKEN
3. Deploy

### Reiniciar Redis
1. Railway dashboard → Redis service → Restart
2. Verificar: `GET /status` → `redis: true`

## Contactos

| Rol | Persona | Contacto |
|-----|--------|----------|
| Dueño | Alejandro Chung | +56966283141 |
| Slack Admin | Alejandro Chung | alejandro@yeppo.cl |
| Meta Business Admin | Alejandro Chung | `alejandro@yeppo.cl` en Meta |

## Versiones

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.6.0 | 26-Jul-2026 | OpenAI → Claude (claude-sonnet-4-6) RSVP + auto-replies |
| 1.5.0 | 26-Jul-2026 | LLM RSVP con gpt-4o-mini + heuristic fallback |
| 1.4.0 | 26-Jul-2026 | Slack↔WA bidireccional + webhook simulator |
| 1.3.0 | 25-Jul-2026 | Phone-level filtering + Meta App separada |
| 1.2.1 | 25-Jul-2026 | QUICK_REPLY button handling |
| 1.2.0 | 25-Jul-2026 | Redis nativo Railway + botones interactivos |
| 1.1.0 | 25-Jul-2026 | Forward mensajes WhatsApp a Slack + auto-reply |
| 1.0.0 | 24-Jul-2026 | Deploy inicial en Railway |
