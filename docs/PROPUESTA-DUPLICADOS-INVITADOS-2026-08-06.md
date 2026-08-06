# Propuesta: Filtro de duplicados al agregar invitados (aviso por teléfono)

> **Fecha:** 06-Ago-2026 13:08 | **Autor:** Claw
> **Estado:** PROPUESTA — NADA implementado (Alejandro debe aprobar)
> **Pregunta de Alejandro:** "¿No existe un filtro de aviso cuando alguien se agregó pero ya está agregado por su número de teléfono?"

---

## 1. Diagnóstico (verificado en código)

**NO existe filtro de duplicados.** En `addGuestViaChat` (líneas ~764-820):

```js
// INVITADO INDIVIDUAL — sin verificación previa:
await redis.hset('wedding:guests', phone, JSON.stringify(guest));

// PAREJA — tampoco verifica:
await redis.hset('wedding:guests', phone1, JSON.stringify(g1));
await redis.hset('wedding:guests', phone2, JSON.stringify(g2));
```

**Consecuencia real:** si agregas a alguien cuyo teléfono ya está en la lista:
- El `hset` **sobrescribe** el registro anterior
- Se pierden: `stage` (vuelve a `nuevo`), `templatesSent` (historial de envíos), `coupleId`/`partnerPhone` (pareja vinculada), `email`
- El bot responde "✅ Agregué a X" como si fuera nuevo — sin avisar que ya existía

**Ejemplo de daño:** agregas a María con su pareja (vinculada, invitación enviada) → la vuelves a agregar sola → se pierde la vinculación y el historial.

---

## 2. Corrección propuesta

### 2.1 Verificación antes de insertar (individual y pareja)
En `addGuestViaChat`, antes del `hset`, consultar si el teléfono ya existe con `getGuest(phone)`:

**Caso individual:**
```js
const existing = await getGuest(phone);
if (existing) {
  await sendWhatsAppMessage(from,
    `⚠️ *${existing.name}* (${phone}) ya está en la lista.\n\n` +
    `• Stage: ${existing.stage}\n` +
    `• Invitación: ${(existing.templatesSent || []).length} envío(s)\n` +
    `• Agregado: ${existing.createdAt ? existing.createdAt.slice(0, 10) : '?'}\n\n` +
    `➡️ Escribe *"actualizar a ${phone}"* si quieres actualizar sus datos, o *"cancelar"* para no tocar nada.`);
  return;
}
```

**Caso pareja:** verificar AMBOS teléfonos antes de crear:
- Si uno ya existe → avisar cuál y pedir confirmación
- Si ambos existen → avisar y no crear

### 2.2 Confirmación para actualizar (si el novio insiste)
- `actualizar a {phone}` → sobrescribe (con aviso explícito de que se reemplaza)
- `cancelar` → no hace nada
- Simétrico al patrón de `eliminar invitado` (confirmación por texto, TTL 2 min)

### 2.3 Helper nuevo
```js
async function guestExists(phone) {
  return !!(await getGuest(phone));
}
```
(o reutilizar `getGuest` directo — no requiere helper nuevo)

---

## 3. Alcance del trabajo

| Ítem | Descripción |
|------|-------------|
| 1 | Verificación de duplicado en invitado individual (`addGuestViaChat`) |
| 2 | Verificación de duplicado en pareja (ambos teléfonos) |
| 3 | Comandos de confirmación: `actualizar a {phone}` / `cancelar` (con TTL) |
| 4 | Mensaje de aviso con datos del registro existente (stage, envíos, fecha) |
| 5 | Menú de novios: mención breve del aviso de duplicados |

**Archivos:** solo `src/server.js` (+ docs)

---

## 4. Verificación propuesta (post-implementación)
1. Agregar a alguien 2 veces con el mismo teléfono → 2da vez avisa "ya está en la lista"
2. `actualizar a {phone}` → sobrescribe conservando datos nuevos
3. `cancelar` → no modifica nada
4. Pareja: agregar pareja donde 1 miembro ya existe → avisa cuál
5. Verificar que stage/historial NO se pierden al cancelar

---

## 6. ✅ IMPLEMENTADO + DESPLEGADO (06-Ago 13:45, deploy `3c276a96`) — VERIFICADO

### Decisiones de Alejandro (13:13)
1. **Bloquear duplicados directamente** (sin ofrecer actualizar/cancelar) ✅
2. Aviso con **stage + envíos + fecha** ✅
3. Aviso **sugiere "ver invitados"** para revisar ✅

### Implementado (commit `96ef975`)
- `addGuestViaChat` (individual): si `getGuest(phone)` existe → avisa y NO sobrescribe:
```
⚠️ *María* (+56 9...) ya está en la lista — no lo agregué de nuevo.
• Stage: confirmado
• Invitación: 1 envío(s)
• Agregado: 2026-08-04
➡️ Revisa con *"ver invitados"* antes de decidir.
```
- `addGuestViaChat` (pareja): verifica AMBOS teléfonos antes de crear; si alguno existe → avisa cuál y bloquea

### Verificado en producción
- Agregar a Amín Juris 2ª vez (ya existía) → bloqueado, sigue 1 solo registro (total 19) ✅
- No se pierden stage/historial/pareja en duplicados ✅
