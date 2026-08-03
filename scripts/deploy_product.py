#!/usr/bin/env python3
"""Deploy del sitio PRODUCTO (noscasamos.vip) al docroot raíz de Bluehost.

Arquitectura (docs/PRODUCTO-DOMINIO-WEB-METAAPP.md):
- noscasamos.vip (root)          = sitio PRODUCTO  → ESTE script
- {boda}.noscasamos.vip (subdom) = micrositio invitados → deploy_site.py

Flujo:
1. Corre scripts/check_encoding.py sobre product-site/ (aborta si hay BOM/mojibake)
2. scp de los archivos al docroot raíz
3. Verifica con curl que el servidor responde 200

Uso: python scripts/deploy_product.py
"""
import os, subprocess, sys

WS = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))  # projects/wedding-planner
SITE = os.path.join(WS, "product-site")
KEY = os.path.join(os.path.dirname(os.path.dirname(WS)), ".secrets", "bluehost_tupibox_key")  # workspace/.secrets
HOST = "tupiboxc@50.6.18.31"
DOCROOT = "/home2/tupiboxc/noscasamos.vip"
HOST_HEADER = "noscasamos.vip"

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

    # Paso 2: scp al docroot raíz
    print("\n=== [2/3] Subiendo al servidor (docroot raíz) ===")
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
    for page in ["index.html", "como-funciona.html", "precios.html", "contacto.html",
                 "css/style.css", "assets/hero.jpg"]:
        r = subprocess.run(["curl.exe", "-s", "-o", "NUL", "-w", "%{http_code}",
                            "-H", f"Host: {HOST_HEADER}", f"http://50.6.18.31/{page}"],
                           capture_output=True, text=True)
        print(f"  {page}: {r.stdout.strip()}")

    print("\nDeploy completado (sitio producto en noscasamos.vip).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
