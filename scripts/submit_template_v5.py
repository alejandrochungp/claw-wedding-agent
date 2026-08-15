#!/usr/bin/env python3
# Crea el template WhatsApp save_the_date_v5_img con botones URL dinámicos (?phone={{4}})
# para prellenar el RSVP por teléfono. Sube foto via Resumable Upload API.
import json, os, urllib.request, urllib.parse, sys

APP_ID = "1590375222487560"
APP_SECRET = "9f2ac26c72733fd7a771b6b858cad3de"
WABA_ID = "1004041115557689"
SYS_TOKEN = "EAAWmcBYyKggBSEdaao2xOu7njOAlE5feG4faF7hWZAGZATZCsUHAfFm8rLgPwewZCBZBe55OIZAb2WxEbLn0h8wztnmzTbjuaK2ZCnLORUWmVBEXmPrwEPcHjKBh9ND9cJPDRpcm04pU2VY7ZBbW4vZCPG0Ck9fyFuU00agBGIWZBENaDaabEGQy8ILEhgnI9AUzjssQZDZD"
VERSION = "v22.0"
PHOTO = os.path.join(os.path.dirname(__file__), "..", "site", "assets", "foto-pareja.jpg")

def req(url, method="GET", data=None, headers=None, token=None):
    h = {"Content-Type": "application/json"}
    if headers: h.update(headers)
    if token: h["Authorization"] = f"Bearer {token}"
    body = None
    if data is not None:
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
    r = urllib.request.Request(url, method=method, data=body, headers=h)
    with urllib.request.urlopen(r, timeout=60) as resp:
        raw = resp.read()
        return json.loads(raw.decode()) if raw else {}

# 1. App token (client credentials)
at = req(
    f"https://graph.facebook.com/oauth/access_token?grant_type=client_credentials&client_id={APP_ID}&client_secret={APP_SECRET}"
)["access_token"]
print("1. App token OK")

# 2. Sesión de upload
size = os.path.getsize(PHOTO)
up = req(
    f"https://graph.facebook.com/{VERSION}/{APP_ID}/uploads?file_name=foto-pareja.jpg&file_length={size}&file_type=image/jpeg",
    method="POST", token=at,
)
session_id = up["id"]
print(f"2. Upload session: {session_id}")

# 3. Subir bytes crudos
with open(PHOTO, "rb") as f:
    raw = f.read()
r = urllib.request.Request(
    f"https://graph.facebook.com/{VERSION}/{session_id}",
    method="POST", data=raw,
    headers={"Authorization": f"OAuth {at}", "Content-Type": "image/jpeg", "file_offset": "0"},
)
with urllib.request.urlopen(r, timeout=60) as resp:
    handle = json.loads(resp.read().decode())["h"]
print(f"3. Header handle: {handle}")

# 4. Crear template
payload = {
    "name": "save_the_date_v5_img",
    "category": "MARKETING",
    "language": "es",
    "components": [
        {
            "type": "HEADER",
            "format": "IMAGE",
            "example": {"header_handle": [handle]},
        },
        {
            "type": "BODY",
            "text": "Nos casamos el {{1}} de {{2}} de {{3}}. Reserva la fecha y confirma tu asistencia tocando un boton:",
            "example": {"body_text": [["17", "noviembre", "2026"]]},
        },
        {
            "type": "BUTTONS",
            "buttons": [
                {
                    "type": "URL",
                    "text": "Confirmar asistencia",
                    "url": "https://alejandro-kuilen.noscasamos.vip/rsvp.html?phone={{1}}",
                    "example": ["https://alejandro-kuilen.noscasamos.vip/rsvp.html?phone=56912345678"],
                },
                {
                    "type": "URL",
                    "text": "No podre asistir",
                    "url": "https://alejandro-kuilen.noscasamos.vip/no-confirmado.html?phone={{1}}",
                    "example": ["https://alejandro-kuilen.noscasamos.vip/no-confirmado.html?phone=56912345678"],
                },
            ],
        },
    ],
}

try:
    res = req(
        f"https://graph.facebook.com/{VERSION}/{WABA_ID}/message_templates",
        method="POST", data=payload, token=SYS_TOKEN,
    )
    print("4. TEMPLATE CREADO:")
    print(json.dumps(res, ensure_ascii=False, indent=2))
except urllib.error.HTTPError as e:
    print(f"4. ERROR HTTP {e.code}:")
    print(e.read().decode())
    sys.exit(1)
