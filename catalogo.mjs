// catalogo.mjs — renderiza el catálogo Mouseîon desde catalogo.json.
//
// 2026-08-30 (kant, por encargo de argos). El encargo pedía "componente Next.js", pero este
// repositorio NO es Next.js: es un sitio estático (index.html + módulos .mjs, sin package.json
// ni build). Se implementa lo equivalente en la tecnología real del repo, respetando sus
// variables CSS (--ink, --marigold, --hairline…) y sus clases (wrap, card, kicker, tag).
//
// Fuente de datos: catalogo.json, que se regenera desde catalogo.fuente.md con
//   python3 tools-catalogo-desde-md.py catalogo.fuente.md catalogo.json
// Así el fichero markdown sigue siendo la fuente de verdad editable a mano.

const ESTADOS = {
  live:    { etiqueta: 'Live',    color: 'var(--ok)',       titulo: 'HTTP 200, la página carga' },
  stale:   { etiqueta: 'Stale',   color: 'var(--marigold)', titulo: 'Responde, pero sin cambios en 30+ días' },
  broken:  { etiqueta: 'Broken',  color: 'var(--alert)',    titulo: 'HTTP 4xx/5xx, requiere arreglo' },
  unknown: { etiqueta: 'Privado', color: 'var(--on-ink-dim)', titulo: 'Existe pero no es accesible públicamente' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function tarjeta(p) {
  const st = ESTADOS[p.estado] ?? ESTADOS.unknown;
  // El theme-color del producto tiñe su borde: identifica la marca de un vistazo.
  const borde = p.themeColor ? `border-color:${esc(p.themeColor)}` : '';
  const media = p.ogLocal
    ? `<img class="cat-img" src="${esc(p.ogLocal)}" alt="Vista previa de ${esc(p.nombre)}"
             loading="lazy" decoding="async" width="1200" height="630">`
    // Sin og:image: en vez de un hueco, un lienzo con el color del producto. Y se marca,
    // porque que falte og:image es un dato que hay que ver, no que esconder.
    : `<div class="cat-img cat-img-vacia" style="background:${esc(p.themeColor || 'var(--ink)')}"
             role="img" aria-label="${esc(p.nombre)} no publica og:image">
         <span>sin og:image</span>
       </div>`;
  const enlace = p.url
    ? `<a class="cat-url" href="${esc(p.url)}" rel="noopener noreferrer" target="_blank">${esc(new URL(p.url).host)}</a>`
    : `<span class="cat-url cat-url-off">interno</span>`;
  return `
    <article class="card cat-card" style="${borde}" data-estado="${esc(p.estado)}" data-slug="${esc(p.slug)}">
      ${media}
      <div class="cat-cuerpo">
        <div class="cat-head">
          <h3 class="h-m">${esc(p.nombre)}</h3>
          <span class="tag cat-estado" style="color:${st.color};border-color:${st.color}"
                title="${esc(st.titulo)}">${esc(st.etiqueta)}</span>
        </div>
        ${enlace}
        <p class="cat-meta">
          ${p.stack ? `<span class="tag">${esc(p.stack)}</span>` : ''}
          ${p.repo ? `<span class="tag">${esc(p.repo)}</span>` : ''}
          ${p.themeColor ? `<span class="tag cat-swatch"><i style="background:${esc(p.themeColor)}"></i>${esc(p.themeColor)}</span>` : ''}
        </p>
      </div>
    </article>`;
}

export function renderCatalogo(productos, contenedor) {
  if (!contenedor) return 0;
  const orden = { live: 0, stale: 1, broken: 2, unknown: 3 };
  const lista = [...productos].sort(
    (a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || a.nombre.localeCompare(b.nombre, 'es'));
  const cuenta = lista.reduce((acc, p) => (acc[p.estado] = (acc[p.estado] || 0) + 1, acc), {});
  contenedor.innerHTML = `
    <p class="kicker cat-resumen">${lista.length} productos ·
      ${Object.entries(cuenta).map(([e, n]) => `${n} ${ESTADOS[e]?.etiqueta ?? e}`).join(' · ')}</p>
    <div class="cat-grid">${lista.map(tarjeta).join('')}</div>`;
  return lista.length;
}

export async function montarCatalogo(selector = '#catalogo-mouseion', fuente = 'catalogo.json') {
  const contenedor = document.querySelector(selector);
  if (!contenedor) return 0;
  try {
    // cache:'no-store' para que al recargar tras editar el JSON se vea el cambio al instante.
    const r = await fetch(fuente, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return renderCatalogo(await r.json(), contenedor);
  } catch (e) {
    contenedor.innerHTML = `<p class="lede">No se pudo cargar el catálogo: ${esc(e.message)}</p>`;
    return 0;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => { montarCatalogo(); });
}
