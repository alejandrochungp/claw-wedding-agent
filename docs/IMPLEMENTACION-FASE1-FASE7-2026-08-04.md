# Implementación Fase 1 (Agente Dual) + Fase 7 (BD Postgres Leads) — 04-Ago-2026

> **Fecha:** 04-Ago-2026 11:23-12:00 | **Autor:** Claw
> **Estado:** ✅ IMPLEMENTADO + DESPLEGADO (v1.7.0) + VERIFICADO
> **Deploy:** `de3fda91` SUCCESS · version 1.7.0 · `postgres: true`

---

## 1. Postgres en Railway (Fase 7 — BD de leads)

### Creación
- `railway add -d postgres` en el proyecto `claw-wedding-agent` (fca8623e) → servicio `Postgres`
- `DATABASE_URL` copiada al servicio app (`railway variables --set DATABASE_URL=... -s claw-wedding-agent`)
- ⚠️ **Lección CLI:** el wrapper `railway.ps1`/`.cmd` no funciona desde `subprocess` de Python (error "unrecognized subcommand 'railway'"). Soluciones que SÍ funcionan:
  1. PowerShell directo: `$pgVars = railway variables -s Postgres --json | ConvertFrom-Json`
  2. Python: `["node", "C:\\Users\\achun\\AppData\\Roaming\\npm\\node_modules\\@railway\\cli\\bin\\railway.js", ...]`
  3. `--json` output: parsear desde el primer `{` (el CLI imprime líneas de caja antes)
- ⚠️ **RAILWAY_TOKEN sigue siendo veneno:** si está en env, TODO falla con Unauthorized. Remover con `Remove-Item Env:RAILWAY_TOKEN` antes de usar el CLI.

### Tabla `leads` (creada automáticamente en initPostgres)
```sql
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(32) UNIQUE,
  email VARCHAR(255),
  nombres VARCHAR(255),
  fecha_boda DATE,
  ciudad VARCHAR(128),
  n_invitados INT,
  plan_interes VARCHAR(64),
  mensaje TEXT,
  origen VARCHAR(32) DEFAULT 'whatsapp_bot',   -- form_sitio | whatsapp_bot
  estado VARCHAR(32) DEFAULT 'nuevo',          -- pipeline marketing futuro
  notas_marketing TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```
- **Separada de la lista de invitados** (invitados siguen en Redis `wedding:guests` + `wedding:rsvps`) ✅ requisito de Alejandro
- Upsert por `phone` (ON CONFLICT DO UPDATE)

### Endpoints nuevos
| Endpoint | Función |
|----------|---------|
| `POST /api/lead` | Form del sitio producto (noscasamos.vip/contacto) → guarda lead + notifica Slack |
| `GET /admin/leads` | Listar leads (seguimiento/marketing futuro) |
| `GET /admin/guests` | Invitados agregados por novios (Redis) |

### Verificación (hecha)
- `POST /api/lead` con JSON limpio → `HTTP 200 {"ok":true,"id":1}` ✅
- `GET /admin/leads` → `total: 2` (form_sitio + whatsapp_bot del simulate) ✅
- ⚠️ PowerShell corrompe el JSON al usar `curl -d '{...}'` (comillas) → usar Python o `--data-binary` con archivo

---

## 2. Fase 1 — Agente Dual (identificación de actores)

### Implementado en server.js
1. **`TENANT.noviosPhones`** → `['56966283141']` (Alejandro; Kuilen pendiente de agregar)
2. **`getActorRole(phone)`** → prioridad: **novio > invitado (RSVP existente) > lead**
3. **`registerActor(phone, role, extra)`** → guarda en Redis `wedding:actors`
4. **Routing en handleIncomingMessage:**
   - `interactiveType === 'button'` → SIEMPRE `handleButtonReply` (botones son RSVP oficial de la boda — fix importante: no dejar que los botones caigan al flujo lead)
   - texto + rol `novio` → `handleNovioCommand` (ver confirmaciones, agregar invitado)
   - texto + rol `lead` + intención comercial (`precio|plan|cotiz|quiero esto|contratar...`) → `handleLeadMessage` (flujo comercial + guarda lead en Postgres)
   - texto + invitado/lead sin intención comercial → flujo RSVP normal + `registerActor(lead→invitado)`
5. **`handleNovioCommand`** (Fase 2 parcial): "ver confirmaciones" (estado RSVP) + menú de panel
6. **`addGuestViaChat`** (Fase 2 parcial): parsea `agregar a {nombre} {+56 9...} {email opcional}` → guarda en `wedding:guests` + registra actor invitado + notifica Slack

### Verificación (hecha)
- Simulate lead `56999998888` con "hola quiero saber los precios" → HTTP 200, lead guardado en Postgres (`origen: whatsapp_bot`) ✅
- Simulate novio `56966283141` con "ver confirmaciones" → HTTP 200, comando reconocido ✅

### Pendientes Fase 1/2
- [ ] Agregar WhatsApp de Kuilen a `TENANT.noviosPhones`
- [ ] Modo novio avanzado: agregar invitado con confirmación LLM (DeepSeek) antes de guardar
- [ ] Verificación end-to-end con WhatsApp real (invitado toca botón → sigue RSVP normal)

---

## 3. Deploy (incidencias resueltas)

### 🐛 Bloqueante: video 170MB en git (GitHub rechaza >100MB)
- `site/assets/video-propuesta-matrimonio.mp4` (170MB) estaba trackeado → push rechazado
- **Fix:** `git rm --cached` + `.gitignore` (`site/assets/*.mp4`) + `git filter-branch --index-filter "git rm --cached --ignore-unmatch ..." -- --all` + limpiar `refs/original` + `reflog expire` + `gc --prune=now` + `git push --force mirror master`
- El video vive en el servidor Bluehost, NO necesita estar en el repo

### 🐛 Build fallido: package-lock desincronizado
- Agregué `pg` al package.json pero no al lock → `npm ci` falló
- **Fix:** `npm install` local → commit `package-lock.json` → push

### Deploy final
- `d2be558..2130afc` master → mirror → deploy `de3fda91` SUCCESS
- `/status`: `version 1.7.0`, `postgres: true`, `redis: true`, `rsvps: 3`

---

## 4. Archivos modificados
- `src/server.js` (+275/-8): pg Pool, initPostgres, actor registry, leads, novio commands, routing dual, endpoints
- `package.json` (+pg ^8.11.3), `package-lock.json` (sincronizado)
- `.gitignore` (+site/assets/*.mp4)
- Commits: `6b06ac5` (Fase 1+7), `2130afc` (lock fix), historial reescrito (video purgado)

## 5. Relacionados
- `docs/AGENTE-DUAL-INVITADOS-CLIENTES.md` — diseño del agente dual
- `docs/PLAN-TRABAJO-MEJORAS-2026-08-04.md` — plan con fases
- `projects/codigonovios/README.md` — producto hermano (leads alimentan marketing)
