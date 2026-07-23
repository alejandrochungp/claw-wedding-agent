# Flujos de Conversación — claw-wedding-agent

> State machine detallada: qué pasa en cada paso, qué espera el sistema, cómo responde.

## Estado: IDLE

**Descripción:** El invitado no está en ningún flujo activo.

**Triggers de entrada:**
- Primer contacto del invitado
- Mensaje no reconocido después de flujo completado
- Error en estado anterior (timeout)

**Qué hace el sistema:**
- Si el mensaje contiene palabras clave de boda → redirige a flujo activo
- Si no → responde con template `info_adicional` o mensaje genérico
- Si el invitado pregunta "¿cuándo es la boda?" → info del evento

---

## Estado: SAVE_THE_DATE

**Descripción:** Campaña de Save the Date enviada. Esperando confirmación de recepción.

**Gatillo:** Admin dispara campaña manual o vía cron.

**Flujo:**
```
Sistema: Envía template save_the_date
         ↓
Invitado: [Abra el mensaje] → Status: "read"
         ↓
Invitado: Toca "✅ Recibido" → Status: "clicked"
         ↓
Sistema: Registra entrega en Redis
         ↓
         └─ Si NO toca en 48h → reenvía recordatorio suave
```

**Estados posibles:**
| Estado | Significado |
|--------|-------------|
| `sent` | Mensaje enviado, no entregado aún |
| `delivered` | Llegó al teléfono |
| `read` | El invitado lo abrió |
| `clicked` | Tocó "✅ Recibido" o "📅 Agregar al Calendario" |

---

## Estado: INVITACION_FORMAL

**Descripción:** Carta formal de invitación enviada con link al sitio web.

**Gatillo:** Campaña 2-4 semanas después del Save the Date.

**Flujo:**
```
Sistema: Envía template invitacion_formal (PDF + link)
         ↓
Invitado: Abre el mensaje
         ↓
Invitado: Toca "💌 Ver invitación" → Abre PDF personalizado
         ↓
Invitado: Toca "✅ Confirmar asistencia" → Abre /rsvp en el sitio
         ↓
         └─ Transición a estado RSVP_PENDING
```

**PDF de carta formal:**
- Generado con `openai/gpt-image-2` o HTML→PDF (mismo patrón que Save the Date)
- Personalizado con nombre del invitado
- Contiene: nombres novios, fecha, lugar, código RSVP único
- El código RSVP (`?guest=MARIA123`) pre-llena el formulario

**Si el invitado NO responde en 7 días:**
- Reenvía invitación (máx 2 reenvíos)
- Si sigue sin respuesta → marca como "pendiente contacto alternativo"

---

## Estado: RSVP_PENDING

**Descripción:** El invitado tiene la invitación pero aún no confirma.

**Triggers:**
- Invitado abre /rsvp desde el link
- Invitado responde al mensaje de WhatsApp con "sí", "no", "tal vez"

**Flujo web:**
```
Invitado: Llena formulario en /rsvp
         ↓
Sitio: POST → Railway /rsvp/submit
         ↓
Railway: Guarda en Redis + Notion
         ↓
Railway: Dispara template confirmacion_rsvp
         ↓
Invitado: Recibe confirmación con número de mesa
         ↓
         └─ Transición a estado CONFIRMADO
```

**Flujo WhatsApp (respuesta directa):**
```
Invitado: "Sí, voy con 2 personas"
         ↓
Sistema: NLP parse → extrae count, diet
         ↓
Sistema: Responde "¿Alguna restricción alimentaria?"
         ↓
Invitado: "Vegetariano uno"
         ↓
Sistema: Guarda + envía confirmacion_rsvp
         ↓
         └─ Transición a estado CONFIRMADO
```

---

## Estado: CONFIRMADO

**Descripción:** Invitado confirmó. En espera de recordatorios.

**Qué hace el sistema:**
- Actualiza contador de confirmados en dashboard
- Asigna mesa automáticamente (o manual por admin)
- No envía más mensajes hasta 7 días antes

---

## Estado: RECORDATORIO_7D

**Descripción:** Una semana antes. Info final + clima.

**Gatillo:** Cron job 7 días antes del evento, 10:00 AM.

**Flujo:**
```
Sistema: Consulta clima (OpenWeatherMap API)
         ↓
Sistema: Envía template recordatorio_7d (personalizado por invitado)
         ↓
Invitado: Recibe info (dress code, lugar, clima, estacionamiento)
```

---

## Estado: RECORDATORIO_24H

**Descripción:** 24 horas antes. Checklist último minuto.

**Gatillo:** Cron job 24h antes del evento, 18:00.

**Flujo:**
```
Sistema: Envía template recordatorio_24h
         ↓
Invitado: Checklist + recordatorio de mesa
```

---

## Estado: DIA_EVENTO

**Descripción:** El gran día. Emoción + mapa en vivo.

**Gatillo:** Cron job día del evento, 9:00 AM.

**Flujo:**
```
Sistema: Envía template dia_evento
         ↓
Invitado: Recibe mensaje emotivo + mapa para llegar
```

---

## Estado: POST_BODA

**Descripción:** Agradecimiento + link a fotos.

**Gatillo:** Cron job día después del evento, 12:00 PM.

**Flujo:**
```
Sistema: Envía template post_boda
         ↓
Invitado: Toca "📸 Ver fotos" → /galeria
```

---

## 🔄 Manejo de Errores y Edge Cases

### Invitado rechaza asistencia
```
Invitado: Toca "No asistiré" en /rsvp
         ↓
Sistema: Guarda como "declinado"
         ↓
Sistema: Envía mensaje: "Gracias por avisarnos, te tendremos presente ❤️"
         ↓
         └─ No recibe recordatorios ni mensajes posteriores
```

### Invitado no tiene WhatsApp
```
Sistema: Intenta enviar → delivery_failed (no WhatsApp account)
         ↓
Admin: Marca contacto como "SMS/email alternativo"
         ↓
         └─ Flag en dashboard para gestión manual
```

### Invitado cambia de opinión (RSVP update)
```
Invitado: "Puedo ir al final, pero solo yo"
         ↓
Sistema: Detecta cambio → pregunta confirmar
         ↓
         └─ Actualiza Redis + Notion + reenvía confirmacion_rsvp
```

### Mensaje no reconocido en medio de flujo
```
Sistema: "No entendí tu mensaje. ¿Quieres confirmar asistencia a la boda de X & Y?"
         ↓
         └─ Si 3 mensajes sin entender → ofrece template info_adicional
```

### Timeout de sesión (Redis TTL)
```
Redis: Session key expira después de 72h inactividad
         ↓
Sistema: Reinicia desde IDLE
         ↓
         └─ Si el invitado estaba en flujo activo → reanuda preguntando
```

---

## 📊 Métricas por Flujo

| Métrica | Descripción |
|---------|-------------|
| Delivery rate | % mensajes entregados |
| Read rate | % mensajes abiertos |
| Click rate | % botones clickeados |
| RSVP rate | % invitados que confirmaron |
| Time to RSVP | Tiempo promedio entre invitación y confirmación |
| Drop-off | % que abandonan en cada paso del flujo |
