# PLAN DE CAMBIOS — Cupo de acompañantes fijo + formulario pre-rellenado por teléfono

> **Fecha:** 15-Ago-2026 15:55 | **Autor:** Claw | **Sesión:** DeepSeek V4 Pro
> **Estado:** PARA REVISIÓN — Alejandro aprueba antes de implementar
> **Sistema:** claw-wedding-agent (Railway) + micrositio nupcial (Bluehost subdominio)

---

## 🎯 Objetivos (pedido de Alejandro)

1. **Al agregar un invitado**, el novio ya establece cuántas personas tiene como invitadas (cupo/acompañantes).
2. **El invitado NO puede editar ese número** en el formulario de confirmación.
3. **Al hacer clic en confirmar / no confirmar**, el formulario llega **pre-rellenado** usando su número de teléfono.

---

## 🧩 Cómo funciona HOY (estado actual)

### Backend (`src/server.js`, Railway)
- **Agregar invitado:** comando del novio `agregar a {nombre} +56 9...` → `addGuestViaChat()` → hash Redis `wedding:guests` (key = teléfono) con `{name, phone, email, stage, templatesSent, coupleId?, partnerPhone?}`. **NO existe campo de acompañantes.**
- **RSVP por formulario:** `site/rsvp.html` arma texto con emojis → abre `wa.me` → el bot parsea con `parseRsvpForm()` (regex por emoji 👤📱✅👥🍽🅿️💌) → `handleRsvpFormMessage()` guarda en `wedding:rsvps`, actualiza stage, avisa a los novios.
- **RSVP por botones:** template `save_the_date_v4_img` con quick replies "Confirmar asistencia" / "No podre asistir" → `handleButtonReply()` (guarda sin acompañantes).
- **RSVP por texto libre:** `handleTextRSVP()` con DeepSeek (confirm/decline/unknown).
- **Stats:** `getConfirmedStats()` suma `1 + acompañantes` por confirmado, con absorción de +1 entre parejas vinculadas.
- **CORS:** solo existe para `/api/codigonovios` (Bluehost → API).

### Frontend (`site/`, Bluehost subdominio `alejandro-kuilen.noscasamos.vip`)
- `rsvp.html`: form con **nombre, teléfono, asistencia, N° de acompañantes (0-5, EDITABLE), dieta, estacionamiento, mensaje**. Sin pre-relleno ni lectura de query params.
- `no-confirmado.html`: form mínimo (nombre, teléfono, mensaje) — sin acompañantes.
- Deploy: `python scripts/deploy_site.py` (check encoding → scp → curl verify).

### Templates WhatsApp
- `save_the_date_v4_img`: header IMAGE + 5 variables + **2 quick replies** (sin URL button, sin variable de teléfono).
- Aprobación Meta: UTILITY en horas / MARKETING puede tardar más.

---

## 📋 Plan de cambios

### A. Backend — `src/server.js`

**A1. Agregar cupo al crear invitado (`addGuestViaChat`)**
- Parsear cupo opcional en el comando, ej:
  - `agregar a María +56 9 1234 5678 con 2 acompañantes`
  - `agregar a María +56 9 1234 5678 cupo 2`
  - `agregar a María +56 9 1234 5678 2` (número suelto al final)
- Regex: `/(?:con\s+)?(\d+)\s*(?:acompa[nñ]antes?|cupo|personas?|invitad[oa]s?)/i` + fallback número suelto.
- Guardar `acompanantes: N` en el hash del guest (0-5, clamp).
- Parejas: decisión pendiente (ver Decisiones).
- Respuesta al novio: confirmar con el cupo registrado.

**A2. Endpoint público de pre-relleno (nuevo)**
- `GET /api/rsvp/guest?phone=X` → CORS `*` (mismo patrón que `/api/codigonovios`).
- Respuesta: `{ ok: true, name, phone, acompanantes, hasCupo: true }` si existe; `{ ok: false }` si no.
- Solo devuelve nombre + cupo (sin email/stage/templates → privacidad mínima).

**A3. Forzar cupo server-side (autoridad = backend)**
- En `handleRsvpFormMessage()`: si el guest tiene `acompanantes` definido → **usar SIEMPRE el cupo**, ignorar lo que mande el form (aunque el invitado edite el texto). Si no tiene cupo → usar lo enviado (compatibilidad).
- Lo mismo en `parseRsvpForm()` normalización: clamp 0-5.

**A4. Botones quick reply → link al form pre-llenado**
- En `handleButtonReply()` (confirmar): tras confirmar, enviar (ventana 24h) el link:
  `https://alejandro-kuilen.noscasamos.vip/rsvp.html?phone={su_número}`
  con mensaje tipo: "Para dejarnos los detalles (acompañantes, dieta, estacionamiento) completa este formulario 👇"
- Así el cupo fijo ya viene bloqueado en el form y el invitado solo completa lo demás.

**A5. Comando novio para editar cupo**
- `editar acompañantes de {phone} a {n}` → actualiza `guest.acompanantes`.
- Mostrar cupo en `ver invitados` y en `GET /admin/guests`.

**A6. (Opcional) Repair/backfill**
- `POST /admin/guests/backfill-cupo` con body `{ phone, acompanantes }` para setear cupo a invitados ya agregados (o por comando del novio).

### B. Frontend — `site/rsvp.html` + `site/no-confirmado.html`

**B1. Lectura de query params**
- Leer `?phone=` (y `?name=` como fallback visual).

**B2. Pre-relleno vía API**
- Al cargar con `?phone=` → `fetch('https://.../api/rsvp/guest?phone=X')` (CORS ok):
  - Nombre → input `#name` (value).
  - Teléfono → input `#phone` (value, readonly).
  - Acompañantes → input `#guests` = cupo, con `disabled` + nota "Cupo asignado: N personas" (el novio lo fijó).
- Si no hay phone o el guest no existe → form normal (campo acompañantes editable, como hoy) con aviso sutil.
- El texto armado incluye el cupo tal cual (el bot lo valida igual).

**B3. `no-confirmado.html`**
- Pre-llenar nombre/teléfono con `?phone=` (mismo fetch). Sin campo de acompañantes (no aplica a no-asistencia).

### C. Flujo WhatsApp / plantilla

- **Opción 1 (rápida, recomendada):** el bot manda el link del form pre-llenado por **texto libre** dentro de la ventana de 24h (tras enviar invitación o tras botón de confirmar). Cero dependencia de Meta.
- **Opción 2 (nativa, opcional):** crear template nuevo con **URL button** `rsvp.html?phone={{1}}` → requiere aprobación Meta (horas UTILITY / días MARKETING). Solo si queremos que el link venga dentro del template mismo.

### D. Deploy y verificación

1. `server.js` → commit + push mirror → Railway auto-deploy.
2. `site/` → `python scripts/deploy_site.py`.
3. Test E2E:
   - Novio: `agregar a Test +56 9... con 2 acompañantes` → respuesta confirma cupo 2.
   - Enviar invitación → abrir `rsvp.html?phone=...` → form pre-llenado, acompañantes bloqueado en 2.
   - Confirmar → Redis `wedding:rsvps` con acompañantes 2, stage `confirmado`, aviso novios.
   - Intentar editar el número en el texto del form → el bot lo fuerza a 2.

---

## ❓ Decisiones para Alejandro

| # | Decisión | Opciones |
|---|----------|----------|
| 1 | **Semántica del cupo** | (a) acompañantes adicionales (campo actual, 0-5) — recomendado, no rompe stats · (b) total de personas incluyendo al invitado |
| 2 | **Parejas 👫** | (a) cupo individual por cada registro · (b) cupo compartido de la pareja · (c) sin cupo para parejas (se absorbe +1) |
| 3 | **Formato del comando** | `con 2 acompañantes` / `cupo 2` / número suelto — se aceptan los 3 |
| 4 | **Invitados existentes** | ¿Backfill manual cupo por comando/endpoint, o solo para nuevos? |
| 5 | **Link en template** | Opción 1 (texto libre 24h, ya) · Opción 2 (URL button en template, requiere Meta) · ambas |

---

## 📁 Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/server.js` | A1-A6: parseo cupo, endpoint /api/rsvp/guest, forzar cupo en RSVP, link en botones, comando editar cupo |
| `site/rsvp.html` | B1-B2: query params + fetch + campo acompañantes disabled |
| `site/no-confirmado.html` | B3: pre-relleno nombre/teléfono |
| `docs/` | Este plan + actualizar FLOWS/WEBSITE tras implementar |

---

## ✅ Respuestas de Alejandro (16:03–16:09) — aclaraciones FINALES

### Decisión #1 — Semántica del cupo: RESUELTA
- **Cupo = nº de acompañantes** (no incluye al invitado). Campo actual 0-5, sin romper stats.
- Ejemplo de Alejandro: invito a un amigo y quiero que venga con su novia → le doy **cupo 1**. Registrado como `guest.acompanantes`.

### Decisión #2 — Parejas: RESUELTA (no usa matrimonio vinculado)
- **Alejandro NO usa el caso de matrimonio vinculado** (`coupleId`/`partnerPhone`).
- Todos los invitados son **individuales**, cada uno con su propio cupo. No se toca la lógica de parejas existente (queda dormida, no molesta).

### Decisión #3 — Formato del comando: RESUELTA
- Se aceptan las 3 formas: `con 2 acompañantes` / `cupo 2` / número suelto al final.

### Decisión #4 — Backfill: CONFIRMADO que hay invitados existentes
- Alejandro confirma que **ya hay invitados agregados** (como invitados, no como cupo — antes no existía el campo).
- Backfill = setearles `acompanantes` retroactivamente. Opciones:
  - (a) cupo 0 por defecto para todos los existentes (nadie adicional) salvo que se cambie.
  - (b) setear cupo uno a uno con `editar acompañantes de {phone} a {n}`.
  - (c) yo listo los invitados actuales y Alejandro me dicta el cupo de cada uno.
- Pendiente: listar invitados en `/admin/guests` para dimensionar cuántos son.

### Decisión #5 — Template Meta: CORREGIDA (el template YA tiene botones URL)
- **Hallazgo real:** el template activo es `save_the_date_v4_img` (Meta ID `1585195933335096`, APPROVED). **YA tiene 2 botones URL**, no quick replies:
  - "Confirmar asistencia" → `https://alejandro-kuilen.noscasamos.vip/rsvp.html`
  - "No podre asistir" → `https://alejandro-kuilen.noscasamos.vip/no-confirmado.html`
- **El problema:** esos botones URL llevan **sin query param** (sin `?phone=`), por eso el form no llega pre-llenado.
- **Lo que pide Alejandro (correcto):** modificar ese template para que el botón URL lleve la **variable de teléfono**: `rsvp.html?phone={{N}}` y `no-confirmado.html?phone={{N}}`.
- **Restricción Meta:** los templates aprobados **NO se pueden editar**. Hay que crear **versión nueva** (ej. `save_the_date_v5`) con botón URL dinámico ("dynamic URL" con sufijo `?phone={{N}}`) y someter a aprobación Meta (MARKETING puede tardar horas/días).
- **En el envío**, el bot pasa el teléfono como parámetro del botón: `components[{type:'button', sub_type:'url', index:'0', parameters:[{type:'text', text: phone}]}]`.
- Esto reemplaza la "Opción 1 (texto libre 24h)" — con el botón URL dinámico no hace falta mensaje extra; el invitado toca el botón y cae directo al form pre-llenado.
- **Mientras Meta aprueba la v5**, se puede usar el link por texto libre (24h) como puente, o el form actual sin pre-llenado.
