# Business Verification — WhatsApp Cloud API

## El Problema

El BUSINESS `2065338583688337` (dueño del WABA `1004041115557689`) tiene `can_send_message: LIMITED` por error 141010: **"The Business has not passed business verification"**.

## Error 141010 en Profundidad

### Qué es
Error de la WhatsApp Business Platform que impide el envío de mensajes cuando el negocio asociado al WABA no ha completado el proceso de verificación de Meta (Business Verification).

### Síntoma silencioso
- La API de Meta retorna `message_status: accepted` con HTTP 200
- Se genera un `message_id` válido (formato `wamid.HBgL...`)
- WhatsApp NO entrega el mensaje al destinatario
- No hay webhook de delivery failure inmediato (puede llegar horas después)

### Cómo detectarlo
Llamar al endpoint de health del phone number:
```
GET /v22.0/{phone_number_id}/whatsapp_business_health
```
Respuesta indicativa:
```json
{
  "can_send_message": "LIMITED",
  "entities": [
    {
      "entity_type": "BUSINESS",
      "id": "2065338583688337",
      "can_send_message": "LIMITED",
      "errors": [
        {
          "error_code": 141010,
          "error_description": "The Business has not passed business verification"
        }
      ]
    }
  ]
}
```

### Por qué pasó en nuestro caso
1. El BUSINESS se creó para Softify (app de servicio al cliente)
2. Se agregó Wedding Planner como segunda Meta App al mismo WABA/BUSINESS
3. Meta permite operar sin verificación inicialmente (mensajes de prueba, templates simples)
4. Al empezar a enviar templates de MARKETING (categoría más restrictiva), Meta escala la restricción
5. Entre ~20:28 y ~21:17 se enviaron 4+ templates exitosamente (~1h de actividad)
6. A partir de ~21:52, Meta aplicó el bloqueo — todos los mensajes dejaron de entregarse

### Alcance del bloqueo
- ✅ Phone number level: AVAILABLE
- ✅ WABA level: AVAILABLE
- ❌ BUSINESS level: LIMITED
- Ambos números (5497 Wedding Planner + 3050 Softify) comparten el mismo BUSINESS → ambos afectados

### Tipos de mensajes bloqueados
| Tipo | ¿Bloqueado? | Nota |
|------|------------|------|
| Templates MARKETING | ❌ Bloqueado | Categoría más restrictiva |
| Templates UTILITY | ⚠️ Probablemente | BUSINESS LIMITED afecta todo |
| Texto libre (sesión) | ⚠️ Probablemente | Requiere ventana 24h + BUSINESS puede restringir |
| Texto libre (fuera sesión) | ❌ Bloqueado | Ventana 24h requerida de todos modos |

### Tiempo de resolución
- Típicamente 24-48h hábiles después de subir documentos
- Puede ser instantáneo si Meta ya tiene datos del negocio
- No hay fast-track — es proceso manual de Meta

## Estado Actual

**26-Jul-2026 09:55:** Alejandro subió los documentos de verificación del negocio al Meta Business Manager. Tiempo estimado de revisión: **2 días hábiles** (resolución esperada ~28-Jul-2026).

## Cómo Resolverlo

### Paso 1: Acceder a Business Settings
URL: <https://business.facebook.com/settings/security>

### Paso 2: Iniciar verificación
1. Click en "Security Center"
2. Buscar "Business Verification" o "Verificación del negocio"
3. Click en "Start Verification"

### Paso 3: Documentos requeridos
Meta pide típicamente:
- **Identificación oficial** del dueño/representante legal
- **Documento del negocio:** Escritura de constitución, certificado de vigencia, o documento tributario
- **Comprobante de domicilio:** Factura de servicios, extracto bancario con dirección
- **Información del negocio:** Nombre legal, dirección, teléfono, sitio web

Para nuestro caso (Aconcagua Capital SpA o Inversiones ECP SpA):
- RUT de la empresa
- Escritura de constitución
- Certificado de vigencia (SII o Registro de Empresas)
- Comprobante de domicilio comercial

### Paso 4: Esperar revisión ✅ (en curso)
Meta revisa manualmente. Puede tomar 1-3 días hábiles.
- **Documentos subidos:** 26-Jul-2026 ~09:55
- **ETA resolución:** 28-Jul-2026

### Paso 5: Verificar resolución
Después de aprobada la verificación, verificar con:
```
GET /v22.0/{phone_number_id}/whatsapp_business_health
```
`can_send_message` debe cambiar de `LIMITED` a `AVAILABLE`.

## Workarounds Mientras Tanto

### Opción A: Reabrir ventana 24h
El destinatario envía un mensaje al número → se reabre ventana → probar envío de texto libre o template.
- Puede no funcionar si el BUSINESS LIMITED bloquea incluso dentro de la ventana
- Solo sirve para test, no para producción

### Opción B: Usar otro BUSINESS (si existe)
Crear nuevo WABA bajo un BUSINESS ya verificado. Requiere:
- Nuevo número de teléfono (no se puede migrar un número entre WABAs)
- Re-aprobar templates

### Opción C: Completar verificación (solución real)
Es la única solución permanente.

## Verificación Post-141010

Después de que Meta apruebe la verificación:
1. `can_send_message` → `AVAILABLE`
2. Probar envío de template a Alejandro
3. Probar envío a Kuilen
4. Verificar webhooks de delivery
5. Testear flujo completo de RSVP (template → botones → Redis → Slack)

## Referencias
- WhatsApp Cloud API Error Codes: <https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes>
- Business Verification Guide: <https://www.facebook.com/business/help/2058515294227817>
- Health Status API: <https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers/get-health-status>
