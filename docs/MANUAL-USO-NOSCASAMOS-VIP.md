# Manual de uso — Nos Casamos (noscasamos.vip)

> Guía completa del sistema de gestión de invitados y sitio web de la boda.
> Pensada para indexarla como documentación oficial de uso dentro del propio sitio.

**Boda:** Alejandro & Kuilen · 17 de noviembre de 2026 · Restaurante Meihua, Cerrillos, Santiago
**Sitio:** <https://alejandro-kuilen.noscasamos.vip>

---

## 1. Qué es

El sistema combina **WhatsApp** y un **sitio web** para acompañar a los novios y a sus invitados durante todo el ciclo de la boda:

- Los **novios** gestionan la lista de invitados y envían invitaciones por WhatsApp con comandos de texto.
- Los **invitados** reciben la invitación, confirman o rechazan asistencia con un toque y consultan toda la info del evento en el sitio.
- Todo queda registrado en tiempo real: quién confirmó, con cuántos acompañantes, quién faltó.

No requiere instalar nada. Todo funciona desde WhatsApp y el navegador.

---

## 2. Cómo funciona (visión general)

```
[Novio] escribe comando en WhatsApp
        │
        ▼
[Bot] guarda invitado + envía invitación (template Meta)
        │
        ▼
[Invitado] recibe mensaje con botones
        │
        ├── "Confirmar asistencia" ──► abre rsvp.html (formulario pre-llenado)
        │                                    │
        │                                    ▼
        │                            [Bot] guarda RSVP + avisa a los novios
        │
        └── "No podré asistir" ──► abre no-confirmado.html
                                     │
                                     ▼
                             [Bot] registra "no asistirá"
```

El sitio web es estático y vive en `noscasamos.vip`. El bot corre en la nube (Railway) y guarda el estado en Redis.

---

## 3. Guía para novios — panel por WhatsApp

Los novios controlan todo escribiendo comandos al número de WhatsApp de la boda.

### 3.1 Comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `agregar a {nombre} +56 9...` | Agrega un invitado a la lista |
| `agregar a {nombre} +56 9... con 2 acompañantes` | Agrega con cupo fijo de 2 acompañantes |
| `agregar a {A} +56 9... y {B} +56 9...` | Agrega una pareja (2 invitados vinculados) |
| `enviar invitación a {phone}` | Envía el save-the-date a un invitado |
| `reenviar invitación a {phone}` | Reenvía sin importar si ya se envió |
| `enviar invitación a todos` | Envía en lote a todos los pendientes |
| `ver invitados` | Lista con nombre, teléfono, etapa y cupo |
| `ver confirmaciones` | Estado de RSVP (confirmados / no / pendientes) |
| `vincular pareja {p1} {p2}` | Vincula 2 invitados existentes (corrige +1) |
| `editar nombre de {phone} a {nombre}` | Cambia el nombre |
| `editar correo de {phone} a {email}` | Cambia el correo |
| `editar teléfono de {viejo} a {nuevo}` | Cambia el teléfono |
| `editar acompañantes de {phone} a {n}` | Cambia el cupo de acompañantes (0–5) |
| `eliminar invitado {phone}` | Elimina (pide confirmación con `sí, eliminar`) |

> Los teléfonos se escriben con `+56 9...` o sin signo. El sistema los normaliza siempre.

### 3.2 Ciclo de un invitado (etapas)

Cada invitado pasa por etapas que se ven en `ver invitados`:

1. **nuevo** — agregado pero sin invitación enviada.
2. **invitacion_enviada** — se le envió el save-the-date.
3. **confirmado** — confirmó asistencia (por botón o formulario).
4. **no_asistira** — indicó que no asistirá.

### 3.3 Cupo de acompañantes (cupo máximo)

Cada invitado puede tener un **cupo máximo** de acompañantes (de 0 a 5). Ese cupo:

- Lo define el novio al agregar al invitado (`con N acompañantes` o `cupo N`).
- El invitado **puede elegir libremente entre 0 y su cupo** (ir solo/a o con hasta N acompañantes), pero **nunca superarlo**. El formulario usa botones **− / +** y el `+` se deshabilita al llegar al cupo.
- Aunque el invitado manipule el formulario, el servidor **recorta** el valor enviado a su cupo (`min(valor, cupo)`).

**Comandos de cupo:**

- Asignar al agregar: `agregar a {nombre} +56 9... con 3 acompañantes`
- Cambiar después: `editar acompañantes de {phone} a 3`
- Ver: `ver invitados` (muestra `cupo N` cuando está fijado)

> Un invitado sin cupo fijado (sin `acompañantes`) puede elegir libremente hasta 5 en el formulario.

---

## 4. Guía para invitados

### 4.1 Recibir la invitación

El invitado recibe un mensaje de WhatsApp con la foto de la pareja y el texto de la boda, más dos botones:

- **"Confirmar asistencia"**
- **"No podré asistir"**

Al tocar un botón se abre el sitio web directamente en el formulario correspondiente.

### 4.2 Confirmar asistencia

Al tocar **"Confirmar asistencia"** se abre `rsvp.html`. El formulario ya llega **pre-llenado** con el nombre y el teléfono del invitado (detectado automáticamente por su número). El invitado solo debe:

1. Verificar su nombre.
2. Indicar acompañantes con los botones **− / +** (de 0 hasta su cupo máximo; el `+` se bloquea al llegar al tope).
3. Opcional: dejar un mensaje.
4. Tocar **Enviar**.

Al enviar, los novios reciben la confirmación al instante y el invitado ve la página "¡Asistencia confirmada!".

### 4.3 No podré asistir

Al tocar **"No podré asistir"** se abre `no-confirmado.html`, también pre-llenado. El invitado confirma su ausencia y los novios quedan informados.

---

## 5. El sitio web (secciones)

| Página | URL | Contenido |
|--------|-----|-----------|
| **Portada** | `/index.html` | Nombres, fecha y acceso a todo |
| **Info del evento** | `/info.html` | Lugar, cronograma, dress code, estacionamiento, contacto, FAQ |
| **Confirmar asistencia** | `/rsvp.html` | Formulario de RSVP (pre-llenado por teléfono) |
| **No podré asistir** | `/no-confirmado.html` | Formulario de ausencia |
| **Confirmado** | `/confirmado.html` | Pantalla de agradecimiento post-RSVP |
| **Galería** | `/galeria.html` | Historia, hitos y fotos de la pareja |
| **Mesa de regalos** | `/regalos.html` | Código Novios, transferencia e invitados internacionales |

---

## 6. Mesa de regalos

La página `regalos.html` ofrece tres vías de regalo:

1. **Código Novios (Chile)** — lista de regalos en tiendas asociadas.
2. **Transferencia bancaria** — datos de cuenta para depósito directo.
3. **Invitados internacionales** — opción pensada para quienes están fuera de Chile.

---

## 7. Preguntas frecuentes

**¿El invitado puede cambiar cuántos acompañantes lleva?**
Sí, entre 0 y su cupo máximo. Si el novio le fijó un cupo (ej. 2), puede confirmar solo/a (0) o con hasta 2 acompañantes usando los botones − / +, pero no más.

**¿Cómo sé quién confirmó?**
El novio escribe `ver confirmaciones` en WhatsApp y ve el estado al instante. También recibe una notificación cada vez que alguien confirma.

**¿Puedo reenviar una invitación?**
Sí: `reenviar invitación a {phone}`.

**¿Puedo borrar a un invitado?**
Sí: `eliminar invitado {phone}` y confirmar con `sí, eliminar`. Se borra también su RSVP.

**¿Qué pasa si agrego un teléfono que ya existe?**
El bot avisa que ya está en la lista y muestra su estado, para evitar duplicados.

---

## 8. Referencia técnica rápida (para administradores)

- **Backend:** `https://claw-wedding-agent-production.up.railway.app`
- **Endpoints útiles:**
  - `GET /status` — salud y versión del bot.
  - `GET /api/rsvp/guest?phone=X` — prefill del invitado (nombre, teléfono, acompañantes, hasCupo).
  - `POST /admin/set-cupo` — fijar cupo (single o bulk `{cupos:[...]}`).
  - `GET /admin/guests` — lista completa de invitados.
  - `GET /admin/rsvps` — lista de confirmaciones.
- **Template activo de invitación:** `save_the_date_v4_img` (Meta id `1585195933335096`).
- **Template con prefill (en aprobación):** `save_the_date_v5_img` (Meta id `1707548530350870`).

---

*Última actualización: 15-ago-2026.*
