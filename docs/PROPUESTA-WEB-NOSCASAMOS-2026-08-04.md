# Propuesta: Actualización de contenido noscasamos.vip (tras mejoras del producto)

> **Fecha:** 04-Ago-2026 19:33 | **Autor:** Claw
> **Estado:** PROPUESTA — NADA ejecutado en el sitio (Alejandro debe aprobar)
> **Motivo:** el sitio producto se creó antes de las mejoras (Fase 1-7, gestión de invitados, parejas, leads) y ya no refleja todo lo que el producto hace hoy.

---

## 1. Estado actual del sitio producto (verificado)

| Página | Contenido hoy | Desactualizado en |
|--------|---------------|-------------------|
| `index.html` | Hero "Los invitados confirman con un toque", 6 beneficios, 3 pasos, "Menos logística", logos tecnología | No menciona: gestión de invitados por WhatsApp, parejas, leads, codigonovios |
| `como-funciona.html` | 3 pasos (nos cuentas → configuramos → envías y listo) + "Qué incluye" (6 cards) | Los pasos no reflejan el flujo real actual (agregar invitados por chat, envío manual, etapas) |
| `precios.html` | Esencial $49.990 / Completo $79.990 / Premium $119.990 + mensualidades + micrositio standalone | No menciona integración con codigonovios.cl ni el valor de la gestión |
| `contacto.html` | Form → `POST /api/lead` (Postgres) + wa.me ✅ | OK (ya conectado) |

---

## 2. Mejoras del producto que la web NO comunica aún

1. **Panel de novios por WhatsApp** — agregar, eliminar, editar, vincular parejas y ver invitados con su etapa, todo conversando con el bot
2. **Envío de invitaciones con botones URL** — save_the_date_v4_img aprobado: foto + botones que llevan al micrositio (rsvp/no-confirmado)
3. **Ciclo de vida de invitados** — cada invitado tiene etapa (nuevo → invitación → confirmado/no asistirá → carta formal → post-boda)
4. **Parejas vinculadas 👫** — el +1 mutuo se cuenta una sola vez (sin inflar el conteo)
5. **BD de leads en Postgres** — los interesados del form quedan registrados para seguimiento
6. **Carta de invitación formal** (`invitacion_formal`, F2) — lugar, hora, código de novios
7. **Recordatorios automáticos** (F3) — T-30 / T-7 / T-24h
8. **Integración con codigonovios.cl** — mesa de regalos en efectivo con Mercado Pago (producto hermano)

---

## 3. Propuesta de cambios por página

### 3.1 `index.html` (landing)

**Hero — actualizar mensaje:**
- Actual: "Los invitados confirman con un toque. Nadie tiene que llamar a nadie."
- Propuesto: **"Tu boda se organiza sola, desde WhatsApp"** (o similar que capture: confirmaciones + gestión)
- Sub: mencionar que los novios también **gestionan invitados por WhatsApp** (no solo confirmaciones)

**Beneficios (6 cards) — renovar 3:**
| Card actual | Propuesta |
|-------------|-----------|
| Save the Date automático | **Invitaciones con foto y botones** — envías el save-the-date con tu foto y botones que llevan al micrositio (aprobado) |
| RSVP con botones | (mantener, actualizar texto: URL al micrositio) |
| Recordatorios inteligentes | **Recordatorios automáticos** — T-30 / T-7 / T-24h (F3) |
| Responde dudas solo | (mantener) |
| Todo en tiempo real | **Panel de novios por WhatsApp** — agrega, elimina, edita y vincula invitados conversando con el bot |
| Respondes desde tu celular | **Parejas sin doble conteo** 👫 — el +1 mutuo se cuenta una sola vez |

**Nueva sección opcional:** "Gestiona tu lista por WhatsApp" — mini demo de comandos (`agregar a María +56 9...`, `ver invitados`, `eliminar invitado...`)

**Nota pie:** integrar "Regalos: Código Novios →" enlace a codigonovios.cl

### 3.2 `como-funciona.html`

**Pasos — actualizar a 4 (flujo real):**
1. **Nos cuentas tu boda** — (mantener)
2. **Agregas tus invitados por WhatsApp** — hablas con el bot: `agregar a María +56 9...`, parejas en un comando
3. **Envías la invitación** — un comando (`enviar invitación a todos`) y cada invitado recibe la foto + botones
4. **Confirmas y recuerdas** — RSVP con botones, carta formal (F2), recordatorios automáticos (F3), todo en tu panel

**"Qué incluye" — actualizar cards:**
- Plantillas personalizadas → mencionar: save-the-date con foto, **carta formal** (F2)
- Botones de confirmación → botones URL que llevan al micrositio
- Panel en tiempo real → **gestión completa**: ver, editar, eliminar, vincular parejas
- Micrositio nupcial → + **mesa de regalos con Código Novios**

### 3.3 `precios.html`

- Agregar en los planes: **"Gestión de invitados por WhatsApp incluida"** (agregar/eliminar/editar/vincular)
- En Completo/Premium: **"Carta de invitación formal"** y **"Recordatorios automáticos"**
- Mención: **"Integración con Código Novios (mesa de regalos)"** en Premium
- Mantener precios (no propongo cambio de pricing)

### 3.4 `contacto.html`

- ✅ Ya conectado a `POST /api/lead` (leads en Postgres) — sin cambios
- Opcional: agregar campo "¿Cómo nos conociste?" para marketing

---

## 4. Qué NO cambiar
- Diseño/colores/fuentes (mismo lenguaje visual aprobado)
- Logos de tecnología (sección confianza — ya está)
- Precios (sin tocar pricing en esta tanda)
- Estructura de páginas (4 páginas se mantienen)

---

## 6. ✅ IMPLEMENTADO + DESPLEGADO (04-Ago 19:40) — VERIFICADO

### Aprobado por Alejandro (19:38): las 4 decisiones = SÍ
1. Hero: **"Tu boda se organiza sola, desde WhatsApp"** ✅
2. Sección "Gestiona tu lista por WhatsApp" con comandos ✅
3. codigonovios.cl cruzado en landing y precios ✅
4. Precios sin cambios de monto ✅

### Cambios aplicados (commit `6e9a112`)
- **index.html**: hero nuevo + 6 cards renovadas (invitaciones foto+botones, RSVP URL, recordatorios T-30/7/24h, panel novios WhatsApp, parejas sin doble conteo) + sección 🗂 "Gestiona tu lista por WhatsApp" con comandos de ejemplo + nota Código Novios con link
- **como-funciona.html**: 4 pasos (nos cuentas → agregas invitados por WhatsApp → envías invitación → confirmas y recuerdas) + 6 cards "Qué incluye" actualizadas (carta formal, parejas, panel novios, micrositio+regalos)
- **precios.html**: Esencial (panel novios, recordatorios T-30/7/24h), Completo (carta formal, parejas 👫), Premium (Código Novios efectivo cada miércoles)

### Verificación
- Encoding OK + HTTP 200 en las 3 páginas (servidor)
- Contenido nuevo confirmado en servidor (hero, sección gestión, paso 2, Código Novios en precios)
- Screenshot móvil (390px): hero y header OK
- Deploy: scp directo a docroot raíz (deploy_product.py aplica igual)

---

## 6. Decisiones que necesito de ti
1. ❓ ¿Hero nuevo: "Tu boda se organiza sola, desde WhatsApp" o prefieres otro mensaje?
2. ❓ ¿Agrego la sección "Gestiona tu lista por WhatsApp" con comandos de ejemplo en la landing?
3. ❓ ¿Menciono codigonovios.cl en la landing y precios (como integración del producto) o lo dejamos como producto aparte sin cruzarlo?
4. ❓ ¿Ajustamos algo de los precios o los dejamos tal cual?
