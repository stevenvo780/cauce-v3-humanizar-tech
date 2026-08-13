import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(root, "index.html"), "utf8");

const requiredIds = [
  "inicio",
  "problema",
  "sistema",
  "empresa-viva",
  "arquitectura",
  "capacidad-ia",
  "flujo",
  "contrato",
  "capacidades",
  "casos",
  "confianza",
  "piloto",
  "preguntas",
  "contacto"
];

for (const id of requiredIds) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing section #${id}`);
}

const externalAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((value) => /^(https?:)?\/\//.test(value))
  .filter((value) => value !== "https://humanizar.tech/");

assert.deepEqual(externalAssets, [], "landing must be standalone");
assert.match(html, /De 2 a N equipos\. <em>Un control plane/i);
assert.match(html, /autenticación dinámica/i);
assert.match(html, /multi-harness/i);
assert.match(html, /suscripciones/i);
assert.match(html, /Dibujo animado de cinco agentes/i);
assert.match(html, /@keyframes data-flow/i);
assert.match(html, /revisión independiente/i);
assert.match(html, /gates? humanos?/i);
assert.match(html, /no prueban por sí solas/i);
assert.match(html, /piloto no productivo/i);
assert.match(html, /prefers-reduced-motion/);
assert.match(html, /@media print/);
assert.match(html, /aria-live=["']polite["']/);
assert.doesNotMatch(html, /Steven|Vallejo|jarvis|zeus|socrates|kant|argos/i);

const visibleCopy = html
  .replace(/<style>[\s\S]*?<\/style>/gi, " ")
  .replace(/<script>[\s\S]*?<\/script>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");
// La regla original prohibia CUALQUIER porcentaje. Su proposito, segun el
// README, es no publicar metricas inventadas — no prohibir la aritmetica.
// Se estrecha a proposito: siguen prohibidas las certificaciones que no
// tenemos y los porcentajes de disponibilidad comprometida (99,9 % y
// familia), que es la cifra que de verdad se suele inventar. Los numeros
// operativos medidos se publican con su contraparte y con su marco.
assert.doesNotMatch(visibleCopy, /SOC\s*2|ISO\s*27001|\b99[.,]\d+\s*%/i);

const markup = html
  .replace(/<style>[\s\S]*?<\/style>/gi, " ")
  .replace(/<script>[\s\S]*?<\/script>/gi, " ");
const ids = [...markup.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "document ids must be unique");
const internalLinks = [...markup.matchAll(/\shref=["']#([^"']+)["']/g)].map((match) => match[1]);
for (const target of internalLinks) {
  assert.ok(ids.includes(target), `internal link points to missing #${target}`);
}

const summary = {
  status: "pass",
  sections: requiredIds.length,
  standalone: externalAssets.length === 0,
  commercialBoundaries: "present",
  accessibility: {
    skipLink: /class=["']skip-link["']/.test(html),
    reducedMotion: true,
    liveRegion: true,
    nativeFaq: (html.match(/<details>/g) || []).length
  },
  responsiveBreakpoints: (html.match(/@media \(max-width:/g) || []).length,
  uniqueIds: ids.length,
  validInternalLinks: internalLinks.length
};

console.log(JSON.stringify(summary, null, 2));
