# Modificaciones propuestas — Ciclo de vida de invitados (para revisión, SIN implementar)

> **Fecha:** 04-Ago-2026 16:46 | **Autor:** Claw
> **Estado:** TRABAJO PARA REVISIÓN — Alejandro aprueba antes de implementar
> **Base:** Propuesta v2.1 (`PROPUESTA-ENVIO-TEMPLATES-INVITADOS-2026-08-04.md`) + decisiones confirmadas (16:26)

---

## ✅ Decisiones confirmadas por Alejandro
1. Template formal: **`invitacion_formal`** (crear en Meta)
2. Recordatorios: **T-30 / T-7 / T-24h** (sin T-14)
3. Código novios: **PENDIENTE** — placeholder `ALEJKUIL` en la carta
4. Storage stage: **HÍBRIDO APROBADO** — Redis operativo (F1) + espejo Postgres (F4)

## 🔴 Consulta Redis (respondida con datos)
- Railway muestra **`Redis: ● Online · redis-volume`** → volumen persistente adjunto
- **Los datos de Redis PERSISTEN ante builds, redeploys y reinicios** (disco, no memoria volátil)
- Postgres también tiene volumen (`postgres-volume`) → ambas BD persistentes

---

## 📋 Fase 1 — Implementar (tras aprobación)

### ✅ IMPLEMENTADA + DESPLEGADA (04-Ago 17:30, deploy `54885d56`) — VERIFICADA

### 1.1 Cambiar estructura de `wedding:guests` (lista → hash)
**Actual (implementado):**
```js
// addGuestViaChat
const guestKey = 'wedding:guests';
const guest = { name, phone, email, addedBy, createdAt, stage: 'nuevo', stageUpdatedAt, templatesSent: [] };
await redis.hset(guestKey, phone, JSON.stringify(guest));
```
- ✅ Hash por phone (hset/hgetall)
- ✅ Migración automática lista→hash en `start()` (`migrateGuestsToListHash`) — fix WRONGTYPE para invitados viejos

### 1.2 Comando: `enviar invitación a {phone}` ✅
- Envía `save_the_date_v4_img` con **header IMAGE** (upload fresh vía `uploadImageToMeta()` desde el micrositio) + 3 variables body (día/mes/año)
- → stage `invitacion_enviada` + push a `templatesSent`
- Dedupe: avisa si ya se le envió
- ⚠️ Fix: el template v4_img REQUIERE header image — el `sendTemplate()` genérico no sirve (solo body)
- ⚠️ Fix: `WEDDING_SITE_URL` fallback apuntaba a `boda.alejandro-y-kuilen.cl` (no existe, ENOTFOUND) → corregido a `alejandro-kuilen.noscasamos.vip`

### 1.3 Comando: `enviar invitación a todos` ✅
- Batch a stage `nuevo`, sube la foto UNA vez, rate limit 300ms, reporte enviadas/fallidas

### 1.4 Actualizar stage al confirmar RSVP ✅
- `handleButtonReply` / `handleRsvpFormMessage` / `handleTextRSVP` → `updateGuestStage(phone, 'confirmado'|'no_asistira'|'tal_vez')`

### 1.5 Helper `updateGuestStage(phone, stage)` ✅

### 1.6 Endpoints admin ✅
- `GET /admin/guests` → hgetall con stage
- `GET /admin/guest-states` → NUEVO: resumen por stage + lista

### Verificación (04-Ago 17:30)
- Migración lista→hash: María Pérez → `stage: nuevo` ✅
- Agregar invitado (Juan Soto): `stage: nuevo` ✅
- `enviar invitación a +56999887766`: → `stage: invitacion_enviada`, `templatesSent: [save_the_date_v4_img]` ✅
- Commits: `c0a3698`, `393d1b4`, `7c53d86`, `15dab81`

### 1.1 Cambiar estructura de `wedding:guests` (lista → hash)
**Actual:**
```js
// addGuestViaChat (línea ~647)
const guestKey = 'wedding:guests';
await redis.rpush(guestKey, JSON.stringify({ name, phone, email, addedBy, createdAt }));
```

**Nuevo:**
```js
const guestKey = 'wedding:guests';
await redis.hset(guestKey, phone, JSON.stringify({
  name, phone, email, addedBy, createdAt,
  stage: 'nuevo',                 // ← NUEVO
  stageUpdatedAt: new Date().toISOString(),
  templatesSent: [],              // ← NUEVO [{name, ts, wamid}]
}));
```
- Ventaja: actualizar `stage` sin reescribir toda la lista (hset por phone)
- Se mantiene compatibilidad de lectura (`hgetall` en vez de `lrange`)

### 1.2 Comando: `enviar invitación a {phone}`
En `handleNovioCommand`:
```js
if (/enviar invitaci[oó]n a/i.test(lower)) {
  // extraer phone → buscar guest en hash → sendTemplate(phone, 'save_the_date_v4_img')
  // → stage: 'invitacion_enviada' + push a templatesSent
}
```
- Si el phone no está en la lista → sugerir `agregar a {nombre} {phone}` primero
- Dedupe: si ya tiene `save_the_date_v4_img` en templatesSent y stage no es `nuevo` → avisar "ya se le envió"

### 1.3 Comando: `enviar invitación a todos`
- Batch: recorre hash, envía a todos los `stage: 'nuevo'`
- Rate limiting: 300ms entre mensajes (patrón campañas Yeppo)
- Respuesta final: "Enviadas: X · Fallidas: Y · Omitidas: Z (ya invitados)"

### 1.4 Actualizar stage al confirmar RSVP
En `handleButtonReply` / `handleRsvpFormMessage` / `handleTextRSVP`:
```js
// al confirmar: stage → 'confirmado'
// al declinar:  stage → 'no_asistira'
await updateGuestStage(phone, 'confirmado');  // helper nuevo
```

### 1.5 Helper `updateGuestStage(phone, stage)`
```js
async function updateGuestStage(phone, stage) {
  const raw = await redis.hget('wedding:guests', phone);
  if (!raw) return;  // solo si existe en la lista
  const g = JSON.parse(raw);
  g.stage = stage;
  g.stageUpdatedAt = new Date().toISOString();
  await redis.hset('wedding:guests', phone, JSON.stringify(g));
}
```

### 1.6 Actualizar `GET /admin/guests`
- Leer con `hgetall` en vez de `lrange`
- Mostrar `stage` en la respuesta

### 1.7 Endpoint admin nuevo: `GET /admin/guest-states`
- Resumen: cuántos en cada stage (nuevo/invitacion_enviada/confirmado/no_asistira/carta_formal_enviada)

---

## 📋 Fase 2 — Template `invitacion_formal` + comando carta (tras F1)

### 2.1 Crear template en Meta
- Nombre: `invitacion_formal` | Categoría: UTILITY | Idioma: es
- Header: IMAGE (foto pareja) | Body: 10 variables | Botones URL (rsvp.html + codigonovios.cl/n/ALEJKUIL)
- Esperar aprobación Meta (~24-48h)

### 2.2 Comando: `enviar carta formal a {phone}` / `a confirmados`
- Envía `invitacion_formal` → stage: `carta_formal_enviada`
- `a confirmados` → batch a todos con stage `confirmado`

---

## 📋 Fase 3 — Recordatorios automáticos (tras F2)

### 3.1 Cron en el bot (setInterval / node-cron)
| Recordatorio | Trigger | Destino |
|---|---|---|
| T-30 | 30 días antes de TENANT.fecha | guests con stage `invitacion_enviada` |
| T-7 | 7 días antes | ídem |
| T-24h | 24h antes | ídem |
- Contenido: texto libre si invitado interactuó en 24h; si no, template
- Anti-spam: máx 1 recordatorio/7 días por invitado (campo `lastReminderAt` en guest)

---

## 📋 Fase 4 — Espejo Postgres (tras F3)

### 4.1 Tabla nueva `guests` en Postgres
```sql
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(32) UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  stage VARCHAR(32) DEFAULT 'nuevo',
  rsvp_status VARCHAR(64),
  templates_sent JSONB DEFAULT '[]',
  added_by VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
- Sincronización: `updateGuestStage()` también hace upsert a Postgres
- `GET /admin/guests` lee de Postgres (reportes/marketing)

---

## 📂 Archivos a modificar (F1)
| Archivo | Cambio |
|---------|--------|
| `src/server.js` | estructura hash guests, comandos nuevos, helpers stage, endpoint admin |
| `docs/PROPUESTA-ENVIO-TEMPLATES-INVITADOS-2026-08-04.md` | marcar F1 aprobada/implementada |

## ❓ Pendientes para decidir (no bloquean F1)
- [ ] Código de novios real (placeholder `ALEJKUIL` hasta definirlo)
- [ ] ¿T-30/T-7/T-24h en horario fijo (ej: 10:00 CLT) o relativo al momento del RSVP?
- [ ] ¿El recordatorio T-24h usa template o texto libre siempre?
