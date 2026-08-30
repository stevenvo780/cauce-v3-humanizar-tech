# Patch pendiente para el catálogo (no está en este repo)

`catalogo.humanizar.tech` se publica desde el proyecto Vercel `web-humanizar-mine`, que
no es de este lote. Este archivo deja escrito el cambio para que quien tenga ese repo lo
aplique sin volver a investigar.

## El problema, medido el 2026-08-30 a las 22:5x UTC

El catálogo **no captura ni un lead**. Tiene 21 tarjetas de producto y las 21 tienen el
mismo botón principal:

```html
<a class="btn btn-primary btn-sm" data-demo="Deméter" href="#contacto">Solicitar demostración</a>
```

`#contacto` no es un formulario de contacto: es un generador de texto. Su propia nota lo
dice — *"Esta página no envía nada a ningún servidor: te prepara el texto y lo copia."*
El visitante que aprieta "Solicitar demostración" termina con un párrafo en el
portapapeles y la tarea de encontrar a quién mandárselo. Ahí se pierde la intención.

El único enlace real a la agenda es un `<a class="link">Ver Agenda</a>` secundario, y
está dentro de la tarjeta del producto "Agenda demos" — o sea, se ofrece la agenda como
producto a vender, no como forma de reservar.

## El cambio

Apuntar los 21 CTA a la agenda, arrastrando el producto elegido. Como los nombres ya
están en `data-demo`, no hace falta editar 21 líneas a mano:

```js
document.querySelectorAll('a[data-demo][href="#contacto"]').forEach(function (a) {
  a.href = "https://agenda.humanizar.tech/?producto=" + encodeURIComponent(a.dataset.demo);
  a.rel = "noopener";
});
```

La agenda ya sabe recibirlo: `app.js` lee `?producto=`, traduce los alias
(`Cauce / Humanizar` → `Cauce V3`) y, si el producto del catálogo no tiene opción propia
(`Koinonía`, `Nómos`, `Apothḗke`, `Prometeo`…), deja el select en "Otro / no sé" y
escribe `Me interesa: <producto>` en la nota. Así no se pierde qué vino a ver.

Conviene además dejar el generador de brief como salida secundaria, no como principal:
sirve para quien quiere mandar el texto por su cuenta, pero no debería ser lo que recibe
el clic de mayor intención.

## Por qué esto mueve la aguja

Es el arreglo más barato de todo el embudo. Hoy el tramo catálogo → agenda tiene una
conversión estructuralmente igual a cero: no existe el camino. Cualquier número mayor que
cero es ganancia, y el cambio son cinco líneas sin backend nuevo.
