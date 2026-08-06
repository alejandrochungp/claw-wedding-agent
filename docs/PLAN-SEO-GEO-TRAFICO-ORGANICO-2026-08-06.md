# Plan de Trabajo: Tráfico Orgánico SEO + GEO (Google / ChatGPT)

> **Fecha:** 06-Ago-2026 14:37 | **Autor:** Claw
> **Estado:** PLAN PARA REVISIÓN — NADA implementado (Alejandro debe aprobar antes de ejecutar)
> **Alcance:** noscasamos.vip (producto) + codigonovios.cl (lista de regalos) + caso real alejandro-kuilen

---

## 1. Objetivo

Empezar a obtener tráfico orgánico desde **buscadores (Google)** y **motores de respuesta con IA (ChatGPT, Perplexity, Gemini)** hacia los sitios del producto, con foco en parejas chilenas que se casan entre 2026-2028.

**Meta medible (90 días):** posicionar 5-10 keywords de baja competencia en Google y aparecer como fuente citada en respuestas de IA sobre "bodas en Chile / WhatsApp para bodas / lista de regalos".

---

## 2. Diagnóstico rápido (estado actual)

| Ítem | Estado |
|------|--------|
| Sitio producto noscasamos.vip | Existe, 4 páginas, contenido decente, sin blog, sin FAQ estructurado, sin schema |
| Sitio codigonovios.cl | Landing 3 páginas, sin contenido SEO |
| Google Search Console | No configurado |
| Google Business Profile | No existe |
| Backlinks | Cero (sitio nuevo) |
| Contenido de autoridad | No hay guías/checklists |

---

## 3. Fases propuestas

### Fase S1 — Fundamentos técnicos SEO (1-2 días)
| # | Tarea | Detalle |
|---|-------|---------|
| S1.1 | **Google Search Console** | Verificar ambos dominios (meta tag / DNS). Configurar sitemap.xml |
| S1.2 | **sitemap.xml** | Generar para noscasamos.vip + codigonovios.cl y enviar a GSC |
| S1.3 | **robots.txt** | Verificar que no bloquee nada importante |
| S1.4 | **Meta tags + OG** | Títulos/descripciones con keywords objetivo + Open Graph para compartir en WhatsApp |
| S1.5 | **Schema markup** | `FAQPage`, `HowTo`, `Product` (planes), `Event` (boda) en las páginas clave |
| S1.6 | **Canonical + HTTPS** | Verificar canonicals y que AutoSSL de codigonovios ya esté emitido |

**Entregable:** sitios técnicamente indexables, GSC activo, schema en páginas clave.

### Fase S2 — Contenido SEO (2 artículos iniciales) (3-4 días)
| # | Artículo propuesto | Keyword objetivo | Dónde |
|---|-------------------|------------------|-------|
| S2.1 | "Bot de WhatsApp para bodas en Chile: cómo funciona y cuánto cuesta" | bot whatsapp bodas chile | Blog noscasamos.vip |
| S2.2 | "Lista de regalos para bodas en Chile: cómo funciona y cuánto cuesta" | lista regalos boda chile | Blog codigonovios.cl |

**Estructura de cada artículo:** problema → solución → cómo funciona paso a paso → precios → FAQ → CTA. Formato largo (1200+ palabras) con datos concretos (para que las IA puedan citarlo).

### Fase S3 — Autoridad y presencia (3-5 días)
| # | Tarea |
|---|-------|
| S3.1 | **Caso de estudio real:** "Cómo organizamos nuestra boda con un bot de WhatsApp" (alejandro-kuilen) — contenido único en blog |
| S3.2 | **Google Business Profile** para el producto (categoría servicios de bodas) |
| S3.3 | **3 directorios de bodas chilenos** (bodas.com.cl, casarse.cl, foros de bodas) + registro de codigonovios.cl |
| S3.4 | **Perfil público en redes** (Instagram/TikTok) con contenido del micrositio — alimenta tráfico indirecto |
| S3.5 | **Reddit/foros** — responder preguntas reales sobre bodas/regalos citando los artículos (con cuidado, sin spam) |

### Fase S4 — Medición y ajuste (semana 2+)
| # | Tarea |
|---|-------|
| S4.1 | Google Search Console: revisar queries, impresiones, CTR |
| S4.2 | Ajustar títulos/meta según keywords que Google ya muestra |
| S4.3 | Segundo batch de artículos según datos (3-4 más) |
| S4.4 | Monitorear apariciones en ChatGPT/Perplexity (probar prompts manuales) |

---

## 4. Keywords objetivo (iniciales)

| Keyword | Intención | Producto |
|---------|-----------|----------|
| bot whatsapp para bodas chile | Alta | noscasamos.vip |
| invitación de boda por whatsapp | Alta | noscasamos.vip |
| confirmar asistencia boda online | Alta | noscasamos.vip |
| lista de regalos boda chile | Alta | codigonovios.cl |
| cuanto cuesta organizar una boda chile | Media (informativa) | Blog |

---

## 5. Decisiones de Alejandro (CONFIRMADAS 06-Ago 14:52) ✅

| # | Decisión | Estado |
|---|----------|--------|
| 1 | **Blog en SUBDOMINIO** `blog.noscasamos.vip` | ✅ CONFIRMADO |
| 2 | **Firma de fundador** en colaboración con desarrollo + **Programa Emprender**, desarrolladores profesionales | ✅ CONFIRMADO |
| 3 | **Caso de estudio PÚBLICO** (boda real Alejandro & Kuilen) para credibilidad | ✅ CONFIRMADO |
| 4 | **Presupuesto $0** (solo tiempo) | ✅ CONFIRMADO |
| 5 | **S1 ahora** + en paralelo **infraestructura Código Novios** (recaudación lista para carta formal) | ✅ CONFIRMADO |

---

## 5b. Ejecución en curso (06-Ago 14:52+)

### S1 — Técnico SEO
- Crear subdominio `blog.noscasamos.vip` en cPanel (uapi addsubdomain, patrón alejandro-kuilen)
- GSC: verificar blog.noscasamos.vip + noscasamos.vip + codigonovios.cl
- sitemap.xml + robots.txt
- Meta tags + OG en páginas
- Schema FAQPage/HowTo/Product

### Código Novios — infraestructura (paralelo)
- Backend Railway + Postgres tabla lista/regalos
- Endpoint público `codigonovios.cl/n/{slug}`
- Mercado Pago (pagos + payouts)
- Listo para cuando la carta formal (`invitacion_formal`) incluya el código

---

## 6. Lo que NO incluye este plan (a propósito)
- Publicidad paga (Google Ads / Meta Ads) — orgánico primero
- SEO black-hat (compra de links, keyword stuffing)
- Optimización de velocidad avanzada (CDN/compresión) — ya ok en Bluehost
- Multilingüe — solo español de Chile por ahora

---

## 7. Riesgos / notas
- **Resultados SEO tardan 2-4 meses** en Google — expectativa realista
- **GEO (IA) es más rápido** de verificar: probar prompts manuales desde la semana 1
- Meta tarifas internacionales: contenido del blog puede mencionar que los invitados internacionales cuestan más (contexto real de la boda)
