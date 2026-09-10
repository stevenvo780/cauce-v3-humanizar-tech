# El catálogo ya no vive en este repo (kant, 2026-09-10)

`catalogo.humanizar.tech` lo sirve el proyecto de Vercel **`humanizar-catalogo`**, repo
`stevenvo780/humanizar-catalogo`. Ahí viven ahora **los tres**: la página, el `catalogo.json`
que se publica y el registro `catalogo.fuente.md` con su histórico.

## Por qué se retiró de aquí, medido y no supuesto

Este repo tenía una copia completa —`catalogo.json`, `catalogo.html`, `catalogo.mjs` y su
recargador de desarrollo— y **ninguna era alcanzable**:

```
  cauce.humanizar.tech/catalogo.html   308 -> /catalogo
  cauce.humanizar.tech/catalogo        301 -> https://catalogo.humanizar.tech/
```

Los `redirects` de `vercel.json` se evalúan **antes** que el sistema de ficheros, así que la
página quedaba tapada por su propia redirección. Lo único que seguía saliendo era el fichero
crudo en `/catalogo.json`, que no enlazaba nadie y que servía datos **viejos**: el 2026-09-10 una
corrección se aplicó a esta copia y el catálogo público siguió cuatro días mostrando la versión
anterior.

## Qué se conserva

Los dos `redirects` de `vercel.json` (`/catalogo` y `/catalogo.html` → `catalogo.humanizar.tech`).
**No los quites:** son lo que mantiene una sola página de catálogo.

## Reversa

`git revert` de este commit devuelve los ficheros. Pero antes de hacerlo, mirá si el problema que
querés resolver no es en realidad que la copia buena está en el otro repo.
