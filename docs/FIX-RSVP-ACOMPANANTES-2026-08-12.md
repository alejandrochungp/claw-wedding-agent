# FIX RSVP ACOMPAÑANTES — bug de la ñ + repair + aviso a novios (12-Ago-2026)

> **Estado:** ✅ IMPLEMENTADO Y VERIFICADO (commits `a9028b8`, `f80eb60`, `95d0399`, `4c78d08`, `ba8632e` → mirror + origin → Railway)
> **Bug reportado por Alejandro:** "¿Estás seguro de que los invitados no han añadido acompañantes? Entiendo que sí lo han hecho."

---

## 1. Diagnóstico (causa raíz)

El parser del RSVP en `src/server.js` usaba:

```js
acompanantes: get(/acompa\w*\s*:\s*([^\n]+)/i),
```

En JavaScript `\w` **NO matchea la ñ** (solo A-Z, a-z, 0-9, _). El formulario del micrositio (`site/rsvp.html`) envía `"👥 Acompañantes: 2"` (con ñ) → el regex no encontraba match → `d.acompanantes = null` → se guardaba `'0'`.

**Confirmación con prueba real:** el texto original de Yona Chung Park decía "Acompañantes: 2" pero quedó registrado con 0. Con "Acompanantes" (sin ñ) el regex sí capturaba.

**Impacto:** ~13 invitados con acompañantes reales (~24 personas adicionales) registrados como 0.

---

## 2. Fix aplicado (parser)

```js
acompanantesRaw: get(/acompa[nñ]antes?\s*:\s*([^\n]+)/i),
// normalización: solo dígitos, máx 5 (form permite 0-5; typos tipo 550/05 → primer dígito)
if (parsed.acompanantesRaw != null) {
  const m = parsed.acompanantesRaw.match(/\d+/);
  if (m) {
    const n = parseInt(m[0], 10);
    parsed.acompanantes = n > 5 ? m[0][0] : String(n);
  } else {
    parsed.acompanantes = '0';
  }
}
```

**Normalización:** Gibran escribió "550" (typo) → 5 · Guihua "05" → 5 · números 0-5 se conservan.

---

## 3. Endpoint de reparación de datos históricos

`POST /admin/rsvps/repair` — reprocesa las conversaciones guardadas en Redis (`wedding:conversations`, key `wa:{phone}`) con el parser corregido y actualiza los RSVP en `wedding:rsvps`.

- 1ª pasada (fix ñ): **15 registros corregidos** (0 → valor real)
- 2ª pasada (normalización): **4 corregidos** (Guihua 05→5, Gibran 550→5, 2 casos texto pegado → 0)

**Resultado final:** 14 invitados con acompañantes · **24 personas adicionales** totales.

---

## 4. Aviso a novios por WhatsApp

Nueva función `notifyNoviosRsvp(d, status)` en `handleRsvpFormMessage` — al recibir un RSVP:

1. **Con ventana de 24h** (conversación reciente con el novio en Redis): mensaje libre con detalle completo (nombre, estado, acompañantes, mensaje 💌)
2. **Sin ventana**: plantilla `aviso_rsvp_novios_v2` (4 variables: nombre, estado, acompañantes, mensaje) con **fallback a v1** si v2 aún no está APPROVED

**Plantillas Meta creadas (WABA 1004041115557689):**

| Plantilla | Variables | Status |
|-----------|-----------|--------|
| `aviso_rsvp_novios` | 3 (nombre, estado, acompañantes) | APPROVED |
| `aviso_rsvp_novios_v2` | 4 (+mensaje del invitado) | APPROVED (12-ago 13:2x) |

- v1: "Nueva confirmación de asistencia a la boda:\nNombre: {{1}}\nEstado: {{2}}\nAcompañantes: {{3}}\nGracias por avisar. 🥂"
- v2: idem + "Mensaje: {{4}}" (si no hay mensaje → "—")

---

## 5. Verificación end-to-end (12-ago 13:35-13:54)

- Test plantilla v2 a Alejandro (56966283141): **accepted** ✅ — renderiza {{4}} correctamente
- Envío masivo a ambos novios:
  - **Alejandro** (ventana 24h abierta): 1 mensaje libre con resumen completo (17 invitados reales, acompañantes, restricciones, mensajes) — OK
  - **Kuilen** (sin ventana): 17 plantillas v2 individuales (una por confirmación) — todas **accepted** ✅

---

## 6. Archivos/scripts clave

- `src/server.js` — parser corregido + `notifyNoviosRsvp` + `POST /admin/rsvps/repair`
- `tmp/meta_create_aviso_v4.py` — creó plantilla v1 (body sin variable al final)
- `tmp/meta_create_aviso_v2_tpl.py` — creó plantilla v2
- `tmp/wa_send_rsvps_ambos.py` — envío masivo (Alejandro resumen + Kuilen plantillas)
- `tmp/cn_qa_parser2.py` — QA del parser normalizado (5/5 casos)

## 7. Lecciones

- **`\w` en JS no matchea ñ/acentos** — usar `[nñ]` o `[a-záéíóúñü]` en regex de labels en español
- Los labels con emoji del form (👤 📱 👥 🍽 🅿️ 💌) son la "firma" del micrositio; el parser depende de ellos
- Plantillas Meta: las variables **no pueden ir al principio ni al final** del body (error_subcode 2388299)
- Meta aprueba plantillas UTILITY en horas (v2: creada 12:56 → APPROVED ~13:30)
- Ventana de 24h: se detecta con la conversación `wa:{phone}` en Redis (timestamp < 24h)
