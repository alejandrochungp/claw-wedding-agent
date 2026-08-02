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
| Nameservers actuales | `ns09.domaincontrol.com`, `ns10.domaincontrol.com` (GoDaddy default) |
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

## 4. Nueva Meta App: 1590375222487560 ⚠️ (verificación pendiente)

### Lo que reportó Alejandro
- Nueva app de desarrollador Meta creada (la anterior no tenía el modo de uso correcto para WhatsApp)
- Configurada **igual que la app de Softify** (modo de uso WhatsApp ✅)
- Conectada al WhatsApp Business (WABA)
- Asignada al System User
- ID: `1590375222487560`

### Verificación realizada (02-Ago 11:30)
| Check | Resultado |
|-------|-----------|
| Acceso con system user token de Softify (`EAAX...`) | ❌ Error subcode 33 (sin permisos) — el token actual pertenece a la app Softify (`1636363614308117`), no ve la app nueva |
| `GET /1590375222487560` | ❌ No accesible con token actual |
| `GET /1590375222487560/subscriptions` | ❌ No accesible con token actual |
| `GET /1004041115557689/subscribed_apps` | ⚠️ Solo aparece Softify — la app nueva aún NO está suscrita al WABA (o el token no la ve) |
| Phone numbers WABA | 5497 (Programa Emprender) VERIFIED ✅ / 3050 (Aconcagua) EXPIRED |

### Pendiente para acceder
1. **Token de la app nueva:** Alejandro debe generar un System User token **para la app `1590375222487560`** (Business Settings → System Users → la app nueva → Generate Token) con scopes: `whatsapp_business_management`, `business_management`, `whatsapp_business_messaging`
2. Con ese token: verificar `subscribed_apps` y suscribir la app al WABA si hace falta
3. Verificar webhook URL del agente apuntando a la app nueva
4. Si la app nueva reemplaza a la Wedding Planner (`1261291912568631`), actualizar credenciales en `.secrets/` y Railway env vars

> El token de Softify no sirve para la app nueva — cada app tiene su propio token de system user. Cuando Alejandro genere el token de la app nueva, lo guardamos en `.secrets/` y verifico acceso.

---

## 5. Acciones pendientes (nada ejecutado aún)

- [ ] Generar System User token de la app `1590375222487560` → pasarlo a Claw
- [ ] Verificar acceso + suscripción WABA con el token nuevo
- [ ] Decidir hosting Bluehost: ¿cPanel existente o nuevo plan?
- [ ] Cambiar DNS noscasamos.vip → Bluehost (NS o A record)
- [ ] Crear sitio producto + micrositio boda (estructura sección 3)
- [ ] Agregar URL a templates (verificar regla Meta de URLs en body)
- [ ] Migrar LLM Claude → DeepSeek (regla permanente)
- [ ] Probar flujo completo: template → botón → webhook → RSVP → Slack

## Archivos relacionados
- `docs/PROPUESTA-BOT-LLM-PRODUCTO.md` — propuesta bot LLM + monetización
- `docs/ESTADO-2026-08-02.md` — estado verificado
- `docs/ARCHITECTURE.md` — arquitectura del agente
- `.secrets/godaddy_api.json` — credenciales GoDaddy (acceso confirmado)
