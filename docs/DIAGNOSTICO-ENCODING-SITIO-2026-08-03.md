# Diagnóstico: Corrupción de Caracteres en el Micrositio (Encoding) — RESUELTO

**Fecha:** 03-Ago-2026 | **Proyecto:** claw-wedding-agent / micrositio `alejandro-kuilen.noscasamos.vip`
**Síntoma reportado por Alejandro:** "En la primera versión el contenido se veía bien, los caracteres sobre todo. Después de las modificaciones consecuentes se quebraron algunos caracteres."

---

## 🔍 Resumen del problema

Los archivos HTML del micrositio se **corrompieron en una edición masiva con PowerShell**: quedaron con **BOM UTF-8 (EF BB BF)** al inicio y **caracteres mojibake** (doble-encoding) — tildes, eñes y emojis se rompieron (`Ã©` en vez de `é`, `â€` en vez de emojis, etc.).

**Archivos afectados (5):** `index.html`, `info.html`, `rsvp.html`, `regalos.html`, `confirmado.html`
**Archivos sanos (2):** `galeria.html`, `no-confirmado.html` — justo los que **NO** pasaron por la edición PowerShell (galeria se reescribió con la herramienta `write` después; no-confirmado nunca se tocó con el reemplazo de teléfono).

## 🧬 Causa raíz

El 03-Ago ~15:30 se ejecutó un reemplazo masivo del número de contacto en todos los HTML usando PowerShell:

```powershell
Get-ChildItem -Filter "*.html" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw          # ← LEE como ANSI/Windows-1252 (default PS 5.1)
  $c2 = $c -replace "56966283141", "56994635497"
  Set-Content $_.FullName $c2 -NoNewline -Encoding UTF8   # ← ESCRIBE UTF-8 CON BOM
}
```

**El bug es doble:**
1. **Lectura**: PowerShell 5.1 (`Get-Content` sin `-Encoding UTF8`) interpreta un archivo UTF-8 sin BOM como **ANSI/Windows-1252** → cada carácter multibyte UTF-8 se lee como 2-3 caracteres ANSI separados.
2. **Escritura**: `Set-Content -Encoding UTF8` en Windows PowerShell 5.1 escribe **UTF-8 con BOM** (los 3 bytes `EF BB BF` al inicio).

Resultado: los caracteres ya mal interpretados se re-codifican a UTF-8 → **doble-encoding** (mojibake permanente). El BOM además puede causar que el navegador muestre el `<!DOCTYPE>` con caracteres raros si el servidor no lo maneja.

**Evidencia del BOM** (primeros 3 bytes por archivo, antes del fix):
```
confirmado.html: EF BB BF   ← corrupto
index.html:      EF BB BF   ← corrupto
info.html:       EF BB BF   ← corrupto
regalos.html:    EF BB BF   ← corrupto
rsvp.html:       EF BB BF   ← corrupto
galeria.html:    3C 21 44   ← OK (sin BOM, empieza con "<!D")
no-confirmado.html: 3C 21 44 ← OK
```

**Evidencia del mojibake** (conteo de patrones corruptos `Ã|â€|Â|�`):
```
confirmado.html: 8  | index.html: 16 | info.html: 20 | regalos.html: 7 | rsvp.html: 25
galeria/no-confirmado: OK
```

## 🔧 Solución aplicada

1. **Reescribir los 5 archivos afectados** con la herramienta `write` (que genera UTF-8 limpio **sin BOM**) — mismo contenido y número `+56 9 9463 5497`.
2. **Verificar localmente**: scan de BOM + mojibake → los 7 archivos `bom=OK encoding=OK`.
3. **Subir al servidor** vía scp y **verificar el HTML servido** con curl: tildes, emojis y texto correctos (ej: "Muy reducido — no alcanza...", "¡Estamos muy felices!", "✅ Confirmar asistencia").

## 🚫 Reglas para que NO vuelva a pasar

### Regla 1: NUNCA editar HTML con `Get-Content`/`Set-Content` de PowerShell 5.1
- `Get-Content` sin `-Encoding UTF8` lee ANSI → corrompe UTF-8.
- `Set-Content -Encoding UTF8` en PS 5.1 agrega BOM (no es UTF-8 estándar sin BOM).
- **Alternativas seguras:**
  - ✅ Herramienta `write` del asistente (UTF-8 sin BOM garantizado).
  - ✅ Python con encoding explícito: `open(f, encoding='utf-8')` / `write` con `encoding='utf-8'` y `newline=''`.
  - ✅ PowerShell 7+ (`pwsh`) con `-Encoding utf8NoBOM`.
  - ⚠️ Si es inevitable PS 5.1: `[System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)` + `[System.IO.File]::WriteAllText($f, $text, (New-Object System.Text.UTF8Encoding $false))`.

### Regla 2: Verificar encoding después de cualquier edición masiva
Script de control (correr antes de subir al servidor):
```powershell
Get-ChildItem *.html | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)[0..2]
  $hex = ($b | ForEach-Object { $_.ToString("X2") }) -join " "
  $c = Get-Content $_.FullName -Raw -Encoding UTF8
  $bad = [regex]::Matches($c, 'Ã|â€|Â|�|\ufffd').Count
  "{0}: bom={1} mojibake={2}" -f $_.Name, $(if ($hex -eq "EF BB BF") {"BOM!"} else {"OK"}), $(if ($bad -gt 0) {"$bad!"} else {"OK"})
}
```
Criterio de aceptación: **todos** `bom=OK encoding=OK`.

### Regla 3: Subir y verificar en el servidor
- scp los archivos y luego `curl -H "Host: alejandro-kuilen.noscasamos.vip" http://50.6.18.31/<pagina>` buscando un par de caracteres acentuados/emojis conocidos.
- No confiar en que "el archivo local se ve bien" — verificar lo que Apache sirve.

## 📌 Lección general
**Toda edición de archivos UTF-8 (HTML, código, templates) debe respetar la codificación de origen.** El patrón "leer con defaults de Windows → escribir con defaults de Windows" es la causa #1 de corrupción de caracteres. Usar siempre herramientas que garanticen UTF-8 sin BOM y verificar después de ediciones masivas.

## Archivos relacionados
- `site/` — micrositio (los 7 HTML ahora UTF-8 limpio)
- `docs/ONBOARDING-NOVIOS.md` — flujo de generación del micrositio (aplicar reglas al automatizar)
