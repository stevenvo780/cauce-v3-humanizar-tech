# agenda/ — fuente de agenda.humanizar.tech (v2)

## Leer esto antes de mergear

Estos archivos **no se despliegan desde este repo**. Van acá porque hoy el sitio
`agenda.humanizar.tech` no tiene repositorio: está publicado en el proyecto Vercel
`web-humanizar-agenda` (creado el 2026-08-30 19:23 UTC) **sin Git conectado**. Es decir,
lo que hay en producción no vive en ningún control de versiones. Esta carpeta es el
primer punto donde ese código existe versionado.

Si se mergea a `main` tal cual, Vercel va a republicar la landing `humanizar.tech` y
`humanizar.tech/agenda/` quedaría servida, pero **rota**, por dos razones:

1. El `vercel.json` de este repo declara `connect-src 'none'; form-action 'none'`.
   El form no podría hacer el `fetch` a `/api/booking`.
2. Este proyecto no tiene la función `/api/booking`. Vive en `web-humanizar-agenda`.

**Recomendación:** no mergear hasta que el dueño decida cuál es el repo fuente de la
agenda. Cuando lo decida, hay dos caminos limpios:

- **A (preferido):** crear el repo `web-humanizar-agenda`, mover ahí estos tres archivos
  junto con la función `api/booking`, y conectar el proyecto Vercel a ese repo.
- **B:** dejarlo en este monorepo, pero entonces hay que mover también `api/booking`,
  agregar un `rewrite` para el dominio `agenda.humanizar.tech` y **acotar el CSP**:
  `connect-src 'self'` y `form-action 'self'` para la ruta `/agenda/*`.

## Qué cambia respecto de lo que hoy está en producción

El contrato con el backend **no cambia**. El `POST /api/booking` sigue recibiendo
exactamente el mismo JSON, con los mismos ocho campos:
`nombre, email, empresa, telefono, producto, fecha, hora, nota`.
No hace falta tocar el servidor para publicar esta versión.

Los cambios son de fricción y de copy. Están explicados en el cuerpo del PR.

## Cómo probarlo local

```sh
cd agenda && python3 -m http.server 8080
```

El form va a fallar en el envío (no hay `/api/booking` local), pero se puede verificar
todo lo demás: generación de horarios, validación por campo, el botón de auto-elección
y el panel de confirmación.
