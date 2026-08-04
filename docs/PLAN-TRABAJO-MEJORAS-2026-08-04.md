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
| Botón header móvil "Quiero esto para mi boda": pasaba a fila propia full-width entre brand y nav (CSS `order:2; width:100%; text-align:center`) | ✅ Corregido + desplegado + verificado (screenshot 390px) |
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

## Prioridades sugeridas

1. **Fase 1 + 2** (agente dual + invitados conversacional) — núcleo del producto, sin dependencias externas
2. **Fase 3** (codigonovios MP) — requiere cuenta Mercado Pago + addon domain
3. **Fase 4** (recordatorios regalos) — depende de 3
4. **Fase 5** (productización) — continua

## Bloqueantes / decisiones pendientes
- [ ] Cuenta Mercado Pago comercial (¿Aconcagua Capital SpA o nueva?)
- [ ] % de comisión exacto
- [ ] Banco/cuenta corriente destino de los novios (para payout MP)
- [ ] Confirmar si novios de la boda test (Alejandro/Kuilen) se registran ya como "novios" del tenant
