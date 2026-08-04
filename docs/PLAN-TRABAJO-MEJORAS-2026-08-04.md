# Plan de Trabajo — Mejoras Nos Casamos + Codigo Novios

> **Fecha:** 04-Ago-2026 | **Autor:** Claw + Alejandro
> **Alcance:** agente dual (invitados + novios + leads), agregar invitados conversacional, integración codigonovios.cl (Mercado Pago + recordatorios), fixes UX sitio producto
> **Estado:** definido — pendiente aprobación de fases y prioridades

---

## Contexto (definiciones de Alejandro, 04-Ago)

1. **Mismo agente = wedding planner** que atiende a invitados Y a nuevos clientes (solicitudes de información del producto)
2. **codigonovios.cl = producto aparte** (similar a milistadenovios.cl): lista de deseos, pago con **Mercado Pago**, dinero a cuenta corriente de los novios **cada miércoles**, comisión pequeña % (cubre pasarela + administrativos)
3. **Recordatorios de regalos:** a quienes no han comprado, incluso **después de la boda** — la recaudación financia la boda (no es evento económico)
4. **Novios identificables por WhatsApp** → pueden hacer solicitudes y ser atendidos por el bot como "ejecutivo"
5. **Agregar invitados conversacional:** novios conversan con el bot para añadir invitados (nombre + WhatsApp + correo opcional)
6. **Fix UX:** botón header "Quiero esto para mi boda" mal posicionado en móvil ✅ YA CORREGIDO (04-Ago, ver Fase 0)

---

## Fase 0 — Fixes rápidos ✅ COMPLETADA (04-Ago)

| Item | Estado |
|------|--------|
| Botón header móvil "Quiero esto para mi boda": **ELIMINADO** (consumía mucho viewport en móvil — decisión Alejandro 04-Ago 08:46) | ✅ Corregido + desplegado + verificado (4 páginas + CSS limpio) |
| Nombre producto: "No Nos Casamos" → **"Nos Casamos"** | ✅ Corregido en las 4 páginas |
| Menciones a Slack eliminadas del sitio producto | ✅ (0 ocurrencias) |
| Form contacto: bug `name="text"` múltiple → JS arma mensaje único | ✅ Corregido |

---

## Fase 1 — Agente dual: identificación de actores (server.js + Redis)

**Objetivo:** el bot sabe quién escribe (novio / invitado / lead) y responde con el rol correcto.

### Tareas
- [ ] 1.1 Crear keys Redis `wa:actor:{phone}` → `{ role, boda_id, novios, email, createdAt }`
- [ ] 1.2 Registrar novios en onboarding (por su WhatsApp)
- [ ] 1.3 Lookup de rol al inicio de cada mensaje entrante (prioridad: novio > invitado > lead)
- [ ] 1.4 Modo **lead**: flujo comercial (planes/precios/captura datos → Notion/Redis)
- [ ] 1.5 Verificación: 3 números de prueba (novio, invitado, lead) → respuestas correctas

**Docs:** `docs/AGENTE-DUAL-INVITADOS-CLIENTES.md`

---

## Fase 2 — Agregar invitados conversacional (novios ↔ bot)

**Objetivo:** el novio agrega invitados chateando con el bot.

### Tareas
- [ ] 2.1 Comando "agregar invitado" → parser LLM (DeepSeek) extrae nombre + WhatsApp (+ correo opcional)
- [ ] 2.2 Confirmación antes de guardar ("¿Agrego a María Pérez +56 9...?")
- [ ] 2.3 Correo opcional: si falta, el bot pregunta una vez
- [ ] 2.4 Guardar en Redis lista de invitados de la boda + sincronizar a Notion
- [ ] 2.5 Verificación: conversación real agrega invitado y aparece en panel

---

## Fase 3 — codigonovios.cl: producto de regalos

**Objetivo:** plataforma lista de deseos con pagos Mercado Pago y depósitos semanales.

### Tareas
- [ ] 3.1 Addon domain `codigonovios.cl` en cPanel Bluehost (mismo flujo SSO)
- [ ] 3.2 Cuenta Mercado Pago (receptor): configurar Checkout Pro/API + payouts a cuenta corriente
- [ ] 3.3 Definir % comisión (pasarela MP ≈ 3-4% + margen admin)
- [ ] 3.4 Landing del producto (imágenes de banco) + página registro novios
- [ ] 3.5 Lista pública `codigonovios.cl/n/{slug}` (deseos, foto pareja, progreso recaudación)
- [ ] 3.6 Flujo de regalo: elegir ítem → monto → pago MP → confirmación
- [ ] 3.7 Depósitos automáticos **cada miércoles** a cuenta de los novios
- [ ] 3.8 Panel novios (recaudado, invitados, depósitos)

**Docs:** `projects/codigonovios/README.md` (modelo definido 04-Ago)

---

## Fase 4 — Integración bot ↔ codigonovios (recordatorios)

**Objetivo:** el bot envía la lista y recuerda a no-compradores, pre y post boda.

### Tareas
- [ ] 4.1 Bot envía link `codigonovios.cl/n/{slug}` por WhatsApp (template con botón URL)
- [ ] 4.2 Detectar no-compradores (cruzando lista invitados vs pagos MP)
- [ ] 4.3 Recordatorios automáticos: 1 mes antes / 1 semana antes / post-boda (semanal, 2-3 veces)
- [ ] 4.4 Webhook pagos MP → notificar novios ("María regaló $XX") + marcar comprado
- [ ] 4.5 La lista sigue activa post-boda (recaudación no muere el día del evento)

---

## Fase 5 — Productización y soporte

- [ ] 5.1 Multi-tenant: config 100% en `tenants/{boda_id}/config.js`
- [ ] 5.2 Onboarding automatizable (script crea tenant + templates + webhook)
- [ ] 5.3 Métricas por boda (costo LLM, RSVPs, recaudación)
- [ ] 5.4 Panel novios web (opcional fase 2)

---

## Fase 6 — Sección de confianza con tecnologías (sitio producto) ⭐ NUEVA 04-Ago

**Objetivo:** aumentar la confianza del cliente mostrando las tecnologías que usamos. Logos en **blanco y negro, vista horizontal**.

### Logos (YA descargados ✅ a `product-site/assets/logos/`)
| Logo | Archivo | Fuente |
|------|---------|--------|
| Anthropic | `anthropic.svg` (296B) | Simple Icons CDN (monocromo) |
| OpenAI | `openai.svg` (2946B) | Wikimedia Commons |
| Railway | `railway.svg` (788B) | Simple Icons CDN |
| Meta | `meta.svg` (1339B) | Simple Icons CDN |

### Tareas (EJECUTADAS 04-Ago 10:46 ✅)
- [x] 6.1 Sección "Construido con tecnología de clase mundial" en la landing (entre prueba social y footer)
- [x] 6.2 Los 4 logos en fila horizontal B&W (Anthropic, OpenAI, Railway, Meta) — SVG monocromo + CSS `filter: grayscale(1)`
- [x] 6.3 Texto: "Las mismas plataformas que usan las grandes empresas, para que tu boda funcione sin fallas" + nota "IA, nube y WhatsApp Business oficial"
- [x] 6.4 Verificar render en móvil (CSS responsive: logos 26px en <820px)
- [x] 6.5 Fix permisos: directorio `assets/logos` quedó 700 → 755 (403 → 200)

**Nota (decisión Alejandro 04-Ago 10:46):** se incluyen Anthropic y OpenAI con sus logos, aunque el LLM del producto es DeepSeek (OpenAI-compatible). El texto dice "IA" genérico para no afirmar uso directo de Anthropic.

---

## Fase 7 — BD de LEADS del producto (separada de invitados) ⭐ NUEVA 04-Ago

**Objetivo:** cuando un lead cae para el producto (Nos Casamos), que quede **almacenado en una base de datos propia** — NO mezclar con la lista de invitados de la boda — para poder referenciar los datos de los futuros novios y hacerles **seguimiento con una estrategia de marketing (aún por definir)**.

### Requisitos (definidos por Alejandro)
- Almacenar TODO lead que contacte por el producto (form contacto del sitio + WhatsApp del bot en modo lead)
- BD/colección **separada** de `invitados` (contextos distintos: invitado ≠ prospecto)
- Poder referenciar los datos enviados por los futuros novios
- Base para campañas de marketing futuras (follow-up, nurturing)

### Diseño propuesto (pendiente validación)
| Campo | Tipo | Nota |
|-------|------|------|
| `id` | UUID | PK |
| `phone` | string | WhatsApp (único por lead) |
| `email` | string | del form contacto |
| `nombres` | string | novio/novia |
| `fecha_boda` | date | |
| `ciudad` | string | |
| `n_invitados` | int | |
| `plan_interes` | enum | Esencial/Completo/Premium/Solo micrositio |
| `mensaje` | text | |
| `origen` | enum | form_sitio / whatsapp_bot / otro |
| `estado` | enum | nuevo / contactado / calificado / cerrado / perdido |
| `createdAt` / `updatedAt` | datetime | |
| `notas_marketing` | text | seguimiento interno |

**Opciones de almacenamiento (evaluar):**
- **A) Redis hash** (`lead:{phone}`) — rápido, ya en el stack, pero sin queries complejas
- **B) Notion DB "Leads Nos Casamos"** — visible/editable, ya usamos Notion; gratis hasta 1000 filas
- **C) Postgres (Railway)** — escalable, queries de marketing (recomendado para estrategia futura)

### Tareas (NO ejecutadas — esperando aprobación)
- [ ] 7.1 Decidir storage (A/B/C) + crear DB/colección
- [ ] 7.2 Hook en form de contacto del sitio (POST a Railway en vez de solo wa.me)
- [ ] 7.3 Modo lead del bot: al detectar prospecto → guardar en BD de leads
- [ ] 7.4 Pipeline de estados + panel simple de seguimiento
- [ ] 7.5 (futuro) Estrategia de marketing: campañas WhatsApp/email a leads no convertidos

---

## Prioridades sugeridas (ACTUALIZADO 04-Ago 08:46)

1. **Fase 1 + 2** (agente dual + invitados conversacional) — núcleo del producto
2. **Fase 7** (BD de leads) — barato, alto valor para marketing futuro
3. **Fase 6** (sección de confianza) — 30 min, mejora conversión del sitio
4. **Fase 3** (codigonovios MP) — requiere cuenta Mercado Pago + addon domain
5. **Fase 4** (recordatorios regalos) — depende de 3
6. **Fase 5** (productización) — continua

## Bloqueantes / decisiones pendientes
- [ ] Cuenta Mercado Pago comercial (¿Aconcagua Capital SpA o nueva?)
- [ ] % de comisión exacto
- [ ] Banco/cuenta corriente destino de los novios (para payout MP)
- [ ] Confirmar si novios de la boda test (Alejandro/Kuilen) se registran ya como "novios" del tenant
- [ ] **Storage de leads: Redis vs Notion vs Postgres (recomendado)**
- [ ] **Logos: incluir solo Railway+Meta+DeepSeek o también Anthropic/OpenAI** (confirmar stack público del producto)
