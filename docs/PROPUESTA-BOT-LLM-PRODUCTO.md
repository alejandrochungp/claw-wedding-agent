# Propuesta — WhatsApp Bot con LLM para Bodas (Productizable)

> **Fecha:** 02-Ago-2026 | **Autor:** Claw + Alejandro
> **Objetivo:** Convertir claw-wedding-agent en un producto SaaS estandarizable y monetizable: bot WhatsApp con LLM para bodas (RSVP, recordatorios, respuestas automáticas).

---

## 1. Diagnóstico Actual (02-Ago-2026)

### ✅ Lo que funciona
| Componente | Estado |
|-----------|--------|
| Envío de templates (texto e imagen) | ✅ Verificado hoy (con fix error 131053) |
| Business Verification | ✅ Envíos funcionan (aunque status sigue `pending`) |
| Handler de botones QUICK_REPLY en el agente | ✅ Probado vía simulación (RSVP → Redis) |
| Agente Railway (claw-wedding-agent v1.6.1) | ✅ Online, WhatsApp+Slack+Redis+LLM configurados |
| Webhook URL del agente | ✅ `https://claw-wedding-agent-production.up.railway.app/webhook` (verify token responde OK) |

### ❌ Lo que NO funciona (causa raíz encontrada)
| Problema | Causa | Evidencia |
|----------|-------|-----------|
| **Los mensajes entrantes no llegan a Slack** | La app Wedding Planner (`1261291912568631`) **NO está suscrita al WABA** (`1004041115557689`). Solo la app Softify (`1636363614308117`) está suscrita. | `GET /1004041115557689/subscribed_apps` → solo Softify |
| Clicks de botones de invitados reales no llegan al agente | Ídem — los eventos del 5497 llegan al webhook de Softify (filtra por phone `1122911184237640` y descarta el 5497) | Logs Softify no muestran eventos 5497 |
| Intento de suscribir app Wedding Planner vía API | App token no tiene permisos sobre el WABA (subcode 33) — la app NO está conectada al WABA | `POST /subscribed_apps` → error 33 |
| LLM usa Claude (`claude-sonnet-4-6`) | ⛔ **VIOLA REGLA PERMANENTE** (18-Jul-2026): NO usar modelos Anthropic bajo ninguna circunstancia | `src/server.js` líneas 25-26, 304, 310 |

### Flujo actual de eventos (roto)
```
Invitado toca botón → Meta WABA → webhook Softify (única app suscrita)
                                    ↓
                    Softify server filtra phone_number_id
                                    ↓
                    1122911184237640 (3050) → procesa Softify
                    1268610086327579 (5497) → ❌ DESCARTADO
                                    ↓
                    claw-wedding-agent NUNCA recibe el evento
                                    ↓
                    Slack vacío + botón sin respuesta
```

---

## 2. Arquitectura Objetivo (patrón Yeppo/Softify)

```
Invitado (WhatsApp) → Meta Cloud API → Webhook → claw-wedding-agent (Railway)
                                                   │
                    ┌──────────────────────────────┼──────────────────────────┐
                    ▼                              ▼                          ▼
              handleIncomingMessage          Status updates              Slack bridge
                    │                       (delivered/read)          (notif + replies)
                    ▼
        ┌───────────────────────┐
        │  LLM (DeepSeek)       │  ← clasificación RSVP + respuestas conversacionales
        │  core/ai.js           │     (mismo patrón que Yeppo/Softify)
        └───────────────────────┘
                    │
        ┌───────────┼───────────────┐
        ▼           ▼               ▼
     Redis      Slack (Mateo)   Notion (RSVPs)
  (sesiones,     (canal boda)   (opcional)
   RSVPs)
```

### Cambios requeridos
1. **Suscribir la app Wedding Planner al WABA** (bloqueante) — ⚠️ ACTUALIZADO 02-Ago 11:41: Alejandro creó la app nueva `1590375222487560` (configurada como Softify, conectada al WABA, asignada al system user `61566630796479`). Verificado: el token almacenado SÍ accede a la app (`GET /1590375222487560?fields=name` → OK). Falta verificar suscripción de webhooks con el token de esa app.
2. **LLM = DeepSeek Flash** (decisión Alejandro 02-Ago): el bot de boda usa **DeepSeek Flash** (`deepseek-v4-flash` / `deepseek-chat`). **NO tocar Claude Sonnet en proyectos anteriores (Yeppo/Softify).** El server.js actual del agente usa `claude-sonnet-4-6` — migrar a DeepSeek Flash cuando se implemente el bot LLM.
3. **Configurar Slack bidireccional**: `SLACK_SIGNING_SECRET` + canal dedicado `#wedding-planner`
4. **Flujo completo**: template → botón → RSVP → Redis → Slack → respuesta LLM

### URLs en botones (decisión Alejandro 02-Ago)
Los botones de "Confirmar asistencia" / "No podre asistir" deben ser **botones URL** (no quick reply) que redirijan a la página de confirmación/no confirmación del sitio del producto, para que los invitados también conozcan el producto. Requiere: sitio web en `noscasamos.vip` funcionando → crear templates nuevos con URL buttons.

---

## 3. Plan de Implementación (Fases)

### Fase 1 — Desbloquear webhooks ✅ COMPLETADA (02-Ago 13:10)
| Paso | Acción | Estado |
|------|--------|--------|
| 1.1 | Conectar app Wedding Planner v2 (`1590375222487560`) al WABA `1004041115557689` | ✅ Suscrita vía API (success) |
| 1.2 | Configurar webhook con campo `messages` → `claw-wedding-agent-production.up.railway.app/webhook` | ✅ Verificado (v26.0) |
| 1.3 | Test real: template → botón → RSVP en Redis + respuesta WhatsApp | ✅ VERIFICADO 13:10 (RSVP confirmado) |
| 1.4 | Fix parsing `type: "button"` (quick replies) | ✅ Commit `d48df60` |

**Detalles Fase 1:**
- App nueva creada por Alejandro: `1590375222487560` "Wedding Planner v2" (configurada como Softify)
- System user employee `61590110639479` (token en `.secrets/wedding_meta_app_v2_token.txt`)
- App Secret en `.secrets/wedding_meta_app_v2.txt`
- Suscripción: `POST /1004041115557689/subscribed_apps` con token de la app v2 → success
- Webhook: `POST /{app_id}/subscriptions` con app token (client credentials) → fields [messages] v26.0

### Fase 2 — Migrar LLM a DeepSeek Flash (estilo Yeppo) ⬅️ SIGUIENTE
- Reemplazar `CLAUDE_API_KEY`/`claude-sonnet-4-6` por `DEEPSEEK_API_KEY`/`deepseek-chat` en `src/server.js`
- Usar el patrón de `projects/softify-whatsapp-webhook/core/ai.js`: DeepSeek primario, timeout 10-15s, fallback a heurística local si falla, **sin fallback a Claude** (regla permanente)
- Modelo: `deepseek-chat` (DeepSeek Flash)
- Prompt del bot boda: contexto (fecha, hora por confirmar, lugar Meihua, boda China/Coreana, dress code semi formal)

### Fase 3 — Slack bidireccional
- Configurar `SLACK_SIGNING_SECRET` en Railway (lo tiene Mateo)
- Crear canal `#wedding-planner` en Slack PE
- Actualizar `SLACK_CHANNEL_ID`
- Probar: invitado escribe → notif Slack → Alejandro responde desde Slack → llega a WhatsApp

### Fase 4 — Templates restantes + flujo completo
- Someter: `invitacion_formal`, `confirmacion_rsvp`, `recordatorio_7d`, `recordatorio_24h`, `dia_evento`, `post_boda`, `info_adicional`
- Importar lista de invitados (CSV → Redis/Notion)
- Campañas batch con rate limiting (patrón campañas Yeppo: 300ms entre mensajes)

---

## 4. Estandarización para Producto (monetizable)

### Modelo multi-tenant (patrón ya probado en softify-whatsapp-webhook)
```
projects/wedding-planner/
├── src/server.js          ← core genérico (webhook, RSVP, LLM, Slack)
├── tenants/
│   └── {boda_id}/
│       └── config.js      ← TODO lo específico de la boda:
│                             novios, fecha, hora, lugar, dressCode,
│                             wabaId, phoneNumberId, templates,
│                             siteUrl, regalos, prompt LLM
└── docs/                  ← esta documentación
```

Cada boda = 1 tenant = 1 deploy Railway (o multi-tenant con `TENANT` env var).

### Checklist de estandarización
- [ ] Config 100% en `tenants/{id}/config.js` (cero hardcode en server.js)
- [ ] Templates con naming estandarizado: `{boda_id}_save_the_date`, etc.
- [ ] Prompt LLM generado desde config (no hardcodeado)
- [ ] Onboarding automatizable: script que crea tenant + templates + webhook
- [ ] Logging/métricas por tenant (costo LLM, RSVPs, entregas)

### Propuesta de monetización (SaaS por boda)
| Concepto | Sugerencia |
|----------|-----------|
| Setup (configuración + templates + número) | $49.990 - $99.990 CLP |
| Mensualidad (hasta N invitados) | $19.990 - $49.990 CLP/mes |
| Invitados extra | $100 CLP/invitado |
| Add-ons | Sitio web nupcial, galería, mesa de regalos |
| Costo LLM estimado/boda | < $2 USD/mes (DeepSeek) |

### Ventajas del producto
- **Sin fricción:** invitados confirman con 1 toque (botones QUICK_REPLY)
- **Bot LLM:** responde dudas (hora, lugar, dress code) sin intervención de los novios
- **Slack bridge:** los novios responden desde Slack, no desde el celular
- **Recordatorios automáticos:** 7d, 24h, día del evento (crons)
- **Datos:** métricas RSVP en tiempo real (confirmed/declined/pending)

---

## 5. Próximo paso inmediato

1. Alejandro conecta la app Wedding Planner al WABA (UI ~2 min) **o** genera System User token de esa app
2. Claw verifica suscripción + test real de botón → Slack → RSVP
3. Migración LLM a DeepSeek (Fase 2)

## Archivos relacionados
- `docs/ESTADO-2026-08-02.md` — estado verificado hoy
- `docs/ARCHITECTURE.md` — arquitectura actual
- `docs/DEPLOY.md` — credenciales y deploy
- `docs/TEMPLATES.md` — catálogo de templates
- `docs/BUSINESS_VERIFICATION.md` — estado verificación
- `projects/softify-whatsapp-webhook/core/ai.js` — patrón LLM DeepSeek (referencia)
