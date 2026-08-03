#!/usr/bin/env python3
"""Check de encoding para el micrositio — BOM + mojibake.

Uso:
    python scripts/check_encoding.py [directorio]
    (default: site/)

Corre antes de subir al servidor. Falla (exit 1) si algún archivo tiene
BOM o caracteres mojibake. Reglas documentadas en docs/DIAGNOSTICO-ENCODING-SITIO-2026-08-03.md
"""
import os, re, sys

DEFAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "site")

MOJIBAKE = re.compile(r"Ã|â€|Â|�|\ufffd")
BOM_BYTES = b"\xef\xbb\xbf"

def check_file(path):
    problems = []
    with open(path, "rb") as f:
        raw = f.read()
    if raw.startswith(BOM_BYTES):
        problems.append("BOM (EF BB BF)")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        problems.append(f"UTF-8 decode error: {e}")
        return problems
    m = MOJIBAKE.search(text)
    if m:
        problems.append(f"mojibake ({m.group(0)!r})")
    return problems

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DIR
    target = os.path.abspath(target)
    if not os.path.isdir(target):
        print(f"ERROR: {target} no es un directorio"); return 2

    failures = 0
    for root, _dirs, files in os.walk(target):
        for fn in sorted(files):
            if not fn.lower().endswith((".html", ".css", ".js")):
                continue
            path = os.path.join(root, fn)
            probs = check_file(path)
            rel = os.path.relpath(path, target)
            if probs:
                failures += 1
                print(f"FAIL  {rel}: {'; '.join(probs)}")
            else:
                print(f"OK    {rel}")

    if failures:
        print(f"\n[FAIL] {failures} archivo(s) con problemas de encoding. NO subir.")
        return 1
    print("\n[OK] Encoding OK - listo para subir.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
