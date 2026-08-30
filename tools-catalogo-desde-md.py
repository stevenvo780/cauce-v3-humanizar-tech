#!/usr/bin/env python3
"""Extrae los productos del catalogo Mouseion desde el markdown a JSON."""
import json, re, sys, unicodedata

def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", t.lower())).strip("-")

txt = open(sys.argv[1], encoding="utf-8").read()
productos, seccion = [], None
for linea in txt.splitlines():
    if linea.startswith("## "):
        seccion = linea[3:].strip(); continue
    if not linea.startswith("|") or linea.startswith("|---") or "| Producto |" in linea:
        continue
    if not seccion or "Mouse" not in seccion:
        continue
    c = [x.strip() for x in linea.strip("|").split("|")]
    if len(c) < 9: continue
    nombre = re.sub(r"\*\*", "", c[0]).strip()
    m = re.search(r"\[([^\]]+)\]\(([^)]+)\)", c[1])
    url = m.group(2) if m else None
    http = c[2]
    estado = ("broken" if "🔴" in http or "🔴" in c[-1] else
              "stale" if "🟡" in http else
              "live" if "200" in http else "unknown")
    theme = None
    tm = re.search(r"theme\s*`(#[0-9a-fA-F]{3,8})`", c[-1])
    if tm: theme = tm.group(1)
    productos.append({
        "nombre": nombre, "slug": slug(nombre), "url": url, "http": http,
        "stack": c[3], "idioma": c[4], "repo": c[5].strip("`") or None,
        "vercel": c[7].strip("`") or None, "estado": estado,
        "themeColor": theme, "notas": c[-1],
    })
json.dump(productos, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"  productos extraidos: {len(productos)}")
print(f"  con URL publica    : {sum(1 for p in productos if p['url'])}")
for e in ("live","stale","broken","unknown"):
    n=sum(1 for p in productos if p["estado"]==e)
    if n: print(f"    {e}: {n}")
