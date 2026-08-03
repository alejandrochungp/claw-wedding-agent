# Diagnóstico: DEEPSEEK_API_KEY inválida (401) — Texto libre sin respuesta LLM

**Fecha:** 02-Ago-2026 | **Proyecto:** claw-wedding-agent (boda Alejandro & Kuilen)
**Severidad:** ALTA (bloqueaba todo reply LLM de texto libre) | **Estado:** RESUELTO 20:10 CLT

## Síntoma
- Botones RSVP (quick replies) funcionaban perfecto: Kuilen tocó "Confirmar asistencia" → respuesta automática OK
- Pero el texto libre (ej: "Gracias") NO recibía respuesta LLM
- Mismo fallo con pruebas de Alejandro: "Grande kyo", "Hi" (19:29-19:30 UTC)

## Causa raíz
**La `DEEPSEEK_API_KEY` configurada en Railway era inválida** → toda llamada a `api.deepseek.com` respondía **401 Unauthorized**.

Evidencia en logs de Railway (`railway logs`):
```
💬 56956375085: Gracias
❌ DeepSeek RSVP error: Request failed with status code 401
🤷 RSVP unknown: 56956375085 — "Gracias"
❌ DeepSeek reply error: Request failed with status code 401
```

## Por qué era silencioso (diseño del código)
- `generateAndSendDeepSeekReply()` y `classifyRSVPIntent()` tienen `try/catch` con `console.error` + **fail silencioso** ("don't spam guest with errors")
- `/status` reportaba `llmRSVP: true` porque solo verifica `!!DEEPSEEK_API_KEY` (variable existe) — **NO valida la key**
- Los botones no usan LLM (`handleButtonReply` = respuesta fija) → por eso funcionaban

## Fix aplicado (aprobado por Alejandro 19:20 CLT)
```bash
railway variable --set "DEEPSEEK_API_KEY=*** key válida de .secrets/deepseek_key.txt>"
```
- Key local válida: `sk-db6f22a...b4dc` (35 chars) — verificada con llamada directa a `api.deepseek.com/v1/chat/completions` (modelo `deepseek-chat`)
- Railway redeploy automático → `/status` uptime reseteado (3s) → servicio limpio
- **Verificado por Alejandro 20:10: "Funciona"** ✅

## Cómo diagnosticar (playbook para subagentes)
1. **Primero reproducir localmente:** llamar a DeepSeek con la key de `.secrets/deepseek_key.txt` y el mismo prompt del bot → si local funciona, el problema es el ambiente
2. **Sacar logs de Railway:** `railway logs` (runtime) desde el repo linkeado — muestra los `❌ DeepSeek ... error`
3. **Ojo con el CLI:** NO setear `RAILWAY_TOKEN` env (sobreescribe sesión OAuth y da "Unauthorized"). Usar sesión guardada (`env.pop("RAILWAY_TOKEN", None)` en Python). Ver `DEPLOY.md` → "Lección crítica: sesión OAuth"
4. **Verificar key:** `railway variable list` muestra `DEEPSEEK_API_KEY` (enmascarada); la validez se prueba con una llamada real

## Prevención
- [ ] Al setear una key nueva, probarla SIEMPRE con una llamada real antes de darla por buena
- [ ] Considerar validar la key en el arranque del server (log de error claro si 401)
- [ ] Borrar residuos `CLAUDE_API_KEY`/`CLAUDE_MODEL` de Railway (ya no se usan)

## Archivos relacionados
- `memory/2026-08-02.md` — sección "19:06-20:10 — Boda: Diagnóstico + Fix LLM DeepSeek (401)"
- `docs/ESTADO-2026-08-02.md` — estado final del día
- `docs/DEPLOY.md` — env vars + lección sesión OAuth
- Scripts en `tmp/`: `wa_repro_deepseek_gracias.py`, `railway_get_logs.py`, `railway_wait_redeploy.py`, `railway_set_deepseek_key.py`
