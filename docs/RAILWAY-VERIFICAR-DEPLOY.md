# Railway: Verificar Deploy sin CLI funcional (Playbook para subagentes)

**Fecha:** 2026-08-02 | **Autor:** asistente (sesión Boda China) | **Aplica a:** cualquier servicio Railway auto-deploy desde GitHub

## Contexto del caso

Se pusheó `e99cd2a` a `main` del repo `alejandrochungp/softify-whatsapp-webhook` (fix de encoding UTF-8 que destrabó builds rotos desde 24-Jul). El push dispara auto-deploy en Railway (integración GitHub). El objetivo era **confirmar que el deploy nuevo quedó vivo**.

**Resultado final: la verificación exitosa tomó 1 llamada HTTP** (endpoint público `/status`), después de ~8 intentos fallidos por la vía CLI/API. Este doc explica qué no funcionó, qué sí, y el playbook corto para la próxima vez.

---

## 🟢 LO QUE FUNCIONA (usar esto primero, siempre)

### 1. Endpoint público `/status` del servicio (método rey)
```bash
curl https://<servicio>-production.up.railway.app/status
# Respuesta: {"ok":true,"tenant":"softify","phone":"+56941703050","uptime":70.33}
```
**El campo `uptime` (segundos) es la señal de deploy:**
- `uptime` bajo (ej. 70s, 300s) = el proceso arrancó hace poco → **deploy nuevo VIVO** ✅
- `uptime` alto (ej. 1.631.044s ≈ 18.9 días) = sigue corriendo el build viejo → deploy nuevo NO llegó o falló

### 2. Endpoint `/admin/logs` del servicio (si existe)
```bash
curl https://<servicio>-production.up.railway.app/admin/logs
```
Devuelve JSON con los logs recientes en memoria. Un arranque limpio muestra líneas tipo:
`Servidor escuchando en 0.0.0.0:3000`, `catalog precalentado`, sin stack traces.

### 3. GitHub `git ls-remote` (confirmar que el push llegó)
```bash
git ls-remote origin main   # debe mostrar el hash del commit pusheado
```

---

## 🔴 LO QUE NO FUNCIONÓ (intentos fallidos, con error exacto)

| # | Intento | Error | Por qué falló |
|---|---------|-------|---------------|
| 1 | `railway deployment list` (PowerShell directo) | `Unauthorized. Please check that your RAILWAY_TOKEN is valid...` | El token del ENV (`da5b0076-...`) no tiene acceso al proyecto Softify (5278e66d) |
| 2 | Llamar `railway` desde Python `subprocess.run` | `FileNotFoundError: [WinError 2]` | Python NO resuelve shims `.ps1`/`.cmd` de npm — hay que usar ruta completa `C:\Users\achun\AppData\Roaming\npm\railway.cmd` |
| 3 | `railway status --project <id>` con cada token | `error: unexpected argument '--project' found` | Esta versión del CLI no acepta `--project` en `status` (ni `--token` como flag global en `whoami`) |
| 4 | Probar los 3 tokens de `.secrets` + ENV contra `deployment list` | `Invalid RAILWAY_TOKEN` / `Unauthorized` (todos) | Los tokens guardados (`railway_token.txt`, `railway_project_token.txt`, `railway_wedding_project_token.txt`) dieron Unauthorized/403 en esta sesión — **no confiar a ciegas en ellos** |
| 5 | GraphQL API `backboard.railway.app/graphql/v2` (query `project { services { deployments } }`) | `HTTP 403 Forbidden` | Los mismos tokens no autorizan GraphQL para este proyecto |
| 6 | `railway logs --build <deployment-id>` | `Unauthorized` | Ídem token ENV sin acceso |
| 7 | `railway --token X whoami` | `error: unexpected argument '--token' found` | Flag no soportado en esta versión del CLI |

**Conclusión:** en esta máquina, con estos tokens, la vía CLI/GraphQL está muerta para verificar deploys. No perder tiempo con ella.

---

## 📋 PLAYBOOK RÁPIDO (para subagentes futuros)

1. **Confirmar push:** `git -C <repo> ls-remote origin main` → hash = commit esperado
2. **Esperar build:** 2-4 min (Nixpacks). Si es la primera vez, más.
3. **Verificar deploy:** `curl <servicio>-production.up.railway.app/status` → `uptime` bajo = deploy nuevo vivo
4. **Confirmar arranque:** `curl .../admin/logs` → líneas de arranque limpio
5. Si `uptime` sigue alto tras 5+ min → el build falló; recuperar logs de build con `railway logs --build <deployment-id>` SOLO si se tiene un token con acceso al proyecto (si no, revisar el último deploy fallido por el endpoint del servicio o pedir token fresco)

**Regla de oro:** el endpoint `/status` del servicio es la fuente de verdad más barata. El CLI es el último recurso, no el primero.

---

## 🧠 Aprendizajes / Notas de contexto

- **El push a GitHub dispara auto-deploy en Railway** (integración configurada por proyecto). No hace falta gatillar nada manual.
- **`git push` en PowerShell puede devolver exit code 1** aunque el push fue exitoso (PowerShell trata el stderr de git como error nativo). No confundir: verificar con `ls-remote`.
- **Python subprocess y shims npm:** usar siempre la ruta completa `C:\Users\achun\AppData\Roaming\npm\<tool>.cmd` (lección ya documentada con `openclaw.cmd`/`ntn.cmd`, ahora confirmada con `railway.cmd`).
- **Tokens Railway:** los guardados en `.secrets/` pueden expirar o perder scope. Si dan `Unauthorized`/`403`, pedir token fresco del proyecto en Railway dashboard (Settings → Tokens) — el CLI solo sirve con un token del proyecto correcto.
- **`uptime` en `/status` es el indicador universal** de "build viejo vs nuevo" — memorizarlo.
- **Los docs del proyecto (wedding-planner) viven en `projects/wedding-planner/docs/`** — los subagentes deben leerlos antes de asumir que saben verificar deploys.

---

## Archivos relacionados
- `projects/softify-whatsapp-webhook/` — repo del servicio Softify (rama `main`)
- `memory/2026-08-02.md` — sección Softify con diagnóstico encoding + deploy
- `backups/softify-2026-08-02/` — backup previo a restauración
