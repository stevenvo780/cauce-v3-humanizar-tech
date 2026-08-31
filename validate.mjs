import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(root, "index.html"), "utf8");
const alternate = await readFile(resolve(root, "cauce-v3.html"), "utf8");
const robots = await readFile(resolve(root, "robots.txt"), "utf8");
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");

assert.equal(alternate, html, "index.html and cauce-v3.html must stay byte-identical");
assert.match(html, /<html lang="es-CO"/);
assert.equal((html.match(/<h1\b/g) || []).length, 1, "the page needs one h1");
assert.match(html, /<link rel="canonical" href="https:\/\/humanizar\.tech\/"/);
assert.match(html, /name="robots" content="index,follow,max-image-preview:large/);
assert.match(html, /property="og:image" content="https:\/\/humanizar\.tech\/og-cauce-v3\.png"/);
assert.match(html, /name="twitter:card" content="summary_large_image"/);

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, "JSON-LD is required");
const jsonLd = JSON.parse(jsonLdMatch[1]);
const types = jsonLd["@graph"].map((item) => item["@type"]);
for (const required of ["Organization", "WebSite", "SoftwareApplication", "BreadcrumbList", "FAQPage", "Service"]) {
  assert.ok(types.includes(required), `JSON-LD must include ${required}`);
}
const org = jsonLd["@graph"].find((item) => item["@type"] === "Organization");
assert.ok(Array.isArray(org.sameAs) && org.sameAs.length >= 4, "Organization must link to connected systems via sameAs");
const faq = jsonLd["@graph"].find((item) => item["@type"] === "FAQPage");
assert.ok(Array.isArray(faq.mainEntity) && faq.mainEntity.length >= 3, "FAQPage must have at least three questions");
const service = jsonLd["@graph"].find((item) => item["@type"] === "Service");
assert.ok(service.provider && service.provider["@id"], "Service must be linked to Organization");

for (const claim of [
  "PostgreSQL · única fuente durable",
  "Adapter SDK · consumidor durable por alias",
  "Dispatcher · segador de reintentos",
  "Claude Code · Codex · OpenClaw",
  "claim_token + epoch",
  "14",
  "4",
  "3"
]) assert.ok(html.includes(claim), `missing architectural claim: ${claim}`);

for (const falseClaim of [
  /Gateway · OpenClaw/i,
  /el bus Cauce V3 despacha/i,
  /Telegram, Slack, WhatsApp/i,
  /un pod por tenant/i,
  /15<\/span><small>agentes/i,
  /5<\/span><small>tenants/i,
  /cero coste ocioso/i,
  /entrega garantizada/i
]) assert.doesNotMatch(html, falseClaim, `stale or false claim remains: ${falseClaim}`);

for (const url of [
  "https://wa.me/573046374368",
  "https://agenda.humanizar.tech/?producto=Cauce%20V3",
  "https://catalogo.humanizar.tech/",
  "https://stevenvallejo.com/",
  "https://praxis.stevenvallejo.com/",
  "https://xenia.stevenvallejo.com/",
  "https://sigre.elenxos.com/",
  "https://devkits.humanizar.tech/",
  "https://aletheia.humanizar.tech/",
  "https://humanizar-dev.cloud/"
]) assert.ok(html.includes(url), `missing connected-system link: ${url}`);

assert.match(html, /id="copy-brief"/);
assert.match(html, /BRIEF INICIAL · CAUCE V3/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /prefers-reduced-motion/);

const markup = html
  .replace(/<style>[\s\S]*?<\/style>/gi, " ")
  .replace(/<script[\s\S]*?<\/script>/gi, " ");
const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "document ids must be unique");
for (const target of [...markup.matchAll(/\shref="#([^"]+)"/g)].map((match) => match[1])) {
  assert.ok(ids.includes(target), `internal link points to missing #${target}`);
}

assert.equal((html.match(/<section class="slide/g) || []).length, 13, "deck must have thirteen slides");
assert.match(html, /id="protocolo"/, "deck must include a Protocolo slide");
assert.match(html, /data-title="Casos de uso"/, "deck must include a Casos de uso slide");
assert.match(html, /data-title="C\u00f3mo empezar"/, "deck must include a C\u00f3mo empezar slide");
assert.match(robots, /Sitemap: https:\/\/humanizar\.tech\/sitemap\.xml/);
for (const loc of [
  "https://humanizar.tech/",
  "https://humanizar.tech/cauce-v3",
  "https://praxis.stevenvallejo.com/",
  "https://stevenvallejo.com/",
  "https://catalogo.humanizar.tech/",
  "https://agenda.humanizar.tech/",
  "https://xenia.stevenvallejo.com/",
  "https://sigre.elenxos.com/",
  "https://devkits.humanizar.tech/",
  "https://aletheia.humanizar.tech/",
  "https://humanizar-dev.cloud/"
]) assert.ok(sitemap.includes(`<loc>${loc}</loc>`), `sitemap missing entry: ${loc}`);

console.log(JSON.stringify({
  status: "pass",
  slides: 13,
  architecture: "source-backed (HTTP in, WebSocket pull, dispatcher only sweeps abandoned claims)",
  hasProtocolo: /id="protocolo"/.test(html),
  hasCasos: /data-title="Casos de uso"/.test(html),
  hasOferta: /data-title="C\u00f3mo empezar"/.test(html),
  hasArquitecturaCorregida: /HTTP entra, PostgreSQL persiste/.test(html),
  connectedSystems: 10,
  seo: ["canonical", "hreflang", "Open Graph", "Twitter Card", "JSON-LD Organization/WebSite/SoftwareApplication/BreadcrumbList/FAQPage/Service", "robots", "sitemap", "sameAs"],
  uniqueIds: ids.length
}, null, 2));
