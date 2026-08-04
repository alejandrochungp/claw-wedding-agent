# Propuesta: Gestión de la BD de invitados por los novios (eliminar, listar, editar)

> **Fecha:** 04-Ago-2026 17:33 | **Autor:** Claw
> **Estado:** PROPUESTA — NADA implementado (Alejandro debe aprobar)
> **Motivo:** Pregunta de Alejandro: "¿cómo los novios pueden gestionar la base de datos de invitados (eliminar usuario)?"

---

## 1. Estado actual (verificado en código)

### Comandos de novios que YA existen
| Comando | Función |
|---------|---------|
| `agregar a {nombre} {+56 9...} [{email}]` | Agrega invitado (stage: nuevo) |
| `enviar invitación a {phone}` | Envía save_the_date_v4_img → stage: invitacion_enviada |
| `enviar invitación a todos` | Batch a todos los stage: nuevo |
| `ver confirmaciones` | Conteo confirmados/no asisten + ofrece "ver nombres" |
| `ver nombres` | Listado de confirmados/tal vez/no asistentes |

### Helpers existentes (reutilizables)
- `getGuest(phone)` → lee guest del hash
- `updateGuestStage(phone, stage)` → actualiza stage
- `recordTemplateSent(phone, name, wamid)` → historial de envíos
- `addGuestViaChat(from, text)` → parser de "agregar a X +56 9..."

### Estructura de datos (hash `wedding:guests`)
```json
{
  "name": "María Pérez",
  "phone": "+56912345678",
  "email": "maria@mail.com",
  "addedBy": "+56966283141",
  "createdAt": "...",
  "stage": "nuevo | invitacion_enviada | confirmado | no_asistira | tal_vez",
  "stageUpdatedAt": "...",
  "templatesSent": []
}
```

**❌ Hoy NO existe forma de ELIMINAR un invitado** (ni por WhatsApp ni por API).

---

## 2. Propuesta: comandos de gestión

### 2.1 Eliminar invitado (prioridad — lo que preguntaste)

**Comando:**
```
eliminar invitado {+56 9...}
```
o
```
quitar a {+56 9...}
```

**Flujo (con confirmación — seguridad):**
1. Novio: `eliminar invitado +56912345678`
2. Bot busca el guest → responde:
   ```
   ⚠️ ¿Eliminar a *María Pérez* (+56912345678)?
   Stage: confirmado · Invitación enviada: sí
   Escribe *"sí, eliminar"* para confirmar.
   ```
3. Novio: `sí, eliminar` (o `confirmar eliminación`)
4. Bot: `hdel wedding:guests {phone}` + también elimina el actor (`wedding:actors`) si existe
5. Confirmación: `✅ María Pérez eliminada de los invitados.`

**Reglas:**
- Solo novios (los números en `TENANT.noviosPhones`) pueden eliminar
- Requiere confirmación explícita (evita borrados accidentales)
- Si el invitado ya confirmó RSVP → se elimina igual (pero se avisa "tenía RSVP confirmado")
- No se elimina el RSVP de `wedding:rsvps` (histórico se mantiene) — se puede decidir

**Helper nuevo:**
```js
async function deleteGuest(phone) {
  await redis.hdel('wedding:guests', phone);
  // opcional: limpiar actor
  await redis.hdel('wedding:actors', phone);
}
```

### 2.2 Listar invitados con su estado

**Comando:** `ver invitados` (o `lista invitados`)
- Muestra todos con nombre, teléfono y stage
- Paginado si son muchos (ej: primeros 10 + "¿ver más?")
- Formato:
  ```
  📋 *Invitados (N):*
  🆕 nuevo: X · 📨 invitados: Y · ✅ confirmados: Z · ❌ no: W
  • María Pérez — +56912345678 — ✅ confirmado
  • Juan Soto — +56999887766 — 📨 invitación enviada
  ```

### 2.3 Editar invitado (opcional, fase 2)
- `editar correo de {phone} a {email}`
- `cambiar nombre de {phone} a {nombre}`
- Baja prioridad — los datos rara vez cambian

### 2.4 Re-enviar invitación a un invitado específico (ya existe)
- `enviar invitación a {phone}` — pero con dedupe. **Propuesta:** agregar fuerza bruta:
  - `reenviar invitación a {phone}` → envía aunque ya tenga invitación (sin dedupe)

---

## 3. Endpoints admin (para gestión por panel)
| Endpoint | Función |
|----------|---------|
| `DELETE /admin/guests/{phone}` | Eliminar invitado (misma lógica con confirmación por query param `?force=1`) |
| `GET /admin/guests` | Ya existe (hgetall con stage) |
| `PATCH /admin/guests/{phone}` | Editar campos (name/email/stage) — fase 2 |

---

## 4. Fases de implementación (si se aprueba)
| Fase | Alcance |
|------|---------|
| **G1** | Comando `eliminar invitado {phone}` con confirmación + helper `deleteGuest` + endpoint DELETE admin |
| **G2** | Comando `ver invitados` (listado con stages y resumen) |
| **G3** | Comando `reenviar invitación a {phone}` (sin dedupe) |
| **G4** | Edición de invitados (email/nombre) |

---

## 5. Decisiones de Alejandro (CONFIRMADAS 04-Ago 18:08) ✅

| # | Decisión | Estado |
|---|----------|--------|
| 1 | **Confirmación antes de eliminar: SÍ** | ✅ CONFIRMADO |
| 2 | **Eliminar RSVP asociado o mantener histórico:** **OPCIÓN B — borrar también el RSVP** (decisión final 18:58) | ✅ CONFIRMADO |
| 3 | **Confirmación por texto** (`sí, eliminar`) | ✅ CONFIRMADO (sin botones) |
| 4 | **¿Ver invitados en esta tanda?** SÍ — incluir G1+G2 juntos (sugerencia Claw) | ✅ CONFIRMADO |

---

## 5b. Sugerencias de Claw (04-Ago 18:08)

### ¿Eliminar el RSVP asociado o mantener histórico?
**Decisión final de Alejandro (18:58): OPCIÓN B — borrar todo.**
- `deleteGuest(phone)` borra: hash `wedding:guests` + actor (`wedding:actors`) + **RSVP asociado de `wedding:rsvps`** (filtra la lista y re-crea sin ese teléfono)
- Las stats quedan limpias: el eliminado ya no cuenta como confirmado

### ¿Ver invitados en esta tanda o solo eliminar?
**Decisión final: incluir ambos (G1 + G2) juntos.**

---

## 6. ✅ IMPLEMENTADO + DESPLEGADO (04-Ago 19:00, deploy `2741bccf`) — VERIFICADO

### G1 — Eliminar invitado
- Comando: `eliminar invitado {phone}` → confirma: `sí, eliminar` (TTL 2 min en `wedding:pend_delete:{from}`)
- `deleteGuest(phone)`: borra guests + actor + RSVP (Opción B)
- Endpoint: `DELETE /admin/guests/:phone`
- Verificado en producción ✅

### G2 — Ver invitados
- Comando: `ver invitados` → listado con stages (🆕/📨/✅/❌/🤔) + resumen por estado + 👫 para parejas
- 13 invitados visibles en producción ✅

### Parejas vinculadas 👫 (aprobadas 18:56)
- `agregar a A +56 9... y B +56 9...` → crea 2 guests con `coupleId` + `partnerPhone`
- `vincular pareja {p1} {p2}` → vincula invitados existentes
- `getConfirmedStats()` → absorbe el +1 mutuo (si ambos confirmaron, 2 personas no 4)
- Aplica en: `ver confirmaciones`, `/admin/stats` (totalAsistentes)
- Verificado: stats con `totalAsistentes: 6` (6 confirmados, 0 acompañantes duplicados) ✅

### Menú de novios actualizado
- `🎛️ Panel de novios` ahora lista: agregar (individual/pareja), enviar invitación (uno/todos), ver invitados, ver confirmaciones, vincular pareja, eliminar invitado

### Commits
- `689b041` (G1+G2+Parejas) · deploy `2741bccf`
