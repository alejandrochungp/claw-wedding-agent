# Onboarding Novios — Formulario Estándar de Captura (Producto)

> **Proyecto:** "No Nos Casamos" — bot WhatsApp para bodas
> **Propósito:** Estandarizar la captura de información de los novios al contratar el producto, para generar automáticamente: micrositio de boda + templates WhatsApp + config del bot.
> **Fecha:** 03-Ago-2026

---

## 🔄 Flujo de contratación

```
1. Novio cotiza → 2. Paga setup → 3. Completa FORMULARIO (este doc) → 4. Claw genera:
   - Micrositio (landing + rsvp + info + galeria + regalos)
   - Templates WhatsApp (save_the_date, info, galeria) con botones URL
   - Config bot (nombres, fecha, lugar, respuestas LLM)
→ 5. Revisión del novio → 6. Publicación + envío de invitaciones
```

## 📋 Formulario Estándar (23 campos, 5 secciones)

### Sección A — Identidad de la boda
| # | Campo | Tipo | Obligatorio | Ejemplo |
|---|-------|------|-------------|---------|
| 1 | Nombre novio 1 | texto | ✅ | Alejandro |
| 2 | Nombre novio 2 | texto | ✅ | Kuilen |
| 3 | Fecha del evento | fecha | ✅ | 17/11/2026 |
| 4 | Hora inicio (cóctel) | hora | ✅ | 18:00 |
| 5 | Lugar + dirección | texto | ✅ | Restaurante Meihua, Av. Departamental 2050, Cerrillos |
| 6 | Foto de la pareja (hero) | imagen | ✅ | JPG ≥ 1200px |
| 7 | Video propuesta / love story | archivo | ❌ | MP4 ≤ 50MB |

### Sección B — Logística del evento
| # | Campo | Tipo | Obligatorio | Ejemplo |
|---|-------|------|-------------|---------|
| 8 | Cronograma (hora → actividad) | tabla | ❌ | 18:00 Cóctel; 18:30 Ceremonia; 19:30 Cena; 21:30 Baile |
| 9 | Dress code | texto | ❌ | Elegante; tonos tierra/burdeos/dorado |
| 10 | Estacionamiento | texto | ❌ | "Muy reducido — llegar en Uber" |
| 11 | ¿Invitados pueden llevar acompañante? | texto | ✅ | "Solo si recibiste +1 en la invitación" |
| 12 | Preguntas frecuentes (3-5) | lista | ❌ | Menú especial, hora de llegada, etc. |
| 13 | Contacto de respaldo (wedding planner) | teléfono | ✅ | +56 9 ... |

### Sección C — Galería e historia
| # | Campo | Tipo | Obligatorio | Ejemplo |
|---|-------|------|-------------|---------|
| 14 | Timeline de hitos (fecha + texto) | lista | ❌ | 2020 Nos conocimos; 2023 Primer viaje; 2026 Propuesta |
| 15 | Fotos adicionales (hasta 10) | imágenes | ❌ | — |

### Sección D — Regalos
| # | Campo | Tipo | Obligatorio | Ejemplo |
|---|-------|------|-------------|---------|
| 16 | ¿Mesa de regalos? (sí/no) | sí/no | ✅ | Sí |
| 17 | Código Novios (Chile) — código + link | texto | ❌ | — |
| 18 | Tiendas (Paris/Falabella) — lista + nº | texto | ❌ | — |
| 19 | Transferencia bancaria — banco, RUT, cuenta, correo | tabla | ❌ | — |
| 20 | Métodos internacionales (PayPal/Wise) | texto | ❌ | — |

### Sección E — Comunicación
| # | Campo | Tipo | Obligatorio | Ejemplo |
|---|-------|------|-------------|---------|
| 21 | Lista de invitados (nombre + teléfono) | CSV | ✅ | Tía María; +56 9 ... |
| 22 | Idioma del bot | select | ✅ | Español |
| 23 | Tono del bot (formal/cercano) | select | ✅ | Cercano, directo |

## 🗺 Mapeo Campo → Artefacto Generado

| Sección/campos | Micrositio | Templates WhatsApp | Bot (LLM) |
|----------------|-----------|-------------------|-----------|
| A (1-7) | index.html (hero, nombres, fecha, countdown) | save_the_date_v4 | contexto nombres/fecha |
| B (8-13) | info.html (cronograma, dress code, parking, FAQ, contacto) | boda_info | respuestas a preguntas |
| C (14-15) | galeria.html (timeline + video + fotos) | boda_galeria | — |
| D (16-20) | regalos.html | — | respuestas a preguntas |
| E (21-23) | — | envío campañas | tono del bot |

## ⚙️ Implementación (para automatizar)

1. **Formulario de captura**: Fillout / Google Form / Notion form con los 23 campos
2. **Plantilla de micrositio**: `site/` con variables `{{NOVIO1}} {{NOVIO2}} {{FECHA}} {{LUGAR}} {{FOTO_HERO}}` — build script reemplaza por tenant
3. **Templates WhatsApp**: crear por WABA con nombre `{boda}_save_the_date`, `{boda}_info`, `{boda}_galeria` (script `tmp/wa_create_url_templates.py` parametrizado)
4. **Subdominio**: `{slug-boda}.noscasamos.vip` vía uapi (flujo documentado en DIAGNOSTICO-SUBDOMINIO-BLUEHOST)
5. **Config bot**: JSON por tenant con nombres/fecha/lugar/tono → server.js multi-tenant

## 📁 Output por boda (estructura)

```
projects/{cliente-boda}/
├── site/                      # micrositio generado (subido a {slug}.noscasamos.vip)
├── templates/                 # textos de templates con variables
├── config.json                # config del bot por tenant
├── invitados.csv              # lista de invitados
└── docs/                      # decisiones + estado
```

## ✅ Checklist de revisión (para el novio)

- [ ] Nombres y fecha correctos en landing
- [ ] Foto hero se ve bien (no cortada)
- [ ] Cronograma y dress code exactos
- [ ] FAQ responde las preguntas reales
- [ ] Número de contacto es el del wedding planner
- [ ] Timeline de hitos sin errores
- [ ] Datos de transferencia/regalos correctos
- [ ] Probar botón RSVP → llega el mensaje al bot
