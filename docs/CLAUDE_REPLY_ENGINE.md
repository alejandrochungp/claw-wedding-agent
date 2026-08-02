# Claude Reply Engine — Wedding Planner v1.6.0

> Modelo: `claude-sonnet-4-6` (mismo que chatbot Yeppo)
> API: Anthropic `/v1/messages`
> Migración: 26-Jul-2026 (desde OpenAI gpt-4o-mini)

## Arquitectura

```
WhatsApp message entrante
    │
    ▼
handleTextMessage()
    │
    ├── ¿Es botón interactivo? → handleButtonReply()
    │
    └── ¿Es texto libre? → handleTextRSVP()
                              │
                              ├── classifyRSVPIntent() ← Claude API
                              │       │
                              │       ├── "confirm" → reply con datos boda + calendario
                              │       ├── "decline" → reply empático
                              │       └── "unknown" → generateAndSendClaudeReply()
                              │
                              └── Fallback: heuristicRSVP() (detección de negación)
```

## Dos funciones Claude

### 1. `classifyRSVPIntent(text)` — Clasificación de intención RSVP

- **System prompt:** Clasifica como `confirm` / `decline` / `unknown`
- **max_tokens:** 5 (solo respuesta de una palabra)
- **timeout:** 10s
- **Costo aprox:** ~$0.0003 por clasificación (input ~200 tokens + output ~5 tokens)

**Heurísticas clave en el prompt:**
- `"no voy" = decline`
- `"no voy a poder" = decline`
- `"no puedo confirmar todavía" = unknown`
- `"sí, voy" = confirm`
- `"dale, ahí estaré" = confirm`

**Fallback:** Si `CLAUDE_API_KEY` no está configurada o la API falla → `heuristicRSVP()` con detección de negación:
```javascript
// Negation-aware: check "no" patterns FIRST
if (/\bno\s+(?:podr[eé]|puedo|voy\b|pasa|queda|alcanzo|creo\s+que\s+podr[eé])/i.test(text)) return 'decline';
// Strong confirm (checked AFTER negation)
if (/\ball[ií]\s+estar[eé]/i.test(text)) return 'confirm';
```

### 2. `generateAndSendClaudeReply(phone, userText)` — Auto-reply conversacional

- **System prompt:** Contexto completo de la boda + 6 reglas de tono
- **max_tokens:** 300
- **timeout:** 15s
- **Costo aprox:** ~$0.005-0.02 por reply (input ~500 tokens + output ~100-300 tokens)

**System prompt (completo):**
```
Sos el asistente de WhatsApp para la boda de Kuilen y Alejandro.

Contexto de la boda:
- Fecha: ${fecha formateada}
- Hora: ${hora} hrs
- Lugar: Restaurante Meihua, Cerrillos
- Dress code: ${dressCode}

Reglas:
1. SIEMPRE responde en el mismo idioma del invitado
2. Tono: directo, sin rodeos, informal pero respetuoso. NADA de "espero que estés bien", 
   "saludos cordiales", "quedo atento". Sin chilenismos
3. Si preguntan fecha/hora/lugar → responde con datos concretos + link calendario
4. Si NO es pregunta sobre la boda → redirigí: "Para confirmar tu asistencia usá los botones 
   de arriba, o decime 'voy' o 'no voy a poder'"
5. Máximo 3 oraciones. Breve y útil.
6. Respuestas de UNA SOLA LÍNEA cuando sea posible.
```

## Comparación OpenAI vs Claude

| Aspecto | gpt-4o-mini (v1.5.0) | claude-sonnet-4-6 (v1.6.0) |
|---------|----------------------|---------------------------|
| Modelo | `gpt-4o-mini` | `claude-sonnet-4-6` |
| API | `/v1/chat/completions` | `/v1/messages` |
| Auth header | `Authorization: Bearer` | `x-api-key` |
| Request format | `{messages: [{role, content}]}` | `{messages: [{role, content}], system}` |
| Response path | `choices[0].message.content` | `content[0].text` |
| Costo clasificar | ~$0.0001 | ~$0.0003 |
| Costo reply | ~$0.002 | ~$0.01 |
| Mismo modelo que | — | Yeppo WhatsApp chatbot |
| Env var | `OPENAI_API_KEY` | `CLAUDE_API_KEY` + `CLAUDE_MODEL` |

## Monitoreo

### Logs en Railway Console
- `🤖 Claude RSVP: "mensaje" → confirm|decline|unknown`
- `💬 Claude reply sent to +56...`
- `❌ Claude RSVP error: ...` (en fallback a heurística)
- `❌ Claude reply error: ...` (silent fail, no molesta al invitado)

### En Slack
- `🎉 RSVP CONFIRMADO (LLM)` — clasificación exitosa
- `💔 NO ASISTIRÁ (LLM)` — clasificación exitosa
- `💬 Claude reply a +56... "mensaje" → "respuesta"`

### /status endpoint
```json
{
  "llmRSVP": true,          // CLAUDE_API_KEY configurada = true
  "version": "1.6.0"
}
```

## Costo mensual estimado

| Escenario | Invitados | Costo Claude/mes |
|-----------|-----------|-----------------|
| RSVP clasificaciones | 300 | ~$0.09 |
| Auto-replies conversacionales | 50 | ~$0.50 |
| **Total 300 invitados** | — | **~$0.60** |

Comparado con OpenAI: ~$0.15/mes. Diferencia insignificante (<$0.50) a cambio de:
- Mismo modelo que Yeppo (consolidación operativa)
- Mejor comprensión de matices en español
- Sin dependencia de dos proveedores de LLM
