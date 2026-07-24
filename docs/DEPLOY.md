# Guía de Deploy — claw-wedding-agent

> Basado en la arquitectura probada de `claw-whatsapp-agent` (Softify) en Railway.
> **Última actualización:** 24-Jul-2026

## 📊 Estado Actual

| Componente | Estado | Detalle |
|-----------|--------|--------|
| Repo GitHub | ✅ | `softifycl/claw-wedding-agent` (17 archivos, 1609 líneas, commit `ae790c5`) |
| Mirror GitHub | ✅ | `alejandrochungp/claw-wedding-agent` (commit `b9bf079`, mismo contenido) |
| Railway Service | ✅ | `claw-wedding-agent` (ID: `28d3d063`) en proyecto `claw-whatsapp-webook` |
| GitHub ↔ Railway | ✅ | Mirror conectado desde dashboard por Alejandro (24-Jul-2026) |
| Railway Deploy | ⏳ | Esperando confirmación de deploy automático |
| Meta App | ❌ | Pendiente crear en developers.facebook.com |
| Redis | ✅ | Ya existe en el proyecto (`redis-volume`) |
| Sitio Web | ❌ | Pendiente GitHub Pages |

### 🔑 Arquitectura de Repos (Decisión 24-Jul-2026)

Alejandro prefiere usar la cuenta `softifycl` como fuente canónica del código.

- **Canonical:** `softifycl/claw-wedding-agent` (org) — fuente de verdad
- **Mirror:** `alejandrochungp/claw-wedding-agent` (personal) — solo para visibilidad Railway

Razón: Railway GitHub App (installation `114756659`) está instalada en la cuenta personal `alejandrochungp` y solo indexa repos de esa cuenta. El mirror existe como workaround hasta que Railway soporte orgs directamente.

Flujo de trabajo:
```
git push origin master     → softifycl/claw-wedding-agent (canonical)
git push mirror master     → alejandrochungp/claw-wedding-agent (Railway auto-deploy)
```

### ⚠️ Resuelto: Conexión GitHub ↔ Railway (24-Jul-2026)

1. ✅ GitHub sudo mode verificado con código enviado a `alejandro@yeppo.cl`
2. ✅ PAT creado para `alejandrochungp` con scope `repo` (expira 30 días)
3. ✅ Push exitoso al mirror con el PAT
4. ✅ Alejandro conectó Railway desde el dashboard (dijo "listo")
5. ⏳ Verificar que el deploy automático se haya ejecutado

## 📋 Prerrequisitos

1. **Meta App**: WhatsApp Business App creada en developers.facebook.com
2. **Número eSIM**: Verificado como WhatsApp Business
3. **GitHub**: Cuenta con repo creado
4. **Railway**: Cuenta conectada a GitHub
5. **Redis**: Instancia (Railway addon o externa como Redis Cloud)

## 🚀 Paso a Paso

### 1. Crear Repo GitHub

```bash
# Local
cd projects/wedding-planner
git init
git add .
git commit -m "Initial commit: wedding planner agent scaffolding"

# Crear repo en GitHub (via gh CLI o web)
gh repo create softifycl/claw-wedding-agent --public
# O alternativamente:
gh repo create alejandrochungp/claw-wedding-agent --public
git remote add origin https://github.com/softifycl/claw-wedding-agent.git
git push -u origin master
```

### 2. Configurar Meta App

1. Ir a <https://developers.facebook.com/apps/>
2. Crear App → "Business" → nombre: `Wedding Planner`
3. Agregar producto "WhatsApp"
4. Configurar webhook:
   - URL: `https://wedding-planner-production.up.railway.app/webhook`
   - Verify token: `wedding_verify_2026`
   - Suscripciones: `messages`, `message_template_status_updates`
5. Obtener token permanente (System User → Generate Token)
6. Obtener `PHONE_NUMBER_ID` y `WABA_ID`
7. Configurar número eSIM en la app

### 3. Deploy en Railway

```bash
# Opción A: Desde Railway Dashboard
1. railway.app → New Project → Deploy from GitHub repo
2. Seleccionar claw-wedding-agent
3. Configurar variables de entorno (ver abajo)
4. Deploy automático

# Opción B: Desde CLI
railway login
railway init
railway up
```

### 4. Variables de Entorno

```bash
# En Railway Dashboard → Variables
WA_TOKEN=EAAx...                    # Token permanente Meta
WABA_ID=1004041115557689            # WhatsApp Business Account ID
PHONE_NUMBER_ID=217563878110256     # ID del número
REDIS_URL=redis://...               # Redis connection string
VERIFY_TOKEN=wedding_verify_2026    # Webhook verify token
SLACK_WEBHOOK=https://hooks.slack.com/services/...  # Notificaciones
SITE_URL=https://boda.alejandro-y-kuilen.cl  # URL sitio nupcial
NOTION_TOKEN=ntn_...               # Notion integration (RSVPs)
NOTION_DB_ID=...                    # DB de RSVPs
OPENAI_API_KEY=sk-...              # Para generación de imágenes/PDFs
```

### 5. Verificar Deploy

```bash
# Check status
curl https://wedding-planner-production.up.railway.app/status

# Expected response:
# { "status": "ok", "tenant": "default", "uptime": 120, "version": "1.0.0" }
```

### 6. Conectar Webhook Meta

```bash
# Test webhook
curl -X POST "https://wedding-planner-production.up.railway.app/webhook" \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[]}'

# Expected: 200 OK
```

Luego en Meta Dashboard → Webhook → "Verify and Save"

### 7. Crear Templates

```bash
# Via script (check_template.js del repo anterior)
node scripts/create_templates.js

# O manualmente en Meta Business Manager:
# https://business.facebook.com/latest/whatsapp_manager/templates
```

### 8. Sitio Web (GitHub Pages)

```bash
# En el mismo repo, branch gh-pages
git checkout -b gh-pages
# Copiar src/site/{wedding_id}/* a raíz
git add .
git commit -m "Deploy sitio nupcial"
git push origin gh-pages

# Configurar GitHub Pages en Settings → Pages → branch gh-pages
# URL: https://alejandrochungp.github.io/claw-wedding-agent/
# O usar dominio personalizado: boda.alejandro-y-kuilen.cl
```

### 9. Probar Campaña

```bash
# Enviar campaña de prueba a 1 número
curl -X POST "https://wedding-planner-production.up.railway.app/admin/campaign/start" \
  -H "Content-Type: application/json" \
  -d '{
    "wedding_id": "boda-alejandro-kuilen",
    "template": "save_the_date",
    "contacts": ["+56966283141"],
    "ratePerMinute": 1
  }'
```

### 10. Configurar Dominio Personalizado (opcional)

```bash
# Railway
railway domain wedding-planner.cl

# GitHub Pages
# Settings → Pages → Custom domain → boda.alejandro-y-kuilen.cl
# DNS: CNAME → alejandrochungp.github.io
```

## 📊 Costos Estimados

| Recurso | Plan | Costo mensual |
|---------|------|---------------|
| Railway | Hobby ($5/mes) | $5 USD |
| Redis | Railway addon o Redis Cloud free | $0 |
| Meta API | WhatsApp Business API | $0 (gratis) |
| GitHub Pages | Static hosting | $0 |
| Dominio | wedding-planner.cl (opcional) | ~$15 USD/año |
| **Total** | | **~$5-6 USD/mes** |

Para producción multi-boda (comercial), escalar Railway a Pro ($20/mes).

## 🔄 CI/CD

Railway auto-deploya cada push a `master`. Flujo:

```
git push → GitHub → Railway detecta → build + deploy → URL actualizada
```

Para sitios web (gh-pages):
```
git push → GitHub Pages → build Jekyll → deploy → URL actualizada
```

## 🛠 Mantenimiento

### Logs
```bash
railway logs
```

### Reiniciar
```bash
railway up --restart
```

### Monitoreo
- Railway Dashboard: CPU, memoria, requests
- Slack: notificaciones de campañas y errores
- Meta Business Manager: métricas de mensajería

### Backup
- Redis: snapshots automáticos (Railway managed)
- Notion: backup manual CSV de RSVPs cada 2 semanas
- Templates: documentados en `docs/TEMPLATES.md`

## ⚠️ Troubleshooting

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Webhook no verifica | URL incorrecta o token mismatch | Verificar `VERIFY_TOKEN` en Railway y Meta |
| Templates REJECTED | Formato inválido o categoría incorrecta | Revisar `docs/TEMPLATES.md`, corregir y reenviar |
| Mensajes no entregados | Número no es WhatsApp o rate limit | Verificar estado del número en Meta, reducir rate |
| Redis connection error | REDIS_URL incorrecta o Redis caído | Verificar addon en Railway |
| Sitio web no carga | gh-pages no configurado | Verificar GitHub Pages settings |
