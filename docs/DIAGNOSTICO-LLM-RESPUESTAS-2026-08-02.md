# Diagnóstico: respuestas desde el otro número + LLM aparentemente mudo

> **Fecha:** 02-Ago-2026 15:31 | **Autor:** Claw
> **Estado:** SOLO DIAGNÓSTICO — sin cambios aplicados

---

## 1. Síntoma reportado por Alejandro

- El flujo Slack bidireccional por threads funciona ✅ (thread creado, respuestas Slack→WA llegan)
- PERO: al enviar/recibir mensajes del invitado, **llegan respuestas desde el OTRO número** (Softify 3050 en vez del wedding 5497)
- El agente LLM del wedding parece no responder (o su respuesta se confunde con la de Softify)

## 2. Evidencia (logs webhook de Softify, 15:28-15:30 CLT / 19:28-19:30 UTC)

```
[19:28:46] [button] Quick reply de 56966283141: "Confirmar asistencia"
[19:28:46] 💬 [56966283141] Confirmar asistencia
[19:28:48] 🤖 DeepSeek respondió (costo: $0.0009)          ← SOFTIFY respondió
[19:28:48] [slack-event] 💍 thread=1785698927.098669 "Invitado: Confirmar asistencia"  ← wedding thread
[19:28:48] [slack-event] 🎉 RSVP CONFIRMADO 56966283141     ← wedding agent guardó RSVP
[19:29:21] 💬 [56966283141] Grande kyo
[19:29:23] 🤖 DeepSeek respondió (costo: $0.0008)          ← SOFTIFY respondió OTRA VEZ
[19:30:19] 💬 [56966283141] Hi
```

Y en el wedding agent (`/admin/conversations`):
```
56966283141: lastMessage "Hi", 19:30:18 UTC   ← el wedding agent SÍ recibe los mensajes
```

## 3. Causa raíz

**Ambas Meta Apps (Softify `1636363614308117` y Wedding Planner v2 `1590375222487560`) están suscritas al MISMO WABA `1004041115557689`** → ambas reciben TODOS los webhooks de AMBOS números (5497 y 3050).

| Servidor | ¿Filtra por phone_number_id? | Resultado |
|----------|------------------------------|-----------|
| **Wedding agent** (`claw-wedding-agent`) | ✅ SÍ — `if (metadata.phone_number_id !== PHONE_NUMBER_ID) skip` | Procesa solo el 5497, ignora el 3050 |
| **Softify** (`softify-whatsapp-webhook`) | ❌ **NO** — `handleMessage(msg, value, config, business)` procesa TODO sin mirar `value.metadata.phone_number_id` | **Procesa los mensajes del 5497 como suyos y responde desde el 3050** |

**Por eso:** cuando el invitado (o Alejandro) escribe al número de boda 5497:
1. El wedding agent lo procesa bien (RSVP, thread, etc.) ✅
2. Softify TAMBIÉN lo recibe, lo trata como cliente de Softify y responde con su DeepSeek **desde el número 3050** → "me llegan desde el otro número" ❌

**Sobre el LLM del wedding:** el wedding agent SÍ recibe los mensajes (conversations lo confirma). Su LLM DeepSeek (`classifyRSVPIntent` + `generateAndSendDeepSeekReply`) responde a textos no-RSVP. El problema es que la respuesta de Softify (3050) llega primero/además, creando confusión — no que el wedding LLM esté roto.

## 4. Solución propuesta (NO aplicada — requiere aprobación)

**Opción A (recomendada): filtro por phone_number_id en el webhook de Softify**
En `projects/softify-whatsapp-webhook/core/server.js`, dentro de `app.post('/webhook')`, antes de procesar mensajes:

```js
// Agregar al inicio del bloque de mensajes entrantes:
const metadataPhoneId = value.metadata?.phone_number_id;
const myPhoneId = process.env.PHONE_NUMBER_ID || config.phoneNumberId;
if (metadataPhoneId && myPhoneId && metadataPhoneId !== myPhoneId) {
  logger.log(`⏭️ Skip msg de ${metadataPhoneId} (no es ${myPhoneId})`);
  return; // o continue
}
```

- Es el MISMO patrón que ya usa el wedding agent (probado y funcionando)
- Softify procesará solo el 3050; el wedding solo el 5497
- No requiere tocar Meta Apps ni WABA

**Opción B (alternativa):** quitar la suscripción de la app Softify al WABA y usar webhooks a nivel de número — **descartada**: no hay webhook por número en Cloud API, y Softify necesita su suscripción.

**Opción C (verificación):** confirmar en los logs del wedding agent si `generateAndSendDeepSeekReply` responde a "Hi"/"Grande kyo" — si el fix A se aplica, la prueba será limpia (solo responde el wedding).

## 5. Pasos de verificación post-fix (cuando se aplique)

1. Aplicar filtro en Softify → deploy
2. Enviar template al 5497 → tocar botón → verificar: solo RSVP del wedding, SIN respuesta de Softify
3. Escribir "Hola" al 5497 → debería responder SOLO el wedding (DeepSeek con contexto boda)
4. Verificar en Slack: thread del wedding actualizado, sin ruido de Softify
5. Confirmar que Softify sigue respondiendo normalmente a su número 3050

## 6. Archivos relacionados
- `projects/softify-whatsapp-webhook/core/server.js` — línea 74 (webhook), línea 89 (handleMessage sin filtro)
- `projects/wedding-planner/src/server.js` — filtro phone_number_id ya existente (referencia del patrón)
- `docs/ESTADO-2026-08-02.md` — estado del día
