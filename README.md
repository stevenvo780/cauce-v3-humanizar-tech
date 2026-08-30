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

## Métricas de uso

Las tres webs de Humanizar (`humanizar.tech`, `catalogo.humanizar.tech` y
`agenda.humanizar.tech`) reportan su uso a un único endpoint alojado en este
proyecto. No hay dependencias externas, ni cookies, ni analítica de terceros.

### Qué se mide

| Evento | Cuándo se dispara |
| --- | --- |
| `pageview` | Al cargar la página. |
| `card_click` | Click en una tarjeta del catálogo o en cualquier CTA con `data-demo` / `data-track`. |
| `form_submit` | Envío del formulario de la agenda o del de contacto del catálogo. |
| `page_time` | Al ocultar o abandonar la pestaña, con los milisegundos de permanencia. |

### Qué NO se guarda

Ni IP, ni user-agent, ni cookies, ni nada que identifique a una persona. El
identificador de sesión es un valor aleatorio en `sessionStorage` que muere al
cerrar la pestaña y solo sirve para no contar cinco veces al mismo visitante.
Del referente se guarda el dominio, nunca la URL completa. Se respeta
`Do Not Track`: si el navegador lo activa, no se envía absolutamente nada.

### Cómo se instala en un sitio

Una sola línea, antes de `</body>`:

```html
<script src="https://humanizar.tech/track.js" defer></script>
```

El script deduce el endpoint de su propia URL, así que la misma línea sirve en
los tres dominios y no hay nada que configurar. En `catalogo` y `agenda`, que
son proyectos de Vercel distintos, hace falta además que su cabecera
`Content-Security-Policy` permita el destino:

```
connect-src 'self' https://humanizar.tech;
```

Sin eso el navegador bloquea el envío en silencio.

### Dónde se guardan los datos

En Postgres, tabla `track_events` (esquema en `db/schema.sql`). El proyecto de
Vercel necesita dos variables de entorno:

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión de Postgres. Pensado para el plan gratuito de Neon. |
| `PANEL_TOKEN` | Clave para leer el panel. Cadena larga y aleatoria. |

Sin `DATABASE_URL` el endpoint responde `503 sin_DATABASE_URL` y no se pierde
nada más que la medición: las páginas siguen funcionando igual porque el
cliente ignora los errores de envío.

Para crear la tabla:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

### Panel

`https://humanizar.tech/panel` — pide el token y muestra, por sitio: vistas,
sesiones, clicks por tarjeta, envíos de formulario, tiempo medio y la serie por
día. Lee de `/api/stats`, que exige el mismo token y compara en tiempo
constante. La página lleva `noindex`.

### Verificación

```bash
node smoke-track.mjs          # endpoint y consultas contra Postgres embebido
node track-browser-check.mjs  # track.js en Chrome headless, cross-origin real
```

`smoke-track.mjs` levanta un Postgres en memoria (PGlite), aplica el esquema y
ejercita `/api/track` y `/api/stats` de punta a punta: validación de entrada,
CORS, cuerpos de `sendBeacon`, recortes y agregados.

`track-browser-check.mjs` sirve las páginas en un origen y el endpoint en otro
—como queda en producción— y comprueba en un Chrome de verdad que llegan los
cuatro eventos con sus etiquetas y que **no se dispara ningún preflight de
CORS**, que es lo que rompería `sendBeacon` y haría perder el tiempo en página.

Ambos necesitan las dependencias de desarrollo:

```bash
npm install && npm install --no-save @electric-sql/pglite
```
