# Propuesta: G3 (Reenviar invitación) + G4 (Editar invitado) — para revisión

> **Fecha:** 04-Ago-2026 19:06 | **Autor:** Claw
> **Estado:** PROPUESTA — NADA implementado (Alejandro debe aprobar)
> **Base:** G1+G2 ya implementados (eliminar + ver invitados). Esta es la siguiente tanda de gestión.

---

## 1. G3 — Reenviar invitación (sin dedupe)

### Problema que resuelve
Hoy `enviar invitación a {phone}` tiene **dedupe**: si el invitado ya tiene el `save_the_date_v4_img` en `templatesSent`, el bot avisa "ya se le envió" y no reenvía. Pero hay casos donde SÍ hay que reenviar:
- El invitado perdió el mensaje o cambió de teléfono
- El novio quiere insistir con alguien que no ha respondido
- Se actualizó la información del evento

### Comando propuesto
```
reenviar invitación a {phone}
```
o
```
reenviar a {phone}
```

### Comportamiento
1. El bot busca el guest (igual que `enviar invitación a`)
2. **Sin dedupe** — envía el template `save_the_date_v4_img` aunque ya esté en `templatesSent`
3. Registra el nuevo envío en `templatesSent` (queda el historial: 2 envíos, 3 envíos...)
4. No cambia el stage (si ya estaba `invitacion_enviada`, sigue igual)
5. Confirma al novio: `✅ Reenvío enviado a *María* (teléfono). Envíos totales: 2`

### Implementación
```js
// En handleNovioCommand — antes del comando con dedupe:
if (/reenviar invitaci[oó]n a|reenviar a/i.test(lower) && /\+?56\s*9\s*\d{4}\s*\d{4}/.test(text)) {
  const phoneMatch = text.match(/\+?56\s*9\s*\d{4}\s*\d{4}/);
  await sendInviteToGuest(from, normalizePhone(phoneMatch[0]), { force: true }); // flag force
  return;
}
```
- `sendInviteToGuest(from, phone, opts = {})` → si `opts.force`, salta el bloque de dedupe
- **Reutiliza** `uploadImageToMeta` + `sendInviteTemplate` (ya funcionan)

---

## 2. G4 — Editar invitado

### Problema que resuelve
Hoy para corregir un dato (correo mal escrito, nombre, teléfono cambiado) hay que **eliminar y volver a agregar** — pierde el stage y el historial de envíos. Con G4 se edita en el lugar.

### Comandos propuestos
```
editar correo de {phone} a {email}
editar nombre de {phone} a {Nombre}
editar teléfono de {phoneViejo} a {phoneNuevo}
```

### Comportamiento (por campo)

**a) Editar correo:**
1. Busca guest por `{phone}`
2. Actualiza `email` → confirma: `✅ Correo de María actualizado a maria@nuevo.cl`

**b) Editar nombre:**
1. Busca guest por `{phone}`
2. Actualiza `name` → confirma: `✅ Nombre actualizado: María Pérez → María González`

**c) Editar teléfono (el más delicado):**
1. Busca guest por `{phoneViejo}`
2. Mueve el registro: `hdel wedding:guests {viejo}` → `hset wedding:guests {nuevo} {json con phone nuevo}`
3. Si tiene pareja vinculada → actualiza `partnerPhone` del otro miembro
4. Re-registra actor (borra viejo, crea nuevo)
5. Confirma: `✅ Teléfono actualizado: María +56 9... → +56 9...`

### Implementación
```js
async function editGuest(phone, field, value) {
  const guest = await getGuest(phone);
  if (!guest) return { ok: false };
  if (field === 'phone') {
    // mover registro + actualizar partnerPhone de la pareja
    await redis.hdel('wedding:guests', phone);
    guest.phone = value;
    await redis.hset('wedding:guests', value, JSON.stringify(guest));
    if (guest.coupleId && guest.partnerPhone) {
      const partner = await getGuest(guest.partnerPhone);
      if (partner) { partner.partnerPhone = value; await redis.hset('wedding:guests', partner.phone, JSON.stringify(partner)); }
    }
    await redis.hdel(ACTOR_KEY, phone);
    await registerActor(value, 'invitado', { name: guest.name, email: guest.email });
  } else {
    guest[field] = value;
    await redis.hset('wedding:guests', phone, JSON.stringify(guest));
  }
  return { ok: true, guest };
}
```

---

## 3. Alcance de la tanda

| Ítem | Descripción |
|------|-------------|
| G3 | Comando `reenviar invitación a {phone}` (sin dedupe, flag force) |
| G4a | Comando `editar correo de {phone} a {email}` |
| G4b | Comando `editar nombre de {phone} a {nombre}` |
| G4c | Comando `editar teléfono de {viejo} a {nuevo}` (mueve registro + pareja + actor) |
| Extra | Menú de novios actualizado con los 4 comandos nuevos |

**Archivos:** solo `src/server.js` (+ docs)

---

## 4. Verificación propuesta (post-implementación)
1. `reenviar invitación a {phone}` → template enviado + templatesSent con 2 envíos
2. `editar correo de {phone} a X` → guest actualizado en `GET /admin/guests`
3. `editar nombre de {phone} a X` → nombre actualizado
4. `editar teléfono de {viejo} a {nuevo}` → registro movido + pareja actualizada + actor OK
5. Probar con invitados de prueba reales

---

## 5. Decisiones que necesito de ti
1. ❓ ¿`editar teléfono` reemplaza o mantiene el viejo? (propongo reemplazar, con aviso)
2. ❓ ¿G4 requiere confirmación como el eliminar? (propongo NO — editar es reversible y de bajo riesgo)
3. ❓ ¿Agregamos también `editar etapa` (cambiar stage manualmente)? (para corregir estados)
