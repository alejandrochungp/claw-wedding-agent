# Propuesta: Envío automático de templates a invitados (ciclo de vida RSVP)

> **Fecha:** 04-Ago-2026 | **Autor:** Claw
> **Estado:** PROPUESTA — NADA implementado (Alejandro debe aprobar)
> **Motivo:** Pregunta de Alejandro: "¿al añadir a alguien le envía el RSVP? ¿existen handles para decidir cuál template enviarle? ¿cómo sugieres configurarlo?"

---

## 1. Estado actual (04-Ago-2026, verificado en código)

### ¿Qué hace hoy `addGuestViaChat()` (cuando el novio agrega un invitado)?
| Paso | Qué pasa |
|------|----------|
| 1 | Guarda el invitado en Redis: `wedding:guests` → `{name, phone, email, addedBy, createdAt}` |
| 2 | Registra el actor: `registerActor(phone, 'invitado', {name, email})` (Fase 1) |
| 3 | Notifica a Slack: "➕ Invitado agregado por novio" |
| 4 | Confirma al novio: "✅ Agregué a María Pérez..." |

**❌ NO se le envía NINGÚN template al invitado.** El invitado queda en la lista pero nunca recibe el Save the Date por WhatsApp automáticamente.

### ¿Existe `sendTemplate()`?
Sí, la función genérica `sendTemplate(to, templateName, params)` existe y funciona (verificada), pero **solo se usa manualmente**:
- `POST /admin/test-template` (endpoint de prueba)
- Scripts sueltos (`tmp/wa_send_*.py`)

**No hay integración con el flujo de agregar invitados.**

### Templates aprobados disponibles
| Template | Botones | Uso ideal |
|----------|---------|-----------|
| `save_the_date_v4_img` | URL → rsvp.html / no-confirmado.html | **Invitación principal** (lleva al micrositio) |
| `save_the_date_v3` | QUICK_REPLY → Confirmar / No podre asistir | Alternativa sin navegador |
| `boda_info_img` | URL → info.html / regalos.html | Info del evento post-RSVP |
| `boda_galeria_img` | URL → galería | Compartir fotos |
| `save_the_date_v2` / `save_the_date` | texto | Legacy |

---

## 2. Respuestas directas

1. **¿Al añadir a alguien le envía el RSVP?** → **NO, hoy no.** Solo se guarda en la lista y se confirma al novio.
2. **¿Existen handles para decidir cuál template enviarle?** → **NO existen.** No hay un sistema de estados/etapas por invitado ni routing de templates. Todo envío es manual.
3. **¿Cómo sugiero configurarlo?** → Con un **ciclo de vida de invitado (state machine)** + **handles de template por etapa** configurables por boda (detalle abajo).

---

## 3. Propuesta: Guest Lifecycle con Handles

### 3.1 Concepto
Cada invitado tiene un **estado** persistido en Redis (`wedding:guest_state:{phone}`) y el bot decide qué template enviar según el estado, con reglas configurables por boda (tenant).

### 3.2 Estados (máquina de estados)
| Stage | Trigger | Template sugerido |
|-------|---------|-------------------|
| `nuevo` | Novio agrega invitado | — (sin envío automático) |
| `invitacion_enviada` | Novio (o batch) pide enviar invitación | `save_the_date_v4_img` |
| `rsvp_pendiente` | Invitación enviada, sin respuesta | — (espera) |
| `confirmado` | Invitado confirma (botón/texto) | `boda_info_img` (opcional auto) |
| `no_asistira` | Invitado declina | — (sin template) |
| `recordatorio_enviado` | Cron recordatorio (7d/24h) | `save_the_date_v4_img` o texto libre |
| `post_boda` | Después del evento | texto libre / agradecimiento (template por crear) |

### 3.3 Handles de template (config por tenant, en TENANT)
```js
templateHandles: {
  saveTheDate: 'save_the_date_v4_img',   // o 'save_the_date_v3' si se prefiere quick reply
  infoEvento: 'boda_info_img',
  galeria: 'boda_galeria_img',
  recordatorio: 'save_the_date_v4_img',
  postBoda: null,                          // pendiente crear template
}
```
→ Cada boda (tenant) elige qué template usar en cada etapa **sin tocar código**.

### 3.4 Reglas de negocio propuestas (configurables)
1. **Al agregar invitado → NO enviar automáticamente.** (Evita spam si el novio carga 50 invitados de golpe.) El envío se dispara con comando explícito o batch.
2. **Comandos novios nuevos:**
   - `enviar invitación a {phone}` → envía el save_the_date al invitado
   - `enviar a todos los pendientes` → batch a quienes están en `nuevo`
3. **Al confirmar RSVP → opcional auto-enviar `boda_info_img`** (flag `autoSendInfoOnConfirm: true/false`)
4. **Recordatorios programados** (cron): a los `rsvp_pendiente` sin respuesta → 7 días antes / 24 h antes
5. **Dedupe**: nunca enviar 2 veces el mismo template sin cambio de estado (protección anti-spam de Meta)

### 3.5 Límites de Meta (crítico para el diseño)
- ⚠️ **Los templates SOLO se pueden enviar fuera de la ventana de 24h** de conversación (o como respuesta dentro de la ventana). Un invitado que ya respondió está en ventana 24h → usar **texto libre**, no template.
- Meta penaliza spam: máximo ~1 template marketing/usuario/día recomendado → **rate limiting**.
- El template con **botones URL es el ideal** para invitar (lleva al micrositio y registra la visita).

### 3.6 Storage
- `wedding:guest_state:{phone}` → `{ stage, templatesSent: [{name, ts, wamid}], rsvpStatus, updatedAt }`
- `wedding:guests` (lista existente) se mantiene como registro base.
- Se cruza con `RSVP_KEY` (confirmaciones) ya existente.

### 3.7 Endpoints admin nuevos (debug)
- `GET /admin/guest-states` — ver estados de todos los invitados
- `POST /admin/send-invite {phone}` — disparar envío manual (test)

---

## 4. Fases de implementación (si se aprueba)
| Fase | Alcance |
|------|---------|
| **F1** | Estado de invitado + comando `enviar invitación a {phone}` + dedupe |
| **F2** | Auto-envío de `boda_info_img` al confirmar (flag configurable) |
| **F3** | Recordatorios programados (cron 7d/24h) a pendientes |
| **F4** | Batch `enviar a todos los pendientes` + endpoint admin de estados |

---

## 5. Decisiones que necesito de ti
1. **¿Envío automático al agregar o manual por comando?** → Recomiendo manual/batch (evita spam)
2. **¿Template de invitación por defecto?** → Recomiendo `save_the_date_v4_img` (URL al micrositio)
3. **¿Auto-enviar info del evento al confirmar?** → Sí/No
4. **¿Recordatorios automáticos?** → ¿A cuántos días antes? (7d y 24h sugerido)
5. **¿Template post-boda?** → Crear uno nuevo o texto libre
