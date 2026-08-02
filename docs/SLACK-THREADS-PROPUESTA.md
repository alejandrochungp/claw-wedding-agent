# Slack Bidireccional por Threads — Propuesta (estilo Yeppo/Softify)

> **Fecha:** 02-Ago-2026 | **Autor:** Claw + Alejandro
> **Estado:** SOLO ANÁLISIS Y PROPUESTA — NADA implementado aún (Alejandro revisa antes)

---

## 1. Diagnóstico del problema actual

### Lo que funciona ✅
- WA → Slack: notificaciones de entrega (`delivered`), lectura (`read`) y confirmación de asistencia llegan a `#wedding-planner` correctamente
- El bot **Mateo** (misma app de Softify) ya está dentro del canal privado
- `SLACK_CHANNEL_ID` = `C0BK70984TZ` configurado en Railway
- `SLACK_SIGNING_SECRET` configurado (13:43)

### Lo que NO funciona ❌
- **Slack → WA:** responder desde Slack NO llega al invitado
- El formato actual exige escribir `+569XXXXXXXX tu mensaje` (incómodo, no natural)
- No hay flujo de thread tipo Yeppo

### Causa raíz identificada
El `server.js` del wedding agent actual tiene un handler `handleSlackMessage` que:
1. Espera el formato `+569XXXXXXXX mensaje` en el texto (línea 193: `text.match(/\+?56\s*9\s*\d{4}\s*\d{4}/)`)
2. Intenta resolver por thread con `redis.hget(CONVERSATION_KEY, 'slack:' + thread_ts)` (línea 203) — pero el mapeo se guarda con el `ts` del mensaje del BOT (`slack:${slackRes.data.ts}`), no con el `thread_ts` del reply del operador → **el lookup falla**

Además, **la app de Slack Mateo tiene UNA sola Events Request URL** (apunta a Softify: `softify-whatsapp-webhook-production.up.railway.app/slack/events`). Los eventos de mensajes del canal #wedding-planner van a Softify, NO al wedding agent. Por eso nunca llegan.

---

## 2. Cómo lo hace Yeppo/Softify (mecanismo a replicar)

Fuente: `projects/softify-whatsapp-webhook/core/slack.js` (501 líneas) + `core/server.js` líneas 777-870.

### Arquitectura de threads
```
WhatsApp (cliente)  ←→  Slack (thread por conversación)
                            │
        ┌───────────────────┼──────────────────────┐
        ▼                   ▼                      ▼
  Header del thread    Replies del thread     Comandos
  📱 *+569XXXXXXXX*    👤 Cliente / 🤖 Bot    tomar · soltar · urgente
  + estado visual      💬 Operador → WA
```

### Piezas clave de `core/slack.js`

| Pieza | Descripción |
|-------|-------------|
| `phoneToThread` (Map) | phone → `{ thread_ts, headerTs, headerBase, channel, timestamp }` |
| `saveThread(phone, data)` | Persiste en Redis `slack:thread:{phone}` TTL 24h (sobrevive restarts) |
| `logConversation(phone, userText, botText, config)` | Crea el thread si no existe (header `📱 *+56...*` + estado 🟡) y postea replies `👤 Cliente:` / `🤖 Bot:` |
| `updateThreadHeader(phone, status, channel, headerTs)` | Cambia estado del header: 🟡 bot / 🔴 humano / ✅ resuelto |
| `sendOperatorReply(phone, text, userId)` | Envía la respuesta del operador al WhatsApp, con su nombre; guarda en memoria Redis para contexto |
| `handleSlackCommand('tomar'/'soltar', thread_ts)` | Toma/suelta control humano (handoff) |
| `getActiveConversation(phone)` | Verifica si hay humano activo (timeout 30 min) |
| `forwardToThread(phone, userText, thread_ts)` | Reenvía mensaje del cliente al thread cuando humano tiene control |

### Flujo de respuesta (lo importante)
1. Operador escribe **directamente en el thread** de Slack (sin escribir el número)
2. Slack envía evento `message` con `thread_ts` → `server.js` `/slack/events`
3. `server.js` usa `thread_ts` para encontrar el phone (via `handleSlackCommand` para comandos, o mapeo `phoneToThread`)
4. `sendOperatorReply()` envía el texto al WhatsApp
5. **Fallback anti-restart:** si el thread no está en RAM, lee el primer mensaje del thread con `conversations.replies` y extrae el phone con regex `\+?(569\d{8})` (líneas 824-851 de server.js)

### Comandos del thread
| Comando | Efecto |
|---------|--------|
| `tomar` | El humano toma control → header 🔴, bot pausado |
| `soltar` | Devuelve al bot → header ✅ |
| `urgente` | Menciona al canal para llamar atención |

---

## 3. Cambios propuestos para el wedding agent

### 3.1. Código (`src/server.js` o nuevo `core/slack.js`)
Portar el patrón de Yeppo adaptado a bodas:

1. **Nuevo módulo `core/slack.js`** (o funciones en server.js) con:
   - `phoneToThread` Map + persistencia Redis `slack:thread:{phone}`
   - `logConversation(phone, userText, botText)` → crea thread con header `📱 *+56...*` + estado y postea replies
   - `updateThreadHeader()` con estados adaptados (🟡 bot / 🔴 humano / ✅ resuelto)
   - `sendOperatorReply(phone, text, userId)` → envía al WhatsApp firmado con nombre del operador
   - `handleSlackCommand('tomar'/'soltar')` para handoff
2. **Modificar `handleSlackMessage`**: resolver el phone por `thread_ts` (mapeo real, no el `ts` del bot) + fallback `conversations.replies` para extraer el número del header
3. **`sendToSlack`**: crear/actualizar thread en vez de mensaje suelto con instrucciones; guardar el mapping correcto
4. **Header del thread** con el teléfono visible: `📱 *+569XXXXXXXX*` — permite el fallback post-restart

### 3.2. Configuración Slack (lo crítico)
**Opción A (recomendada — separación limpia): crear segunda Slack App "Wedding Planner"**
- Nueva app en https://api.slack.com/apps (o usar una existente del workspace PE)
- Bot token propio con scopes: `chat:write`, `channels:history`, `groups:history`, `users:read`
- **Event Subscriptions:** Request URL → `https://claw-wedding-agent-production.up.railway.app/slack/events`
  - Suscribirse a `message.channels` y `message.groups` (canal privado)
- Signing Secret propio
- Invitar el bot al canal #wedding-planner
- Actualizar Railway: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CHANNEL_ID`

**Opción B (misma app Mateo — con proxy en Softify):**
- Softify recibe TODOS los eventos (su Request URL es la única de la app)
- Modificar Softify para reenviar eventos del canal `C0BK70984TZ` al wedding agent
- ⚠️ Acopla los dos sistemas; la firma X-Slack-Signature se pierde en el reenvío (complicado validar en destino)
- ⚠️ Riesgo de romper el flujo actual de Softify
- ❌ No recomendada para productización

**Opción C (misma app, cambiar Request URL al wedding agent):** ❌ rompe Softify. Descartada.

> ⚠️ **Nota clave:** una Slack App tiene UNA sola Events Request URL por workspace. Es imposible que la misma app Mateo envíe eventos a Softify Y al wedding agent. Por eso la Opción A (app dedicada) es la correcta — y encaja con la estrategia de productización (cada producto = su propia app Slack).

---

## 4. Consideraciones para productización

- Cada boda (tenant) tendría su propia Slack App + canal + bot → aislado por cliente
- El `core/slack.js` de Yeppo es reutilizable como base: es multi-tenant por diseño (usa `config.slackChannel`)
- Los comandos `tomar`/`soltar`/`urgente` son útiles para bodas grandes (los novios/familia responden desde Slack)
- Costo: Slack Apps gratis; solo requiere configuración en api.slack.com

---

## 5. Próximos pasos (cuando Alejandro apruebe)

1. [ ] Decidir Opción A vs B (recomendada: A)
2. [ ] Si A: crear app Slack "Wedding Planner" (o confirmar cuál app existente de PE usar) + scopes + Event Subscriptions
3. [ ] Portar `core/slack.js` adaptado al wedding agent
4. [ ] Modificar `handleSlackMessage` + `sendToSlack` para threads
5. [ ] Configurar Railway env vars nuevas
6. [ ] Invitar bot al canal #wedding-planner
7. [ ] Probar: WA → thread en Slack → respuesta en thread → llega a WA

## Archivos de referencia
- `projects/softify-whatsapp-webhook/core/slack.js` — bridge completo de threads (replicar)
- `projects/softify-whatsapp-webhook/core/server.js` líneas 777-870 — handler /slack/events + fallback conversations.replies
- `projects/wedding-planner/src/server.js` — código actual del wedding agent (a modificar)
- `docs/ESTADO-2026-08-02.md` — estado del día
