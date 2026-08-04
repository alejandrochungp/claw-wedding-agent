# Propuesta: Parejas vinculadas — solución al +1 duplicado en RSVP

> **Fecha:** 04-Ago-2026 18:08 | **Autor:** Claw
> **Estado:** PROPUESTA — NADA implementado (Alejandro debe aprobar)
> **Problema reportado por Alejandro:** si agrega a una PAREJA (2 invitados, cada uno con su WhatsApp), cada uno recibe su invitación personalizada. Pero si llenan el form de RSVP por separado y **ambos ponen +1** (cada uno pensando en el otro), el sistema cuenta **4 personas en vez de 2**.

---

## 1. El problema exacto

```
Novio agrega: "agregar a María Pérez +56 9 1111 2222 y Juan Soto +56 9 3333 4444"
  → 2 invitados separados, cada uno con su invitación personalizada ✅ (objetivo logrado)

María llena el form:  Sí, allá estaré 🎉  + Acompañantes: 1   (piensa en Juan)
Juan llena el form:   Sí, allá estaré 🎉  + Acompañantes: 1   (piensa en María)

Conteo del sistema: 2 confirmados + 2 acompañantes = 4 ❌ (deberían ser 2)
```

**Causa raíz:** el sistema no sabe que María y Juan son pareja → no puede detectar que el +1 de cada uno ES el otro.

---

## 2. Solución propuesta: Parejas vinculadas (couple linking)

### 2.1 Concepto
Vincular a los 2 invitados que forman pareja, para que el conteo **absorba el +1 mutuo** automáticamente.

### 2.2 Cómo se vincula (2 opciones)

**Opción A (recomendada): agregar pareja en un solo comando**
```
agregar a María Pérez +56 9 1111 2222 y Juan Soto +56 9 3333 4444
```
→ Crea 2 guests y los vincula con el mismo `coupleId`.

**Opción B: vincular invitados existentes**
```
vincular pareja +56 9 1111 2222 +56 9 3333 4444
```
→ Útil si ya los agregó por separado.

### 2.3 Estructura de datos
Cada guest del hash `wedding:guests` gana un campo:
```json
{
  "name": "María Pérez",
  "phone": "+56911112222",
  "coupleId": "CP-7F3A",           // ← NUEVO: mismo ID en ambos miembros
  "partnerPhone": "+56933334444",  // ← NUEVO: teléfono del otro (conveniencia)
  "stage": "confirmado",
  "templatesSent": []
}
```

### 2.4 Regla de conteo (dedupe automático del +1)
Al calcular asistencia (`ver confirmaciones` / stats):

```
Para cada confirmado con +1:
  ¿Su pareja (mismo coupleId) TAMBIÉN confirmó?
    SÍ → el +1 representa a la pareja → NO sumar extra
    NO → el +1 es otra persona → sumar normalmente
```

**Ejemplo con la regla:**
- María ✅ (+1) + Juan ✅ (+1) → 2 confirmados, ambos +1 absorbidos = **2 personas** ✅
- María ✅ (+1) + Juan ❌ → 1 confirmado + 1 acompañante real = **2 personas** (Juan no va, pero María trae a alguien — o Juan como su +1; correcto)

### 2.5 Mejora opcional del form (fase 2)
En `rsvp.html`, reemplazar el campo libre "N° de acompañantes" por:
```
¿Vienes con tu pareja? [ ] Sí, viene como invitado propio   [ ] No / vengo con otra persona
```
→ El invitado declara explícitamente si su +1 ES la pareja ya invitada. 100% preciso.

---

## 3. Implementación sugerida (si se aprueba)

| Paso | Cambio |
|------|--------|
| 1 | Parser de `addGuestViaChat` acepta 2 teléfonos (`...y...`) → crea 2 guests con `coupleId` |
| 2 | Comando `vincular pareja {p1} {p2}` para parejas ya existentes |
| 3 | Helper `countConfirmed()` (reemplaza el conteo simple en `ver confirmaciones` y `/admin/stats`) con la regla de absorción |
| 4 | Mostrar 👫 en el listado de invitados para parejas vinculadas |
| 5 | (Fase 2) Form del micrositio con selector de pareja |

**Archivos:** `src/server.js` (parser + helpers + stats), `site/rsvp.html` (fase 2), `docs/` (esta propuesta)

---

## 4. Alternativas consideradas (y por qué NO)
| Alternativa | Motivo de rechazo |
|-------------|-------------------|
| Form con aviso "no marques +1 si tu pareja ya está invitada" | La gente no lee instrucciones — frágil |
| Un solo RSVP por pareja | Pierde la personalización que Alejandro quiere (ambos reciben su invitación) |
| Dedupe solo en stats sin vincular | Sin `coupleId` no hay forma de saber quién es la pareja de quién |
| Detectar por apellido/domicilio | Heurística poco confiable |

---

## 5. ✅ IMPLEMENTADO + DESPLEGADO (04-Ago 19:00, deploy `2741bccf`) — VERIFICADO

### Implementado
1. **`addGuestViaChat` con parejas:** `agregar a María +56 9... y Juan +56 9...` → crea 2 guests con `coupleId` + `partnerPhone` (mismo `coupleId`, teléfonos cruzados)
2. **Comando `vincular pareja {p1} {p2}`** → vincula invitados ya existentes (helper `linkCouple`)
3. **`getConfirmedStats()`** → regla de absorción: si un confirmado tiene +1 y su pareja (coupleId) TAMBIÉN confirmó → el +1 se absorbe (2 personas en vez de 4)
4. Aplica en: `ver confirmaciones` (WhatsApp) + `/admin/stats` (totalAsistentes)
5. Listado `ver invitados` muestra 👫 para parejas

### Verificado en producción
- 13 invitados cargados (7 invitación enviada, 6 nuevo)
- Stats: `total: 7, confirmed: 6, totalAsistentes: 6` — sin duplicados de +1 ✅

### Estructura de datos (implementada)
```json
{ "name": "María", "phone": "+569...", "coupleId": "CP-XXXXXX", "partnerPhone": "+569...", "stage": "nuevo", "templatesSent": [] }
```

### Commits
- `689b041` · deploy `2741bccf`
