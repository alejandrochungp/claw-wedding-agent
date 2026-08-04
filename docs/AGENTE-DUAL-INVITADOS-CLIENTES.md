# Agente Dual: Wedding Planner que atiende Invitados + Nuevos Clientes

> **Fecha:** 04-Ago-2026 | **Autor:** Claw + Alejandro
> **Estado:** Definición de producto — implementación pendiente (ver PLAN-TRABAJO-MEJORAS-2026-08-04.md)

---

## 1. Concepto

El agente (claw-wedding-agent / Nos Casamos) actúa como un **wedding planner digital** con DOS audiencias simultáneas:

| Audiencia | Rol del agente | Ejemplo |
|-----------|---------------|---------|
| **Invitados de una boda** | Asistente del evento: RSVP, dudas (hora, lugar, dress code), recordatorios | "¿Dónde es la recepción?" |
| **Nuevos clientes (novios)** | Ejecutivo comercial: info del producto, planes, precios, onboarding | "Quiero esto para mi boda, ¿cómo parto?" |

**La clave:** el agente **identifica por WhatsApp** si quien escribe es invitado, novio registrado, o lead nuevo — y responde con el rol correspondiente (sin mezclar contextos).

---

## 2. Identificación de actores

### 2.1 Invitados
- Números que están en la lista de invitados de una boda (importados a Redis/Notion)
- El bot les responde sobre SU boda: RSVP, dudas del evento, recordatorios

### 2.2 Novios (clientes registrados) — NUEVO ⭐
- Los novios se registran con su WhatsApp (durante onboarding)
- Al escribir, el bot los reconoce como **novios** y les da acceso a funciones de gestión:
  - ➕ **Agregar invitados** conversando con el bot: nombre + WhatsApp (+ correo opcional)
  - Ver estado de confirmaciones
  - Editar datos del evento
  - Configurar recordatorios / mensajes
- **Flujo de ejemplo (definido por Alejandro):**
  ```
  Novio: "Agrega a mi tía María, +56 9 1234 5678, maria@gmail.com"
  Bot:   "✅ Agregué a María Pérez (+56 9 1234 5678) a los invitados.
          ¿Quieres agregar el correo? (opcional)"
  Novio: "maria@gmail.com"
  Bot:   "✅ Listo. Invitados: 47. ¿Algo más?"
  ```
- El correo es **opcional** (WhatsApp es el canal principal)

### 2.3 Leads (nuevos clientes)
- Números NO registrados que preguntan por el producto
- El bot actúa como **ejecutivo comercial**: explica planes (Esencial/Completo/Premium), precios, cómo funciona, y captura el lead (nombre, fecha boda, ciudad, nº invitados)
- Los leads quedan en una lista para seguimiento (Notion/Redis → panel)

---

## 3. Reglas de routing (propuesta)

1. Número en `novios[]` → modo **novios** (gestión)
2. Número en `invitados[{boda_id}]` → modo **invitado** (evento)
3. Cualquier otro número → modo **lead** (comercial) + preguntar si tiene boda / es invitado

**Prioridad:** novios > invitados > lead (un novio también puede ser invitado de otra boda — contexto por boda).

**Persistencia:** tabla/keys Redis por número:
```
wa:actor:{phone} → { role: "novio"|"invitado", boda_id, novios: [ids], email?, createdAt }
```

---

## 4. Integración con codigonovios.cl (producto hermano)

El agente es el **puente** entre el bot y la plataforma de regalos:

- El bot **envía el link de la lista** de regalos por WhatsApp (`codigonovios.cl/n/{slug}`)
- **Recordatorios de regalos:** el bot recuerda a quienes **no han comprado** el regalo, incluso **después de la boda** (recaudación clave — la boda no es un evento económico y los fondos ayudan a financiarla)
- Los novios pueden pedir al bot: "envía el recordatorio de regalos a los que faltan"

**Detalles de codigonovios.cl:** ver `projects/codigonovios/README.md` (Mercado Pago, depósitos semanales a cuenta de novios, comisión %)

---

## 5. Cambios necesarios en server.js (resumen)

1. **Tabla/keys de actores** en Redis (novios/invitados/leads) + lookup por phone en cada mensaje
2. **Comandos de novios:** `agregar invitado`, `ver confirmaciones`, `enviar recordatorio regalos`
3. **Parser de invitados conversacional:** extraer nombre/WhatsApp/correo del texto libre (LLM DeepSeek + confirmación antes de guardar)
4. **Modo lead:** flujo comercial con captura de datos → Notion/Redis
5. **Webhook de pagos** (Mercado Pago → actualizar estado del regalo → notificar novios/invitados)

---

## 6. Archivos relacionados
- `docs/PROPUESTA-BOT-LLM-PRODUCTO.md` — monetización y arquitectura
- `docs/PRODUCTO-DOMINIO-WEB-METAAPP.md` — dominio/web/Meta App
- `docs/ONBOARDING-NOVIOS.md` — formulario de onboarding
- `projects/codigonovios/README.md` — plataforma de regalos (producto hermano)
- `docs/PLAN-TRABAJO-MEJORAS-2026-08-04.md` — plan de implementación
