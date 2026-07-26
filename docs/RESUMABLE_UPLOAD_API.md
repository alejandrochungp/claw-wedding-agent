# WhatsApp Template with IMAGE Header via Resumable Upload API

## Overview
Meta's WhatsApp Business API doesn't support creating templates with IMAGE headers
through the standard `/message_templates` endpoint with media IDs or external URLs.
The **Resumable Upload API** is the ONLY way to create templates with IMAGE headers
programmatically.

## When to Use
- Creating WhatsApp templates that need an IMAGE header (not TEXT/DOCUMENT/VIDEO/LOCATION)
- Uploading raw image bytes for template header without needing a phone number media upload first
- Any project that needs WhatsApp templates with images created via API (not WhatsApp Manager UI)

## Architecture Note: Two Tokens, Two Scopes

| Token Type | How to Get | Works For |
|------------|-----------|-----------|
| **App Token** | `POST /oauth/access_token?grant_type=client_credentials&client_id={APP_ID}&client_secret={APP_SECRET}` | Resumable Upload API (`/{APP_ID}/uploads`), Meta App admin (webhooks, subscriptions) |
| **System User Token** | Generated in Business Settings → System Users → Generate Token | WhatsApp messaging API (send messages, manage templates, phone numbers) |

**Key rule:** App token for uploads, System User token for everything else.
Do NOT mix them up — each endpoint requires a specific token type.

## Step-by-Step Flow

### Step 1: Get App Token
```python
import urllib.request, json

app_id = "1261291912568631"
app_secret = "YOUR_APP_SECRET"

url = f"https://graph.facebook.com/oauth/access_token?grant_type=client_credentials&client_id={app_id}&client_secret={app_secret}"
resp = json.loads(urllib.request.urlopen(url).read())
app_token = resp["access_token"]
# App token is short-lived — use it immediately
```

### Step 2: Create Upload Session
```python
file_path = "path/to/image.jpg"
file_size = os.path.getsize(file_path)

url = f"https://graph.facebook.com/v22.0/{app_id}/uploads?file_name=image.jpg&file_length={file_size}&file_type=image/jpeg"
req = urllib.request.Request(url, method="POST", headers={"Authorization": f"Bearer {app_token}"})
resp = json.loads(urllib.request.urlopen(req).read())
session_id = resp["id"]  # e.g., "upload:abc123..."
```

### Step 3: Upload Raw Bytes
```python
with open(file_path, "rb") as f:
    file_bytes = f.read()

req = urllib.request.Request(
    f"https://graph.facebook.com/v22.0/{session_id}",
    method="POST",
    data=file_bytes,
    headers={
        "Authorization": f"OAuth {app_token}",
        "Content-Type": "image/jpeg",
        "file_offset": "0"
    }
)
resp = json.loads(urllib.request.urlopen(req).read())
handle = resp["h"]  # e.g., "2:c2FtcGxl..."
```

### Step 4: Create Template with IMAGE Header
```python
# NOW use System User token (not App token!)
sys_token = "EAAXQQ5f0RxU..."

template_payload = {
    "name": "my_template_name",
    "category": "MARKETING",
    "language": "es",
    "components": [
        {
            "type": "HEADER",
            "format": "IMAGE",
            "example": {
                "header_handle": [handle]  # from Step 3
            }
        },
        {
            "type": "BODY",
            "text": "Hola {{1}}, este es un mensaje con {{2}} variables.",
            "example": {
                "body_text": [["Juan", "dos"]]
            }
        },
        {
            "type": "BUTTONS",
            "buttons": [
                {"type": "QUICK_REPLY", "text": "Confirmar"},
                {"type": "QUICK_REPLY", "text": "Cancelar"}
            ]
        }
    ]
}

url = f"https://graph.facebook.com/v22.0/{waba_id}/message_templates"
req = urllib.request.Request(url, method="POST",
    data=json.dumps(template_payload).encode(),
    headers={
        "Authorization": f"Bearer {sys_token}",
        "Content-Type": "application/json"
    })
resp = json.loads(urllib.request.urlopen(req).read())
template_id = resp["id"]
```

### Step 5: Send Template Message (with Image)
```python
# For sending, you need a media_id uploaded to the phone number
# First, upload the image to the phone number
with open(file_path, "rb") as f:
    file_bytes = f.read()

url = f"https://graph.facebook.com/v22.0/{phone_number_id}/media"
req = urllib.request.Request(url, method="POST",
    data=file_bytes,
    headers={
        "Authorization": f"Bearer {sys_token}",
        "Content-Type": "image/jpeg"
    })
resp = json.loads(urllib.request.urlopen(req).read())
media_id = resp["id"]

# Then send template with image parameter
send_payload = {
    "messaging_product": "whatsapp",
    "to": "+56966283141",
    "type": "template",
    "template": {
        "name": "my_template_name",
        "language": {"code": "es"},
        "components": [
            {
                "type": "header",
                "parameters": [
                    {
                        "type": "image",
                        "image": {"id": media_id}
                    }
                ]
            },
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Juan"},
                    {"type": "text", "text": "dos"}
                ]
            }
        ]
    }
}

url = f"https://graph.facebook.com/v22.0/{phone_number_id}/messages"
req = urllib.request.Request(url, method="POST",
    data=json.dumps(send_payload).encode(),
    headers={
        "Authorization": f"Bearer {sys_token}",
        "Content-Type": "application/json"
    })
resp = json.loads(urllib.request.urlopen(req).read())
```

## Common Errors

| Error | Subcode | Cause | Fix |
|-------|---------|-------|-----|
| `#190 Invalid OAuth token` | — | System User token used on Upload API | Use App token for uploads |
| `#190 Invalid OAuth token` | — | App token used on messaging API | Use System User token |
| `2494102` | invalid media identifier | Phone number media_id used in template creation | Use Resumable Upload handle instead |
| `2388273` | missing sample for header type | External URL used as image | Use Resumable Upload handle |
| `2388299` | variables at start/end | Variables placed at beginning or end of text | Move variable inside text |

## Meta API Constraints (Reference)
| Rule | Subcode | Detail |
|-------|---------|--------|
| HEADER TEXT: max 1 variable | 2388029 | Variable count exceeded |
| HEADER TEXT: no emojis | 2388072 | Title can't contain emojis |
| HEADER TEXT: vars not at start/end | 2388299 | Variables at extremes rejected |
| HEADER TEXT: needs example | 2388043 | Missing expected example fields |
| BODY: vars not at start/end | 2388299 | Variables at extremes rejected |
| BUTTONS: no emojis | 2388060 | Emojis rejected in button text |

## Project: Wedding Planner
- **Meta App ID**: `1261291912568631`
- **WABA ID**: `1004041115557689`
- **Phone Number ID**: `1268610086327579` (+56994635497)
- **System User**: `61566630796479`
- **Token location**: `.secrets/softify_wa_token.txt`

## Reference
- Campaign BTS ARIRANG (May 2026): `memory/2026-05-01.md`
- Template v3 creation script: `tmp/wa_create_v3_img2.py`
