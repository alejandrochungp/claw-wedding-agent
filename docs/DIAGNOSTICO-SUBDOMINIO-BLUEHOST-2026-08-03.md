# Diagnóstico: Creación de Subdominio en Bluehost — RESUELTO ✅

**Fecha:** 03-Ago-2026 | **Proyecto:** claw-wedding-agent / producto "No Nos Casamos"
**Objetivo:** crear `alejandro-kuilen.noscasamos.vip` (micrositio de la boda) en el hosting Bluehost
**Estado:** ✅ **RESUELTO (03-Ago 14:50)** — addon domain + subdominio creados en el cPanel

---

## Resumen ejecutivo

El addon domain `noscasamos.vip` se creó en el PORTAL de Bluehost (02-Ago, nivel cuenta), pero el cPanel del hosting no lo reconocía → subdominio bloqueado. **El 03-Ago se destrabó todo vía SSO del portal al cPanel** (sin password): addon domain creado en cPanel UI, subdominio creado vía uapi, registros DNS en la zona. Pendiente solo la propagación DNS (24-48h según Bluehost).

## Cronología del intento

### 1. Addon domain creado vía portal (02-Ago) ✅
- Flujo: `bluehost.com/my-account` → Domains → Add a Domain → **Connect an external domain** → `noscasamos.vip` → Add
- Resultado: aparece en "My Domain Names (8)" como "External domain"
- DNS verificado: NS → `ns1/ns2.bluehost.com` ✅ (configurados en GoDaddy 02-Ago)

### 2. Intento de subdominio vía uapi/SSH (02-Ago y 03-Ago) ❌
```bash
uapi SubDomain addsubdomain domain=alejandro-kuilen.noscasamos.vip rootdomain=noscasamos.vip
# Error: (XID k4ztke) The domain "noscasamos.vip" does not belong to "tupiboxc".
```

### 3. Diagnóstico en el servidor (03-Ago 10:52 -0600)
```bash
cat /etc/userdomains                      # → NO contiene noscasamos
ls /var/cpanel/userdata/tupiboxc/         # → NO contiene noscasamos
uapi Domain addon_domain ...              # → función NO existe en este servidor
uapi Domain listdomains                   # → función NO existe (módulo Domain es stub)
uapi SubDomain listdomains                # → función NO existe
```

### 4. Login cPanel directo (`sh00634.bluehost.com:2083`) ❌
- Usuario `tupiboxc` + password del PORTAL → **"El nombre de usuario no es válido"**
- ⚠️ El cPanel tiene su PROPIA contraseña, separada del portal. La password reseteada en el portal (02-Ago, flujo "Forgot Password") NO aplica al cPanel.

### 5. ✅ RESOLUCIÓN (03-Ago 14:20-14:50) — SSO del portal → cPanel
1. **Registro A en el portal**: Advanced DNS Manager (portal) → A record `alejandro-kuilen` → `50.6.18.31` (IP del hosting). Quedó visible en la zona del cPanel (TTL 14400).
2. **SSO a cPanel**: portal → sección Hosting (WordPress Plus Hosting, TUPIBOX.COM) → botón **"cPanel"** → abrió pestaña con acceso SSO directo como `tupiboxc` (SIN password) en sh00634.bluehost.com.
3. **Addon domain en cPanel**: cPanel → Domains → **Create A New Domain** → `noscasamos.vip` docroot `/home2/tupiboxc/noscasamos.vip` (no compartido) → **SUCCESS**. (Este era el paso que fallaba antes.)
4. **🐛 Subdominio mal creado**: `uapi SubDomain addsubdomain domain=alejandro-kuilen.noscasamos.vip rootdomain=noscasamos.vip` → status 1 PERO creó nombre duplicado `alejandro-kuilen.noscasamos.vip.noscasamos.vip` (cPanel concatenó rootdomain al label).
5. **Bloqueo secundario**: al crear el subdominio CORRECTO, uapi y UI fallaban: **"A DNS entry for the domain 'alejandro-kuilen.noscasamos.vip' already exists"** — el A record del portal (TTL 14400) bloqueaba la creación (cPanel no crea subdominio si el DNS ya existe en la zona).
6. **Fix**: eliminar subdominio duplicado vía UI (Domains → Manage → Remove Domain) + borrar A record del portal vía Zone Editor UI + recrear subdominio:
   ```bash
   uapi SubDomain addsubdomain domain=alejandro-kuilen rootdomain=noscasamos.vip dir=/home2/tupiboxc/alejandro-kuilen.noscasamos.vip
   # status 1 SUCCESS ✅
   ```
7. **Verificado**: userdata `alejandro-kuilen.noscasamos.vip` existe, directorio creado con cgi-bin/.well-known.

## 🔍 Causa raíz (original)

**"Connect an external domain" del portal ≠ addon domain del cPanel.** El portal de Bluehost registra el dominio a nivel CUENTA (DNS/email/lista) pero NO crea la entrada de addon domain en el cPanel del hosting (`/etc/userdomains`, userdata).

## 🧩 Estado final

| Item | Estado |
|------|--------|
| Dominio `noscasamos.vip` en portal | ✅ "My Domain Names (8)" |
| NS en Bluehost | ✅ ns1/ns2.bluehost.com |
| Addon domain en cPanel | ✅ `noscasamos.vip` → `/home2/tupiboxc/noscasamos.vip` |
| Subdominio `alejandro-kuilen.noscasamos.vip` | ✅ creado → `/home2/tupiboxc/alejandro-kuilen.noscasamos.vip` |
| Registros A en zona (root + subdominio) | ✅ → `50.6.18.31` |
| Propagación DNS pública | ⏳ pendiente (24-48h según Bluehost) |
| Root `noscasamos.vip` resuelve | ⚠️ aún parking `204.11.56.246` (hasta propagar) |

## 🔑 Credenciales (actualizadas 03-Ago)

| Sistema | User | Password | Nota |
|---------|------|----------|------|
| Portal Bluehost | `TUPIBOXC` | (nueva, en `.secrets/bluehost_portal.json`) | Reseteada vía flujo "Forgot Password" + 2FA por correo |
| cPanel (sh00634:2083) | `tupiboxc` | ❌ desconocida | **No necesaria**: SSO desde portal (botón "cPanel") |
| SSH (50.6.18.31) | `tupiboxc` | key `.secrets/bluehost_tupibox_key` | ✅ funciona |

## 📌 Lecciones (aprendizajes clave 03-Ago)

1. **Portal ≠ cPanel en Bluehost nuevo**: conectar dominio externo en el portal NO lo agrega al cPanel del hosting. Para alojar archivos/subdominios, el dominio debe existir en el cPanel (Domains → Create A New Domain).
2. **SSO portal→cPanel existe**: el botón "cPanel" en la sección Hosting del portal da acceso SSO directo al cPanel **sin password** — destraba todo el hosting sin credenciales del cPanel.
3. **uapi `SubDomain::addsubdomain`**: `domain` = label corto (`alejandro-kuilen`) + `rootdomain` = dominio padre (`noscasamos.vip`). Si pasas el dominio completo como label, cPanel duplica el nombre (`sub.dominio.dominio`).
4. **Un A record previo bloquea addsubdomain**: si el registro DNS del subdominio ya existe en la zona (ej. creado desde el portal DNS manager), uapi y la UI fallan con "A DNS entry ... already exists". Solución: borrar el A record primero (Zone Editor UI) y luego crear el subdominio (cPanel crea sus propios registros).
5. **Zone Editor URL correcta**: `frontend/jupiter/zone_editor/index.html` (con guión bajo). `zone/index.html` da 404.
6. **GoDaddy API NO era necesaria para DNS**: Bluehost es el DNS autoritativo (NS ya apuntaban a ns1/ns2.bluehost.com). Los registros DNS de GoDaddy quedaron inertes. No tocar GoDaddy para DNS de noscasamos.vip.
7. **Módulos uapi limitados en Bluehost compartido**: `Domain` es stub (sin `addon_domain` ni `listdomains`); solo `SubDomain::addsubdomain` existe.
8. **Passwords separadas**: portal y cPanel tienen credenciales independientes. Resetear la del portal no cambia la del cPanel.
9. **Propagación DNS**: los registros quedan en la zona inmediatamente, pero Bluehost advierte 24-48h para propagación pública. Verificar con `nslookup <sub> 8.8.8.8`.

## Archivos relacionados
- `docs/PRODUCTO-DOMINIO-WEB-METAAPP.md` — plan dominio/web (sección bloqueante ACTUALIZADA a resuelto)
- `docs/DEPLOY.md` — credenciales del proyecto
- `.secrets/bluehost_portal.json` — password nueva del portal
- Scripts: `tmp/bluehost_retry_subdomain*.py`, `tmp/bluehost_add_subdomain.py`
