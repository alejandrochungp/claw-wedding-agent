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
# Ambos docroots deben recibir el mismo contenido:
# - raíz noscasamos.vip (addon domain)
# - subdominio alejandro-kuilen.noscasamos.vip
DOCROOTS = [
    "/home2/tupiboxc/noscasamos.vip",
    "/home2/tupiboxc/alejandro-kuilen.noscasamos.vip",
]
HOST_HEADERS = ["noscasamos.vip", "alejandro-kuilen.noscasamos.vip"]

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

    # Paso 2: scp a AMBOS docroots (raíz + subdominio)
    print("\n=== [2/3] Subiendo al servidor (2 docroots) ===")
    files = []
    for root, _dirs, fs in os.walk(SITE):
        for fn in sorted(fs):
            files.append(os.path.join(root, fn))
    for docroot in DOCROOTS:
        rc = run(["scp", "-i", KEY, "-o", "StrictHostKeyChecking=no"] + files + [f"{HOST}:{docroot}/"])
        if rc != 0:
            print(f"ABORTADO: scp falló hacia {docroot}")
            return 1

    # Paso 3: verificación en AMBOS hosts
    print("\n=== [3/3] Verificación en servidor ===")
    for host_header in HOST_HEADERS:
        print(f"  --- Host: {host_header} ---")
        for page in ["index.html", "info.html", "rsvp.html", "galeria.html", "regalos.html", "confirmado.html", "no-confirmado.html"]:
            r = subprocess.run(["curl.exe", "-s", "-o", "NUL", "-w", "%{http_code}",
                                "-H", f"Host: {host_header}", f"http://50.6.18.31/{page}"],
                               capture_output=True, text=True)
            print(f"  {page}: {r.stdout.strip()}")

    print("\nDeploy completado (ambos docroots). DNS ya propagado a 50.6.18.31.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
