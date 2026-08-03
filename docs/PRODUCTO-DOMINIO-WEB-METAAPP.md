# Producto "No Nos Casamos" — Dominio, Web y Meta App

> **Fecha:** 02-Ago-2026 | **Autor:** Claw + Alejandro
> **Estado:** Documentación y plan — NADA ejecutado aún (DNS, hosting, web pendientes)

---

## 1. Dominio: noscasamos.vip ✅ (comprado y verificado)

### Registro GoDaddy (acceso API confirmado)
| Campo | Valor |
|-------|-------|
| Dominio | `noscasamos.vip` |
| Estado | **ACTIVE** |
| Creado | 2026-08-02T14:10:40Z (hoy) |
| Expira | 2028-08-02 (2 años, renovación automática ON) |
| Registrar lock | ON (`locked: true`) |
| Privacy WHOIS | ON (`privacy: true`) |
| Nameservers actuales | **`ns1.bluehost.com`, `ns2.bluehost.com`** (CAMBIADOS 02-Ago 11:50 ✅ vía API GoDaddy) |
| Titular | Alejandro Chung (a.chungpark@gmail.com, +56.966283141) |
| Auth code | Disponible vía API (no exponer) |
| API key/secret | `.secrets/godaddy_api.json` ✅ accesible |

### Registros DNS actuales (GoDaddy)
| Type | Name | Data | Nota |
|------|------|------|------|
| A | `@` | WebsiteBuilder Site | placeholder GoDaddy |
| NS | `@` | ns09/ns10.domaincontrol.com | default |
| CNAME | `www` | `@` | |
| CNAME | `_domainconnect` | `_domainconnect.gd.domaincontrol.com` | |
| TXT | `_dmarc` | DMARC quarantine | |

---

## 2. Plan: Apuntar a Bluehost + Hosting (NO ejecutado)

### Objetivo
`noscasamos.vip` → Bluehost → sitio web del producto (landing + micrositios por boda).

### Opciones de implementación (evaluar antes de ejecutar)
| Opción | Cómo | Pros | Contras |
|--------|------|------|---------|
| **A: Nameservers a Bluehost** | Cambiar NS en GoDaddy → `ns1.bluehost.com` / `ns2.bluehost.com`, crear addon domain en cPanel | Hosting completo (PHP/MySQL/SSL), un solo proveedor | DNS propagation 24-48h, depender de Bluehost |
| **B: A record directo** | Punto A `@` a IP de Bluehost (ver IP en cPanel) + CNAME www | Más rápido, no toca NS | Cambia si Bluehost cambia IP |
| **C: Subdominio para boda** | `boda.alejandro-kuilen.noscasamos.vip` o `alejandro-kuilen.noscasamos.vip` como addon/subdomain | Escala por boda | Config extra por boda |

**Recomendación preliminar:** Opción A (NS a Bluehost) + addon domain, con subdominio por boda (Opción C). Verificar en Bluehost: ¿ya existe cuenta/cPanel para el producto o se crea? (Tenemos acceso SSH Bluehost vía `.secrets/bluehost_tupibox_key` para TupiBox — verificar si el hosting es el mismo o se necesita otro).

### Nota Bluehost (contexto)
- Hosting Bluehost existente: TupiBox (`sh00634.bluehost.com`, user `tupiboxc`) — sirve de referencia de configuración
- WordPress/Academia LPO también en Bluehost
- Verificar si noscasamos.vip se agrega a un cPanel existente o requiere plan nuevo

---

## 3. Estructura propuesta del sitio web (producto)

### Concepto del producto
**"No Nos Casamos"** = bot WhatsApp para bodas: Save the Date → RSVP con botones → recordatorios → día del evento → post-boda. Los invitados confirman tocando botones; el bot (LLM DeepSeek) responde dudas; los novios ven todo desde Slack.

### Arquitectura web (2 niveles)
```
noscasamos.vip  ← sitio del PRODUCTO (marketing/landing)
└── {boda}.noscasamos.vip  ← micrositio por BODA (invitados)
```

### Nivel 1: Sitio del producto (público)
| Página | Contenido |
|--------|-----------|
| `/` (landing) | Propuesta de valor: "Tu boda con WhatsApp automático", demo visual, CTA |
| `/como-funciona` | Paso a paso: creas tu boda → invitados confirman con 1 toque → recordatorios automáticos |
| `/precios` | Planes (setup + mensualidad), comparativa |
| `/contacto` | Formulario, WhatsApp de contacto |
| `/demo` | Boda demo interactiva (opcional) |

### Nivel 2: Micrositio por boda (invitados)
| Página | Contenido |
|--------|-----------|
| `/` | Save the Date: foto pareja, fecha, hora, lugar, botón "Añadir al calendario" |
| `/rsvp` | Formulario confirmación (nombre, nº asistentes, preferencias) → dispara template WhatsApp |
| `/info` | Dress code, ubicación, estacionamiento, clima, preguntas frecuentes |
| `/galeria` | Fotos de la pareja |
| `/regalos` | Mesa de regalos, transferencia, links lista |

### Stack sugerido
- **Estático + hosting simple:** HTML/CSS/JS o Next.js estático en Bluehost (document root) — sin backend complejo (el backend es el bot Railway)
- **Alternativa:** GitHub Pages + dominio propio (más barato, pero el usuario pidió Bluehost)
- **Integración:** botón "Confirmar asistencia" → enlaza a template WhatsApp o webhook del agente

### URL en los templates de WhatsApp
Agregar al final de los mensajes (ej. save_the_date):
```
🔗 noscasamos.vip — hecho con No Nos Casamos
```
O link del micrositio de la boda: `https://alejandro-kuilen.noscasamos.vip`
> ⚠️ OJO: Meta no permite URLs rastreables en el body de templates — usar botón URL o link estático. Verificar regla antes de agregar.

---

## 4. Nueva Meta App: 1590375222487560 ✅ (acceso CONFIRMADO 02-Ago 11:41)

### Lo que reportó Alejandro
- Nueva app de desarrollador Meta creada (la anterior no tenía el modo de uso correcto para WhatsApp)
- Configurada **igual que la app de Softify** (modo de uso WhatsApp ✅)
- Conectada al WhatsApp Business (WABA)
- Asignada al System User `61566630796479`
- ID: `1590375222487560`

### Verificación realizada (02-Ago 11:30-11:41)
| Check | Resultado |
|-------|-----------|
| `GET /1590375222487560?fields=name` con token almacenado | ✅ **OK** — el token del system user (Softify) SÍ accede a la app nueva |
| `GET /1590375222487560/subscriptions` | ⚠️ Requiere app token (error subcode 33) — normal, no es acceso de system user |
| `GET /1004041115557689/subscribed_apps` | ⚠️ Solo aparece Softify — falta que la app nueva se suscriba al WABA (o verificar con token de la app nueva) |
| Phone numbers WABA | 5497 (Programa Emprender) VERIFIED ✅ / 3050 (Aconcagua) EXPIRED |

### Conclusión
El token almacenado accede a la app nueva ✅. Falta: verificar/crear la suscripción de la app nueva al WABA (para que los webhooks de botones lleguen al agente). Pendiente: confirmar si la app nueva reemplaza a `1261291912568631` (Wedding Planner reciclada) y actualizar Railway env vars.

---

## 5. Acciones pendientes (ejecución parcial 02-Ago)

### ✅ Ejecutado (02-Ago 11:50)
- [x] **Cambiar DNS noscasamos.vip → Bluehost**: NS actualizados a `ns1.bluehost.com` / `ns2.bluehost.com` vía API GoDaddy (verificado: PATCH OK + GET confirma)

### ⚠️ Bloqueante: addon domain en Bluehost
El cPanel de Bluehost (cuenta `tupiboxc`, sh00634) **no expone creación de addon domains vía API**:
- `uapi Domain addon_domain` → función no existe (módulo Domain es stub vacío)
- `cpapi2 Domain addondomain` → no existe
- `uapi DomainTemplates` → módulo no instalado
- Solo existe `SubDomain::addsubdomain` (crea subdominios de dominios ya existentes)

### ✅ Addon domain creado vía portal UI (02-Ago)
- Domains → Add a Domain → **Connect an external domain** → `noscasamos.vip` → aparece en "My Domain Names (8)"
- Login portal: User ID `TUPIBOXC` + password nueva (`.secrets/bluehost_portal.json`, reseteada vía Forgot Password + 2FA por correo)

### ✅ RESUELTO 03-Ago: addon domain + subdominio creados en cPanel vía SSO
- **SSO portal→cPanel**: portal → Hosting (WordPress Plus, TUPIBOX.COM) → botón **"cPanel"** → acceso SSO directo como `tupiboxc` sin password
- **Addon domain en cPanel**: Domains → Create A New Domain → `noscasamos.vip` → `/home2/tupiboxc/noscasamos.vip` → SUCCESS
- **Subdominio boda**: `uapi SubDomain addsubdomain domain=alejandro-kuilen rootdomain=noscasamos.vip dir=/home2/tupiboxc/alejandro-kuilen.noscasamos.vip` → status 1 ✅
- **Trucos encontrados**: (1) pasar el label corto como `domain` (si pasas el dominio completo, cPanel duplica el nombre); (2) si un A record del portal ya existe en la zona, uapi/UI fallan con "DNS entry already exists" → borrar el A record primero (Zone Editor UI: `zone_editor/index.html`) y luego crear el subdominio
- **Diagnóstico completo (con resolución):** `docs/DIAGNOSTICO-SUBDOMINIO-BLUEHOST-2026-08-03.md`

### Pendientes
- [x] Crear addon domain `noscasamos.vip` en cPanel Bluehost (03-Ago ✅ vía SSO)
- [x] Crear subdominio por boda (`alejandro-kuilen.noscasamos.vip`) vía `uapi SubDomain addsubdomain` (03-Ago ✅)
- [x] Registros A en zona DNS (root + subdominio → 50.6.18.31) ✅
- [ ] ⏳ Propagación DNS pública (24-48h según Bluehost)
- [ ] Subir sitio producto + micrositio boda (estructura sección 3)
- [ ] Crear templates nuevos con botones URL → páginas de confirmación/no confirmación en noscasamos.vip
- [ ] Verificar suscripción de la app nueva `1590375222487560` al WABA
- [ ] Probar flujo completo: template → botón → webhook → RSVP → Slack
- [ ] Implementar bot LLM con DeepSeek Flash (server.js actual usa Claude — migrar)

## Archivos relacionados
- `docs/PROPUESTA-BOT-LLM-PRODUCTO.md` — propuesta bot LLM + monetización
- `docs/ESTADO-2026-08-02.md` — estado verificado
- `docs/ARCHITECTURE.md` — arquitectura del agente
- `.secrets/godaddy_api.json` — credenciales GoDaddy (acceso confirmado)
