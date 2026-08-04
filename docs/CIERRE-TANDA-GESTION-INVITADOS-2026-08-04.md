# ✅ Cierre de tanda: Gestión de invitados (F1 + G1-G4 + Parejas)

> **Fecha de cierre:** 04-Ago-2026 19:19 | **Autor:** Claw
> **Estado:** TANDA COMPLETA — todas las piezas implementadas, desplegadas y verificadas en producción

---

## 1. Resumen de la tanda completa

| Módulo | Descripción | Deploy | Estado |
|--------|-------------|--------|--------|
| **F1** | Ciclo de vida de invitados: hash `wedding:guests` con `stage`, historial `templatesSent`, migración lista→hash automática | `54885d56` | ✅ |
| **Envío invitación** | `enviar invitación a {phone}` (con header IMAGE) + `enviar invitación a todos` (batch, rate limit) | `54885d56` | ✅ |
| **G1** | `eliminar invitado {phone}` — Opción B: borra invitado + actor + **RSVP asociado** | `2741bccf` | ✅ |
| **G2** | `ver invitados` — listado con stages + resumen por estado + 👫 parejas | `2741bccf` | ✅ |
| **Parejas 👫** | `agregar a A y B` (2 teléfonos) + `vincular pareja {p1} {p2}` + **absorción de +1 mutuo** en stats | `2741bccf` | ✅ |
| **G3** | `reenviar invitación a {phone}` — sin dedupe (flag force) | `0d93d350` | ✅ |
| **G4** | `editar correo/nombre/teléfono de {phone} a ...` — teléfono reemplaza con aviso | `0d93d350` | ✅ |

**Menú de novios** actualizado con los 8 comandos de gestión.

---

## 2. Comandos finales del Panel de Novios (WhatsApp)

```
➕ "agregar a {nombre} +56 9..." — añadir invitado (o pareja: "agregar a A +56 9... y B +56 9...")
📨 "enviar invitación a {phone}" — save-the-date a uno
📨 "reenviar invitación a {phone}" — reenviar sin dedupe
📨 "enviar invitación a todos" — batch a pendientes
📋 "ver invitados" — listado con stages
📊 "ver confirmaciones" — estado RSVP (+ "ver nombres" para el listado)
👫 "vincular pareja {p1} {p2}" — vincular 2 invitados (fix +1)
✏️ "editar correo/nombre/teléfono de {phone} a ..." — editar invitado
🗑️ "eliminar invitado {phone}" — eliminar (con confirmación "sí, eliminar")
```

---

## 3. Estructura de datos final (hash `wedding:guests`)

```json
{
  "name": "María González",
  "phone": "+56912345678",
  "email": "maria.nueva@gmail.com",
  "addedBy": "+56966283141",
  "createdAt": "...",
  "stage": "nuevo | invitacion_enviada | confirmado | no_asistira | tal_vez",
  "stageUpdatedAt": "...",
  "templatesSent": [{ "name": "save_the_date_v4_img", "ts": "...", "wamid": "..." }],
  "coupleId": "CP-XXXXXX",
  "partnerPhone": "+569..."
}
```

**Keys Redis relacionadas:**
- `wedding:guests` — hash phone → guest JSON (fuente de verdad de invitados)
- `wedding:rsvps` — lista de confirmaciones (se borra el RSVP al eliminar invitado, Opción B)
- `wedding:pend_delete:{novio}` — confirmación pendiente de eliminación (TTL 2 min)
- `wedding:actors` — registro de roles (Fase 1 agente dual)

---

## 4. Verificación en producción (evidencia)

- 13 invitados reales cargados (7 invitación enviada, 6 nuevo)
- Stats con absorción de parejas: `totalAsistentes` correcto
- Comandos simulados y verificados: agregar (individual + pareja), enviar, reenviar, editar correo, editar nombre, guest-states
- `/admin/stats` y `/admin/guest-states` funcionando

---

## 5. Lo que NO se implementó (consciente)

| Ítem | Razón |
|------|-------|
| `editar etapa` (stage manual) | No solicitado — se cierra la tanda |
| Mejora del form rsvp.html (selector "¿vienes con tu pareja?") | Fase 2 futura (precisión 100% del +1) |
| Template `invitacion_formal` (carta post-RSVP) | Fase 2 futura (pendiente F2 del plan de templates) |
| Recordatorios automáticos T-30/T-7/T-24h | Fase 3 futura (pendiente) |
| Espejo Postgres de guests | Fase 4 futura (pendiente) |

---

## 6. Commits de la tanda

- `c0a3698` F1 ciclo de vida (hash + stage)
- `393d1b4` migración lista→hash
- `7c53d86` envío con header IMAGE
- `15dab81` fix WEDDING_SITE_URL
- `689b041` G1+G2+Parejas
- `02efa09` G3+G4
- `1504784` fix parser nombre
- Deploys: `54885d56`, `2741bccf`, `0d93d350`

## 7. Próximas tandas (cuando Alejandro decida)
1. **F2 templates:** crear `invitacion_formal` en Meta + comando `enviar carta formal` (carta oficial post-RSVP con código de novios)
2. **F3 recordatorios:** cron T-30 / T-7 / T-24h
3. **F4 Postgres:** espejo de guests para reportes/marketing
4. **codigonovios.cl:** backend de lista pública + Mercado Pago
