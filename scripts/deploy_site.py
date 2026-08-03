#!/usr/bin/env python3
"""Deploy del micrositio a Bluehost con check de encoding automático.

Flujo:
1. Corre scripts/check_encoding.py sobre site/ (aborta si hay BOM/mojibake)
2. scp de los archivos al docroot del subdominio
3. Verifica con curl que el servidor responde 200 y los caracteres están bien

Uso: python scripts/deploy_site.py
Reglas de encoding: docs/DIAGNOSTICO-ENCODING-SITIO-2026-08-03.md
"""
import os, subprocess, sys

WS = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))  # projects/wedding-planner
SITE = os.path.join(WS, "site")
KEY = os.path.join(os.path.dirname(os.path.dirname(WS)), ".secrets", "bluehost_tupibox_key")  # workspace/.secrets
HOST = "tupiboxc@50.6.18.31"
DOCROOT = "/home2/tupiboxc/alejandro-kuilen.noscasamos.vip"
HOST_HEADER = "alejandro-kuilen.noscasamos.vip"

def run(cmd):
    print(">", " ".join(cmd))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout.strip():
        print(r.stdout.strip()[:500])
    if r.returncode != 0:
        print(r.stderr.strip()[:500])
    return r.returncode

def main():
    # Paso 1: check de encoding (aborta si falla)
    print("=== [1/3] Check de encoding ===")
    rc = run([sys.executable, os.path.join(WS, "scripts", "check_encoding.py"), SITE])
    if rc != 0:
        print("ABORTADO: hay archivos con problemas de encoding. Corregir antes de subir.")
        return 1

    # Paso 2: scp
    print("\n=== [2/3] Subiendo al servidor ===")
    files = []
    for root, _dirs, fs in os.walk(SITE):
        for fn in sorted(fs):
            files.append(os.path.join(root, fn))
    rc = run(["scp", "-i", KEY, "-o", "StrictHostKeyChecking=no"] + files + [f"{HOST}:{DOCROOT}/"])
    if rc != 0:
        print("ABORTADO: scp falló.")
        return 1

    # Paso 3: verificación
    print("\n=== [3/3] Verificación en servidor ===")
    for page in ["index.html", "info.html", "rsvp.html", "galeria.html", "regalos.html", "confirmado.html", "no-confirmado.html"]:
        r = subprocess.run(["curl.exe", "-s", "-o", "NUL", "-w", "%{http_code}",
                            "-H", f"Host: {HOST_HEADER}", f"http://50.6.18.31/{page}"],
                           capture_output=True, text=True)
        print(f"  {page}: {r.stdout.strip()}")

    print("\nDeploy completado. Recordar: DNS aún puede estar propagando (24-48h).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
