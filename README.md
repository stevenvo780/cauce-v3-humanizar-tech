# Landing comercial Cauce V3

Landing estática y autocontenida para presentar Cauce V3 como un sistema de
empresas de desarrollo hechas con agentes: de 2 a N equipos, con protocolos,
autenticación dinámica, suscripciones de IA, operación multi-harness,
observabilidad y gobierno desde un mismo control plane.

Incluye una escena animada y responsive con cinco agentes colaborando en un
flujo de objetivo, construcción, integración, revisión y entrega. La animación
respeta `prefers-reduced-motion` y no carga recursos externos.

## Abrir

Abrí `index.html` directamente en un navegador o serví la carpeta con cualquier
servidor estático local.

```bash
python3 -m http.server 4173
```

## Alcance comercial

- No contiene precios, logos ni casos de éxito inventados.
- Las métricas publicadas están **medidas contra la base de producción**, se
  presentan con su contraparte (entregas completadas junto a entregas muertas)
  y se declara explícitamente que son de la flota propia y no de una base de
  clientes. No se publican disponibilidad comprometida, número de clientes,
  horas ahorradas ni comparaciones contra hacerlo a mano.
- No promete compatibilidad universal, niveles de servicio ni certificaciones.
- El CTA copia un brief inicial; no envía información a ningún servicio.
- No usa dependencias, tipografías, scripts ni imágenes externas.
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
