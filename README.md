# 💒 Wedding Planner Agent — claw-wedding-agent

> Agente WhatsApp + Sitio Web para gestión completa de bodas.
> Producto comercializable tipo SaaS multi-tenant.

**Creado:** 23-Jul-2026 | **Stack:** Node.js, Railway, Meta WhatsApp API, Redis, Static Website

## 🎯 Objetivo

Sistema integral que acompaña a los novios y sus invitados durante todo el ciclo de la boda, desde el Save the Date hasta el día del evento, combinando WhatsApp Business API para comunicaciones automatizadas con un sitio web personalizado para confirmación, información y regalos.

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA WEDDING PLANNER                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] Save the Date ──→ PDF interactivo con link a calendario   │
│        │                                                        │
│        ▼                                                        │
│  [2] Invitación Formal ──→ WhatsApp: plantilla con carta PDF   │
│        │                  + link al sitio web de la boda        │
│        ▼                                                        │
│  [3] Sitio Web Boda ──→ RSVP · Dress Code · Info Evento ·      │
│        │                  Galería Fotos/Videos · Mesa de Regalos │
│        ▼                                                        │
│  [4] Confirmación RSVP ──→ WhatsApp: confirmación recibida      │
│        │                      + datos de mesa/asiento            │
│        ▼                                                        │
│  [5] Recordatorio 7 días ──→ WhatsApp: info final + clima       │
│        │                                                        │
│        ▼                                                        │
│  [6] Recordatorio 24h ──→ WhatsApp: checklist último minuto     │
│        │                                                        │
│        ▼                                                        │
│  [7] Día del Evento ──→ WhatsApp: "¡Nos casamos hoy!" 🎉       │
│        │                  + mapa/estacionamiento en vivo         │
│        ▼                                                        │
│  [8] Post-Boda ──→ Agradecimiento + link galería de fotos       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Estructura del Proyecto

```
wedding-planner/
├── README.md              ← Este archivo (hub del proyecto)
├── docs/
│   ├── ARCHITECTURE.md    ← Arquitectura técnica completa
│   ├── FLOWS.md           ← Flujos detallados de conversación
│   ├── TEMPLATES.md       ← Templates WhatsApp (Meta)
│   ├── WEBSITE.md         ← Especificación del sitio web nupcial
│   └── DEPLOY.md          ← Guía de deploy en Railway + GitHub
├── templates/
│   ├── save_the_date.txt
│   ├── invitacion_formal.txt
│   ├── confirmacion_rsvp.txt
│   ├── recordatorio_7d.txt
│   ├── recordatorio_24h.txt
│   ├── dia_evento.txt
│   └── post_boda.txt
├── src/
│   ├── server.js           ← Express server + webhook Meta
│   ├── core/
│   │   ├── flows.js        ← State machine de flujos
│   │   ├── templates.js    ← Gestor de templates
│   │   └── contacts.js     ← Gestor de contactos/invitados
│   ├── tenants/
│   │   └── default/        ← Config por boda (multi-tenant)
│   │       └── config.js
│   └── site/               ← Sitio web estático personalizable
│       ├── index.html
│       ├── rsvp.html
│       ├── galeria.html
│       └── regalos.html
├── railway.json
├── .gitignore
└── package.json
```

## 🏗️ Stack Tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| **Backend** | Node.js + Express | Mismo patrón que claw-whatsapp-agent |
| **Hosting** | Railway.app | Auto-deploy desde GitHub master |
| **Mensajería** | Meta WhatsApp Business API | Templates aprobados, webhooks |
| **Cache/Estado** | Redis (Railway addon o externo) | Estado de conversaciones, RSVPs |
| **Sitio Web** | HTML/CSS estático | Hosteable en GitHub Pages o Railway static |
| **Base de Datos** | Notion (RSVPs, contactos) o SQLite | Según complejidad |
| **Archivos** | Google Drive API | PDFs (Save the Date, carta formal) |
| **Monitoreo** | Slack webhook | Notificaciones de actividad |

## 📊 Comparativa con Proyectos Anteriores

| Característica | Yeppo WA Agent | Softify | Wedding Planner |
|---------------|----------------|---------|-----------------|
| **Repo** | `yeppo-whatsapp-webhook` | `claw-whatsapp-agent` | `claw-wedding-agent` ✨ |
| **Multi-tenant** | ❌ Single | ✅ | ✅ |
| **Flujos** | Ventas + soporte | Soporte | Wedding lifecycle |
| **Sitio web** | Shopify | softify.cl | Sitio nupcial personalizado |
| **Templates** | 3-5 | 2-3 | 7-8 |
| **Contactos** | Clientes Shopify | Clientes softify | Invitados (CSV/Google Sheets) |
| **Monetización** | Indirecta | SaaS | Por boda o suscripción |

## 🔗 Referencia: Proyecto Anterior (Softify)

- **Repo:** `github.com/alejandrochungp/claw-whatsapp-agent`
- **Railway:** `yeppo-whatsapp-webhook-production.up.railway.app`
- **Arquitectura:** Multi-tenant, Node.js + Express, Redis, Meta API v21.0
- **Templates:** `softify_soporte_continuacion` (ID: 1049159554359124, APPROVED)

## 📋 Roadmap

### Fase 1 — Fundación (Sprint 1)
- [ ] Crear repo GitHub: `claw-wedding-agent`
- [ ] Deploy en Railway (fork inicial del agente base)
- [ ] Configurar WABA + número eSIM
- [ ] Crear y aprobar templates Meta (Save the Date + Invitación)
- [ ] Sitio web estático base (HTML/CSS template nupcial)

### Fase 2 — Flujo Core (Sprint 2)
- [ ] Implementar state machine de 8 flujos
- [ ] Integración Google Calendar (eventos automáticos)
- [ ] Sitio web: RSVP funcional + formulario → Notion
- [ ] PDF generación automática (Save the Date + carta formal)

### Fase 3 — Features Premium (Sprint 3)
- [ ] Mesa de regalos (Código Novios, Paris, Falabella, transferencia)
- [ ] Galería de fotos/videos de novios
- [ ] Dashboard de confirmaciones (para novios)
- [ ] Multi-tenant: onboarding nueva boda en < 30 min

### Fase 4 — Comercialización (Sprint 4)
- [ ] Landing page producto
- [ ] Pricing: por boda vs suscripción mensual
- [ ] Integración con wedding planners (B2B)
- [ ] WhatsApp Shop (catálogo de servicios)
