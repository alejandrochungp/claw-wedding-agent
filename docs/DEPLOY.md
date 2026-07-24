# Guía de Deploy — claw-wedding-agent

> Basado en la arquitectura probada de `claw-whatsapp-agent` (Softify) en Railway.
> **Última actualización:** 24-Jul-2026 13:20 CLT

## 📊 Estado Actual

| Componente | Estado | Detalle |
|-----------|--------|--------|
| Repo GitHub | ✅ | `softifycl/claw-wedding-agent` (canonical, commit `ae790c5`) |
| Mirror GitHub | ✅ | `alejandrochungp/claw-wedding-agent` (commit `b9bf079`) |
| Railway Service | ✅ | `claw-wedding-agent` ONLINE en `claw-whatsapp-webook` |
| Railway Deploy | ✅ | v1.1.0 desplegada y funcionando |
| Server.js | ✅ | v1.1.0 — WhatsApp handling + Slack forwarding + auto-reply + templates |
| Env Vars Railway | ✅ | 5 vars configuradas y deployadas |
| Webhook Verification | ✅ | Verificado con `VERIFY_TOKEN` real — devuelve challenge correctamente |
| Meta App | ✅ | App ID `1636363614308117` (compartida con Softify) |
| Meta Webhook URL | ✅ | Cambiada a `claw-wedding-agent-production.up.railway.app/webhook` |
| Número WhatsApp | ✅ | +56994635497, Phone Number ID `1268610086327579`, VERIFIED |
| Slack Canal | ✅ | `C0BK70984TZ` (canal PE) |
| WhatsApp Templates | ⏳ | 8 templates pendientes de aprobación (~48h) |
| Sitio Web | ⏳ | Pendiente GitHub Pages |

### 🔑 Arquitectura de Repos (Decisión 24-Jul-2026)

- **Canonical:** `softifycl/claw-wedding-agent` (org) — fuente de verdad
- **Mirror:** `alejandrochungp/claw-wedding-agent` (personal) — visibilidad Railway

Razón: Railway GitHub App está instalada en `alejandrochungp` y solo indexa repos de esa cuenta.

Flujo de trabajo:
```
git push origin master     → softifycl/claw-wedding-agent (canonical)
git push mirror master     → alejandrochungp/claw-wedding-agent (Railway auto-deploy)
```

### 🔑 Meta App (Compartida con Softify)

- **App ID:** `1636363614308117`
- **App Secret:** `cccf4cdca8ea02b2fb3da682b9e5e345`
- **WABA ID:** `1004041115557689`
- **WhatsApp Token:** `EAAXQQ5f0RxU...` (mismo de Softify)
- **Webhook URL:** `https://claw-wedding-agent-production.up.railway.app/webhook`
- **VERIFY_TOKEN:** `J-drYsspYZMpK29djINiH2arK2EU_DNvxP9LNiM0fuU`

El número Wedding Planner (+56994635497) comparte la misma Meta App y WABA con Softify (+56961450273). Ambos números enrutan al mismo webhook — el server.js debe manejar multi-tenant routing.

## 🚀 Variables de Entorno (Railway)

| Variable | Valor | Estado |
|----------|-------|--------|
| `PHONE_NUMBER_ID` | `1268610086327579` | ✅ |
| `SLACK_BOT_TOKEN` | `xoxb-6…elrl` | ✅ |
| `SLACK_CHANNEL_ID` | `C0BK70984TZ` | ✅ |
| `VERIFY_TOKEN` | `J-drYsspYZMpK29djINiH2arK2EU_DNvxP9LNiM0fuU` | ✅ |
| `WHATSAPP_TOKEN` | `EAAXQQ5f0RxU...` | ✅ |

### Variables automáticas de Railway
- `PORT=8080` (Railway lo inyecta automáticamente)

## 🚀 Deploy Actual

### Dominio Público
```
https://claw-wedding-agent-production.up.railway.app
```

### Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/status` | GET | Healthcheck + estado de configuración |
| `/admin/config` | GET | Configuración completa del tenant |
| `/admin/test-message` | POST | Enviar mensaje de prueba WhatsApp |
| `/admin/test-template` | POST | Enviar template de prueba |
| `/webhook` | GET | Verificación webhook Meta |
| `/webhook` | POST | Recepción de mensajes WhatsApp |

### Verificación

```bash
# Status
curl https://claw-wedding-agent-production.up.railway.app/status
# → {"status":"ok","name":"claw-wedding-agent","version":"1.1.0","uptime":393,...}

# Webhook verification
curl "https://claw-wedding-agent-production.up.railway.app/webhook?hub.mode=subscribe&hub.verify_token=J-drYsspYZMpK29djINiH2arK2EU_DNvxP9LNiM0fuU&hub.challenge=test123"
# → 200 OK: "test123"
```

## 📊 Costos Estimados

| Recurso | Plan | Costo mensual |
|---------|------|---------------|
| Railway | Hobby ($5/mes) | $5 USD |
| Meta API | WhatsApp Business API | $0 (gratis) |
| GitHub Pages | Static hosting | $0 |
| **Total** | | **~$5 USD/mes** |

## 🔄 CI/CD

Railway auto-deploya cada push al mirror. Flujo:

```
git push origin master     → softifycl/claw-wedding-agent (canonical)
git push mirror master     → alejandrochungp/claw-wedding-agent → Railway auto-deploy
```

## 🛠 Mantenimiento

### Logs
```bash
railway logs
```

### Monitoreo
- Railway Dashboard: CPU, memoria, requests
- Slack `#C0BK70984TZ`: forward de mensajes entrantes
- Meta Business Manager: métricas de mensajería

## ⚠️ Troubleshooting

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Webhook no verifica | URL incorrecta o token mismatch | Verificar `VERIFY_TOKEN` en Railway y Meta |
| Mensajes no llegan a Slack | `SLACK_BOT_TOKEN` expirado | Regenerar token en api.slack.com/apps |
| Templates REJECTED | Formato inválido | Revisar `docs/TEMPLATES.md`, corregir y reenviar |
| Mensajes WhatsApp no entregados | Número no verificado o rate limit | Verificar en Meta Business Manager |
