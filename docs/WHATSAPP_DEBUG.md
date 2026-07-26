# WhatsApp Delivery Debug — 25-Jul-2026

## Síntomas

Desde ~21:52 CLT, Alejandro NO recibe mensajes de WhatsApp desde NINGÚN número del WABA, a pesar de que la API de Meta retorna `message_status: accepted` en todos los casos.

### Cronología de envíos

| Hora | Número | Template | Media ID | API Response | ¿Recibido? |
|------|--------|----------|----------|-------------|------------|
| ~20:28 | Wedding Planner (5497) | Texto libre | — | 200 accepted | ✅ Sí |
| ~20:33 | Wedding Planner (5497) | save_the_date (v1) | N/A | 200 accepted | ✅ Sí |
| ~21:03 | Wedding Planner (5497) | save_the_date_v3 | 1592980732290849 | 200 accepted | ✅ Sí (imagen descargable, texto comprimido) |
| ~21:17 | Wedding Planner (5497) | save_the_date_v3 | 1592980732290849 | 200 accepted | ✅ Sí |
| ~21:52 | Wedding Planner (5497) | save_the_date_v3 | 1592980732290849 | 200 accepted | ❌ No |
| ~21:55 | Wedding Planner (5497) | save_the_date_v3 | 1008948418580244 | 200 accepted | ❌ No |
| ~22:05 | Wedding Planner (5497) | save_the_date_v3 | 964654866633262 | 200 accepted | ❌ No |
| ~22:10 | Softify (3050) | save_the_date_v3 | 2082350595652862 | 200 accepted | ❌ No |

### Templates probados
| Template | ID | Status | Header |
|----------|-----|--------|--------|
| save_the_date (v1) | 4059477664346100 | APPROVED | TEXT |
| save_the_date_v3 | 1359786772191285 | APPROVED | IMAGE |

### Números involucrados
| Número | Phone ID | App | Quality | Status |
|--------|----------|-----|---------|--------|
| +56994635497 (Wedding Planner) | 1268610086327579 | Wedding Planner (1261291912568631) | GREEN | CONNECTED, CLOUD_API, VERIFIED |
| +56966283141 (Softify) | 1122911184237640 | Softify (1636363614308117) | GREEN | CONNECTED |

### Destinatario
Alejandro Chung — +56966283141 — mismo número que recibió los mensajes de las ~20:28-21:17

---

## Health Status (vía API Meta)

### Wedding Planner (5497)
```
can_send_message: LIMITED
├── PHONE_NUMBER (1268610086327579): AVAILABLE ✅
├── WABA (1004041115557689): AVAILABLE ✅
├── BUSINESS (2065338583688337): LIMITED ⚠️
│   └── error 141010: "The Business has not passed business verification"
└── APP (1636363614308117 Softify): AVAILABLE ✅
```

### Softify (3050)
```
can_send_message: LIMITED
├── PHONE_NUMBER (1122911184237640): LIMITED ⚠️
│   └── "Your display name has not been approved yet. Your message limit will increase after the display name is approved."
├── WABA (1004041115557689): AVAILABLE ✅
├── BUSINESS (2065338583688337): LIMITED ⚠️
│   └── error 141010: "The Business has not passed business verification"
└── APP (1636363614308117 Softify): AVAILABLE ✅
```

---

## Actualización 26-Jul-2026

### 09:55 — Business Verification en curso ✅
Alejandro subió los documentos de verificación del negocio al Meta Business Manager.
- **ETA:** 2 días hábiles (~28-Jul-2026)
- **Acción:** Esperar aprobación de Meta
- **Verificación post-aprobación:** `GET /v22.0/{phone_id}/whatsapp_business_health` → `can_send_message: AVAILABLE`

### 09:55 — Test send post-documentos
Se intentó envío de `save_the_date_v3` a Alejandro desde Wedding Planner (5497):
- API: `message_status: accepted` (wamid `wamid.HBgLNTY5NjYyODMxNDEVAgARGBI0MTZCMTlCQzVGMTU5REM2M0IA`)
- ¿Recibido? ⚠️ Pendiente confirmación (probablemente NO hasta que se apruebe la verificación)

---

## Hipótesis de Causa Raíz

### 1. Business Verification Pendiente (error 141010) ⭐ PRINCIPAL SOSPECHOSO
Ambos números comparten el mismo BUSINESS (`2065338583688337`), que tiene `can_send_message: LIMITED` por no haber completado la verificación de negocio.

**Por qué explicaría el cambio repentino:** Meta puede escalar restricciones gradualmente. Primero permite mensajes de prueba, luego aplica el límite cuando detecta actividad de templates de marketing. El volumen de envíos de templates entre 20:28-21:17 (4+ mensajes en 1 hora) pudo haber disparado un threshold.

**Evidencia a favor:**
- Ambos números dejaron de entregar simultáneamente (~21:52)
- El error 141010 afecta a todo el BUSINESS
- Los mensajes previos que SÍ se entregaron fueron en un lapso de ~1h antes del bloqueo

**Cómo verificar:** Alejandro debe entrar a <https://business.facebook.com/settings/security> y completar la verificación del negocio `2065338583688337`.

### 2. Ventana de 24h cerrada
Templates MARKETING deberían funcionar fuera de la ventana, pero si el BUSINESS está LIMITED, Meta podría exigir ventana de 24h incluso para templates.

**Cómo verificar:** Alejandro envía un mensaje a cualquiera de los números → se reabre ventana → reenviamos template.

### 3. Cambio de verified_name
El nombre verificado del 5497 cambió 3 veces en 48h (Wedding Planner → Aconcagua Capital SpA → Programa Emprender). Cada cambio puede disparar re-verificaciones.

### 4. Rate limiting / Quality filtering
El throughput level es `STANDARD` (no `HIGH`). Si Meta detectó un patrón de mensajes de marketing con un BUSINESS no verificado, puede estar aplicando rate limiting o bloqueo silencioso.

---

## Próximos Pasos (en orden de prioridad)

1. ⭐ **Completar Business Verification** en Meta Business Settings — resolvería el error 141010
2. **Reabrir ventana de 24h:** Alejandro envía "hola" al número Softify (+56966283141 → Softify 3050) y/o Wedding Planner → reenviamos template
3. **Probar con template v2** (TEXT header, sin imagen) para descartar que sea problema de la imagen
4. **Probar envío de texto simple** (requiere ventana abierta) para confirmar si el canal básico funciona
5. **Revisar webhooks** para ver si Meta está enviando notificaciones de delivery failure

---

## Templates Aprobados (para referencia)
| Template | ID | Status | Header |
|----------|-----|--------|--------|
| save_the_date (v1) | 4059477664346100 | APPROVED | TEXT |
| save_the_date_v2 | 2274081063416149 | APPROVED | TEXT |
| save_the_date_v3 | 1359786772191285 | APPROVED | IMAGE |

---

## Error 141010 en Profundidad

### ¿Qué es el error 141010?

Error de la WhatsApp Business Platform: **"The Business has not passed business verification"**.

Es una restricción a nivel BUSINESS (no phone number, no WABA) que limita la capacidad de envío de mensajes. La API de Meta retorna `message_status: accepted` con HTTP 200 y un `message_id` válido, pero WhatsApp NO entrega el mensaje — es un **bloqueo silencioso**.

### ¿Por qué es silencioso?

A diferencia de otros errores (token inválido → 401, rate limit → 429), el error 141010 no produce rechazo en el POST. Meta acepta el mensaje, lo encola, y luego lo descarta internamente. Esto hace que sea difícil de diagnosticar sin consultar explícitamente el health status.

### ¿Cómo se detecta?

```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://graph.facebook.com/v22.0/{PHONE_ID}/whatsapp_business_health"
```

Respuesta con bloqueo:
```json
{
  "can_send_message": "LIMITED",
  "entities": [
    {
      "entity_type": "BUSINESS",
      "id": "2065338583688337",
      "can_send_message": "LIMITED",
      "errors": [{
        "error_code": 141010,
        "error_description": "The Business has not passed business verification"
      }]
    }
  ]
}
```

### Niveles de restricción

WhatsApp Cloud API tiene 3 niveles donde puede haber restricciones:

| Nivel | Entidad | Errores posibles |
|-------|---------|------------------|
| PHONE_NUMBER | Número individual | Display name not approved, quality rating LOW |
| WABA | WhatsApp Business Account | Límite de mensajes, revisión de cuenta |
| **BUSINESS** | **Facebook Business Manager** | **141010: Business Verification pendiente** |

El error 141010 es el más grave porque afecta a TODOS los números y WABAs que pertenecen al mismo BUSINESS.

### ¿Por qué pasó en nuestro caso?

1. Se creó un BUSINESS nuevo (`2065338583688337`) para operar Softify
2. Se agregó Wedding Planner como segunda Meta App al mismo WABA/BUSINESS
3. Meta permite operación inicial sin verificación (mensajes de prueba, pocos templates)
4. Al escalar a templates de MARKETING (categoría más restrictiva), Meta aplica la restricción gradualmente
5. Timeline: ~4 mensajes en 1 hora (20:28-21:17) → bloqueo (~21:52)
6. Posible trigger: combinación de MARKETING templates + BUSINESS no verificado + volumen creciente

### ¿Qué tipos de mensajes bloquea?

| Tipo | ¿Bloqueado con 141010? |
|------|------------------------|
| Templates MARKETING | ❌ Bloqueado |
| Templates UTILITY | ⚠️ Muy probable (BUSINESS LIMITED afecta todo) |
| Templates AUTHENTICATION | ⚠️ Muy probable |
| Texto libre (sesión activa 24h) | ⚠️ Puede o no funcionar (inconsistente) |
| Texto libre (fuera de sesión) | ❌ Bloqueado (ventana 24h + BUSINESS) |

### Tiempo estimado de resolución

- **24-48h hábiles** después de subir documentos
- Puede ser más rápido si Meta ya tiene información del negocio
- No hay fast-track ni soporte prioritario para este proceso

### Solución definitiva

Documentada en detalle en: `projects/wedding-planner/docs/BUSINESS_VERIFICATION.md`

Resumen:
1. Entrar a <https://business.facebook.com/settings/security>
2. Iniciar Business Verification
3. Subir documentos legales (RUT, escritura constitución, comprobante domicilio)
4. Esperar revisión de Meta (24-48h)
5. Verificar `can_send_message: AVAILABLE`
6. Reanudar envíos

## Archivos Relacionados
- `memory/2026-05-01.md` — Campaña BTS ARIRANG (método original Resumable Upload API)
- `memory/2026-07-25.md` — Timeline completo del día
- `projects/wedding-planner/docs/RESUMABLE_UPLOAD_API.md` — Guía técnica del método de upload
- `projects/wedding-planner/docs/TEMPLATES.md` — Catálogo de templates
- `.secrets/wedding_meta_app.txt` — Credenciales Meta App Wedding Planner
- `.secrets/softify_wa_token.txt` — Token WhatsApp (System User)
- `tmp/wa_send_softify.py` — Script de envío desde Softify
- `tmp/wa_resend.py` — Script de envío desde Wedding Planner
