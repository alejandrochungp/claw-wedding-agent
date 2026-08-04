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
| 2 | **Eliminar RSVP asociado o mantener histórico:** mantener histórico (sugerencia Claw — ver abajo) | ✅ Sugerencia aceptada por defecto |
| 3 | **Confirmación por texto** (`sí, eliminar`) | ✅ CONFIRMADO (sin botones) |
| 4 | **¿Ver invitados en esta tanda?** SÍ — incluir G1+G2 juntos (sugerencia Claw) | ✅ Sugerencia aceptada por defecto |

---

## 5b. Sugerencias de Claw (04-Ago 18:08)

### ¿Eliminar el RSVP asociado o mantener histórico?
**Recomendación: mantener el histórico en `wedding:rsvps`** pero marcar el guest como eliminado en un log.
- El RSVP es un **registro de auditoría** (quién confirmó, cuándo, con qué acompañantes) — borrarlo pierde trazabilidad
- Al eliminar el invitado: `hdel wedding:guests {phone}` + limpiar actor + **dejar el RSVP en el histórico** (sin tocarlo)
- El conteo de confirmaciones (`/admin/stats`) sigue siendo correcto porque cuenta desde `wedding:rsvps`
- Si más adelante el invitado se re-agrega, su RSVP histórico sigue disponible
- **Alternativa (si prefiere BD limpia):** borrar también de `wedding:rsvps` — pero pierde auditoría

### ¿Ver invitados en esta tanda o solo eliminar?
**Recomendación: incluir ambos (G1 eliminar + G2 ver invitados) juntos.**
- `ver invitados` es barato (hgetall ya existe) y complementa a eliminar: necesitas ver la lista para decidir a quién eliminar
- G3 (reenviar) y G4 (editar) quedan para una segunda tanda

---

## 6. Alcance final de la tanda aprobada (G1+G2)
1. Comando `eliminar invitado {phone}` con confirmación por texto
2. Comando `ver invitados` (listado completo con stages + resumen por estado)
3. Helper `deleteGuest(phone)` + endpoint `DELETE /admin/guests/{phone}?force=1`
4. Menú de novios actualizado con los comandos nuevos
