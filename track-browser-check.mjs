// Verificación de track.js en un navegador de verdad (Chrome headless, vía CDP).
// Sirve las páginas en un origen y el endpoint en OTRO, que es como queda en
// producción: catalogo/agenda cargan el script desde humanizar.tech. Así se
// comprueba que la petición es "simple" y no muere en el preflight de CORS.
//   node track-browser-check.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const trackJs = readFileSync(resolve(root, "track.js"), "utf8");
const recibidos = [];

const PAGINAS = {
  "/catalogo.html": (api) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Catálogo</title></head><body>
<ul class="grid">
  <li class="card"><div class="card-top"><h3>Xenía</h3></div>
    <div class="card-foot">
      <a class="btn btn-primary btn-sm" id="cta-xenia" data-demo="Xenía" href="#contacto">Solicitar demostración</a>
    </div></li>
  <li class="card"><div class="card-top"><h3>Deméter</h3></div>
    <div class="card-foot"><a class="link" id="link-demeter" href="#contacto">Ver más</a></div></li>
</ul>
<form class="demo-form" id="demo-form"><button type="submit">Enviar</button></form>
<script src="${api}/track.js"></script></body></html>`,

  "/agenda.html": (api) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Agenda</title></head><body>
<form id="booking">
  <select name="producto"><option value="Cauce V3" selected>Cauce V3</option></select>
  <button type="submit">Reservar</button>
</form>
<script src="${api}/track.js"></script></body></html>`,
};

function escuchar(servidor) {
  return new Promise((ok) => servidor.listen(0, "127.0.0.1", () => ok(servidor.address().port)));
}

const apiSrv = createServer((req, res) => {
  const origen = req.headers.origin;
  if (origen) {
    res.setHeader("Access-Control-Allow-Origin", origen);
    res.setHeader("Vary", "Origin");
  }
  if (req.url === "/track.js") {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.end(trackJs);
  }
  if (req.url === "/api/track" && req.method === "POST") {
    let cuerpo = "";
    req.on("data", (c) => (cuerpo += c));
    req.on("end", () => {
      try { recibidos.push(JSON.parse(cuerpo)); } catch { recibidos.push({ crudo: cuerpo }); }
      res.statusCode = 202;
      res.end("{}");
    });
    return;
  }
  // Cualquier preflight que llegue aquí significa que el diseño dejó de ser "simple".
  if (req.method === "OPTIONS") recibidos.push({ event: "__PREFLIGHT__", path: req.url });
  res.statusCode = 404;
  res.end();
});
const apiPort = await escuchar(apiSrv);
const API = `http://127.0.0.1:${apiPort}`;

const siteSrv = createServer((req, res) => {
  const pagina = PAGINAS[req.url];
  if (!pagina) { res.statusCode = 404; return res.end(); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(pagina(API));
});
const sitePort = await escuchar(siteSrv);
const SITE = `http://127.0.0.1:${sitePort}`;

const profile = await mkdtemp(join(tmpdir(), "hz-track-"));
const chrome = spawn("google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const browserWsUrl = await new Promise((ok, fail) => {
  const t = setTimeout(() => fail(new Error("Chrome DevTools endpoint timeout")), 15_000);
  chrome.stderr.setEncoding("utf8");
  chrome.stderr.on("data", (chunk) => {
    const m = chunk.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) { clearTimeout(t); ok(m[1]); }
  });
  chrome.once("exit", (c) => fail(new Error(`Chrome salió con ${c}`)));
});

const socket = new WebSocket(browserWsUrl);
await new Promise((ok, fail) => {
  socket.addEventListener("open", ok, { once: true });
  socket.addEventListener("error", fail, { once: true });
});

let nextId = 1;
const pending = new Map();
const pageErrors = [];
socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { ok, fail } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
  }
  if (msg.method === "Runtime.exceptionThrown") {
    pageErrors.push(msg.params.exceptionDetails.text);
  }
});
function send(method, params = {}, sessionId) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((ok, fail) => pending.set(id, { ok, fail }));
}
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Runtime.enable", {}, sessionId);
await send("Page.enable", {}, sessionId);

// --- Catálogo: vista, click en tarjeta con data-demo, click en enlace de tarjeta ---
await send("Page.navigate", { url: `${SITE}/catalogo.html` }, sessionId);
await esperar(600);
await send("Runtime.evaluate", {
  awaitPromise: true,
  expression: `(async () => {
    document.getElementById("cta-xenia").click();
    document.getElementById("link-demeter").click();
    document.getElementById("demo-form").addEventListener("submit", e => e.preventDefault());
    document.getElementById("demo-form").requestSubmit();
    await new Promise(r => setTimeout(r, 250));
  })()`,
}, sessionId);
await esperar(500);

// --- Agenda: vista y envío del formulario con el producto elegido ---
await send("Page.navigate", { url: `${SITE}/agenda.html` }, sessionId);
await esperar(600);
await send("Runtime.evaluate", {
  awaitPromise: true,
  expression: `(async () => {
    document.getElementById("booking").addEventListener("submit", e => e.preventDefault());
    document.getElementById("booking").requestSubmit();
    await new Promise(r => setTimeout(r, 250));
  })()`,
}, sessionId);
await esperar(400);

// Salir de la página dispara el envío del tiempo por sendBeacon.
await send("Page.navigate", { url: "about:blank" }, sessionId);
await esperar(900);

const de = (evento) => recibidos.filter((e) => e.event === evento);
const resumen = {
  total: recibidos.length,
  pageview: de("pageview").length,
  card_click: de("card_click").length,
  form_submit: de("form_submit").length,
  page_time: de("page_time").length,
  preflights: de("__PREFLIGHT__").length,
  etiquetas: de("card_click").map((e) => e.label),
  productos: de("form_submit").map((e) => e.label),
  tiempos_ms: de("page_time").map((e) => e.ms),
};

try {
  assert.equal(resumen.preflights, 0, "hubo preflight de CORS: sendBeacon se perdería en producción");
  assert.equal(resumen.pageview, 2, "una vista por página cargada");
  assert.equal(resumen.card_click, 2, "los dos clicks de tarjeta");
  assert.deepEqual(resumen.etiquetas, ["Xenía", "Deméter"], "etiqueta por data-demo y por el h3 de la tarjeta");
  assert.equal(resumen.form_submit, 2, "el form del catálogo y el de la agenda");
  assert.deepEqual(resumen.productos, ["demo-form", "Cauce V3"], "etiqueta por id y por el producto elegido");
  assert.ok(resumen.page_time >= 2, "tiempo en página al salir de cada una");
  assert.ok(resumen.tiempos_ms.every((ms) => Number.isInteger(ms) && ms >= 0), "milisegundos válidos");
  assert.ok(recibidos.every((e) => e.event === "__PREFLIGHT__" || (e.sid && e.site)), "todo evento lleva sesión y sitio");
  assert.deepEqual(pageErrors, [], "la página no lanzó errores");
  console.log(JSON.stringify({ status: "pass", ...resumen }, null, 2));
} finally {
  socket.close();
  const salida = chrome.exitCode === null
    ? new Promise((ok) => chrome.once("exit", ok))
    : Promise.resolve();
  chrome.kill("SIGTERM");
  await salida;
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  apiSrv.close();
  siteSrv.close();
}
