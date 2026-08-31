# Presentación comercial Cauce V3

Deck estático y autocontenido para explicar Cauce V3 con la arquitectura real
del sistema: gateway HTTP/WS, PostgreSQL como fuente durable, adaptadores que
reclaman entregas con fencing, tres harnesses interoperables y plano de terminal.

Incluye CTA directo a WhatsApp, agenda y catálogo; también recupera el brief
copiable de la versión anterior. La interacción respeta
`prefers-reduced-motion` y no carga scripts externos.

## Abrir

Abrí `index.html` directamente en un navegador o serví la carpeta con cualquier
servidor estático local.

```bash
python3 -m http.server 4173
```

## Alcance comercial

- No contiene precios, logos, certificaciones ni casos de éxito inventados.
- Los conteos de flota salen del inventario canónico documentado en `cauce-v3`.
- No presenta como activos canales o proveedores que el bus no integra hoy.
- El CTA copia un brief inicial localmente; no envía información a un servicio.
- SEO: canonical, hreflang, Open Graph, Twitter Card, JSON-LD, robots y sitemap.
- Despliegue público autorizado el 2026-08-05 en `https://humanizar.tech/` y
  `https://www.humanizar.tech/`.
- `vercel.json` aplica cabeceras de seguridad para la publicación estática.

## Producción

- Proyecto Vercel: `cauce-v3-humanizar-tech`
- Dominio canónico: `https://humanizar.tech/`
- Alias alternativo: `https://www.humanizar.tech/`
- DNS: Hostinger; apex con los dos targets A indicados por Vercel y `www` con
  su CNAME específico. Los registros no web se preservaron.

## Verificación

```bash
node validate.mjs
node interaction-check.mjs
```

La revisión visual se puede hacer en desktop y móvil con un navegador moderno.

## Dónde está desplegado

Producción: <https://humanizar.tech>

El proyecto de Vercel (`cauce-v3-humanizar-tech`) está conectado a este
repositorio, así que **un push a `main` despliega solo**. No hay paso manual, y
por lo tanto no existe el estado intermedio de "mergeado pero no publicado":
lo que está en `main` es lo que sirve el dominio.

Para comprobarlo desde fuera, sin acceso a la cuenta, basta comparar el fichero
publicado aquí con el que devuelve el dominio:

```sh
diff <(curl -s https://raw.githubusercontent.com/stevenvo780/cauce-v3-humanizar-tech/main/index.html) \
     <(curl -s https://humanizar.tech/)
```

Sin salida = producción coincide con `main`.
