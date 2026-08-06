# Propuesta: Soporte de números internacionales en el bot

> **Fecha:** 06-Ago-2026 13:10 | **Autor:** Claw
> **Estado:** PROPUESTA — NADA implementado (Alejandro debe aprobar)
> **Problema reportado:** "El bot no me deja llegar a números internacionales"

---

## 1. Diagnóstico (verificado en código)

### Bug 1 — Regex solo chileno (12 lugares)
El patrón `\+?56\s*9\s*\d{4}\s*\d{4}` se usa en:
- `handleNovioCommand`: eliminar, vincular pareja, agregar, enviar invitación, reenviar, editar correo/nombre/teléfono (líneas ~599-699)
- `addGuestViaChat` parser de parejas (línea 764)
- `handleSlackMessage` formato alternativo (línea 385)
- `POST /admin/send-from-slack` (línea 1610)

**Efecto:** un número internacional (`+1 415 555 1234`, `+34 612 345 678`, `+86 138...`) NO matchea → el bot responde "No encontré el WhatsApp del invitado" o ignora el comando.

### Bug 2 — normalizePhone pierde el `+` (E.164 roto)
Verificado con Node:
```
+56 9 1234 5678  → +56912345678  ✅
+1 415 555 1234  → 14155551234   ❌ (pierde el +)
+34 612 345 678  → 34612345678   ❌
```
Meta exige **E.164** (`+` + código país). Sin el `+`, el envío a internacionales falla en la API.

---

## 2. Corrección propuesta

### 2.1 Regex universal de teléfono (1 constante reutilizable)
```js
// Acepta: Chile (+56 9... / 56 9... / 9...) e internacional con + obligatorio
const PHONE_RE = /(?:\+?56\s*9\s*\d{4}\s*\d{4}|\+\d{1,3}\s?\d{6,12})/g;
```
- Chile mantiene el formato actual (con o sin `+`)
- Internacional requiere `+` explícito → evita falsos positivos (ej: fechas, montos)
- Reemplazar los 12 usos por `PHONE_RE`

### 2.2 normalizePhone → E.164 estricto
```js
function normalizePhone(phone) {
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) return `+${cleaned.slice(1)}`; // preserva código país
  if (cleaned.startsWith('56') && cleaned.length >= 11) return `+${cleaned}`;
  if (cleaned.startsWith('9') && cleaned.length === 9) return `+56${cleaned}`;
  return cleaned;
}
```
Resultado:
```
+34 612 345 678 → +34612345678 ✅
+1 415 555 1234 → +14155551234 ✅
```

### 2.3 Archivos/endpoints afectados
| Ubicación | Cambio |
|-----------|--------|
| `handleNovioCommand` (7 comandos) | regex → PHONE_RE |
| `addGuestViaChat` (parser parejas) | regex → PHONE_RE |
| `handleSlackMessage` | regex → PHONE_RE |
| `POST /admin/send-from-slack` | regex → PHONE_RE |
| `normalizePhone()` | E.164 estricto |

---

## 3. Consideraciones adicionales

### 3.1 Meta / WABA
- **Templates a números internacionales**: requiere mensajería internacional habilitada en el WABA (parte de Business Verification). Verificar con test real.
- **Mensajes en ventana 24h** (respuestas del bot): funcionan a internacionales sin restricción adicional.
- Si el invitado internacional no tiene WhatsApp → Meta devuelve error 131026 (no es WhatsApp) — el bot ya maneja el fallo con mensaje al novio.

### 3.2 Precio de invitaciones internacionales
- Meta cobra **por país destino** — enviar a EE.UU./Europa/China cuesta más que Chile. Revisar tarifas si hay muchos invitados internacionales (Kuilen: familia en China/Corea 🇨🇳🇰🇷).

---

## 4. Verificación propuesta (post-implementación)
1. Unit test normalizePhone con: +56, 56, 9XXXXXXXX, +1, +34, +86
2. Simular `agregar a {nombre} +1 415 555 1234` → guest creado con `+14155551234`
3. Simular `enviar invitación a +14155551234` → verificar respuesta Meta (template internacional)
4. Test real con un número internacional de prueba si Alejandro lo provee

---

## 5. Decisiones que necesito de ti
1. ❓ ¿Implemento la corrección completa (regex + normalizePhone + Slack + admin)?
2. ❓ ¿Tienes un número internacional real para testear el envío (ej: familia de Kuilen en China/Corea)?
3. ❓ ¿Vale la pena revisar tarifas Meta por país antes de invitar internacionales?
