// Prueba de humo del endpoint de métricas contra un Postgres embebido (PGlite).
// Ejercita /api/track y /api/stats de punta a punta: validación, inserción y agregados.
//   node smoke-track.mjs
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const db = await PGlite.create();
await db.exec(readFileSync(new URL("./db/schema.sql", import.meta.url), "utf8"));

// El seam: _db.js hace `new pg.Pool(...)` de forma perezosa, así que basta con
// sustituir la clase en el módulo compartido antes de la primera llamada.
pg.Pool = class {
  async query(texto, params) {
    return db.query(texto, params);
  }
};
process.env.DATABASE_URL = "postgres://pglite";
process.env.PANEL_TOKEN = "token-de-prueba";

const { default: track } = await import("./api/track.js");
const { default: stats } = await import("./api/stats.js");

function resFalso() {
  const r = {
    code: 0,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    end() { return this; },
  };
  return r;
}

const ORIGEN = "https://catalogo.humanizar.tech";
let fallos = 0;

function chequear(nombre, ok, detalle) {
  console.log(`${ok ? "  ok  " : "FALLA "} ${nombre}${ok || !detalle ? "" : "  → " + detalle}`);
  if (!ok) fallos++;
}

async function postTrack(cuerpo, origen = ORIGEN, metodo = "POST") {
  const req = { method: metodo, headers: { origin: origen }, body: cuerpo };
  const res = resFalso();
  await track(req, res);
  return res;
}

console.log("\n/api/track — validación");
chequear("preflight OPTIONS responde 204", (await postTrack(null, ORIGEN, "OPTIONS")).code === 204);
chequear("GET responde 405", (await postTrack(null, ORIGEN, "GET")).code === 405);
chequear("cuerpo vacío responde 400", (await postTrack(null)).code === 400);
chequear("evento no permitido responde 400",
  (await postTrack({ event: "borrar_todo", sid: "s1" })).code === 400);
chequear("origen ajeno responde 400",
  (await postTrack({ event: "pageview", sid: "s1" }, "https://sitio-ajeno.example")).code === 400);
chequear("sin sesión responde 400", (await postTrack({ event: "pageview" })).code === 400);
{
  const res = await postTrack({ event: "pageview", sid: "s1" });
  chequear("CORS devuelve el origen permitido",
    res.headers["access-control-allow-origin"] === ORIGEN, JSON.stringify(res.headers));
}
chequear("cuerpo como texto plano (sendBeacon) se parsea",
  (await postTrack(JSON.stringify({ event: "pageview", sid: "beacon" }))).code === 202);

console.log("\n/api/track — inserción");
const eventos = [
  { event: "pageview", sid: "s1", path: "/" },
  { event: "pageview", sid: "s2", path: "/" },
  { event: "card_click", sid: "s1", label: "Xenía" },
  { event: "card_click", sid: "s2", label: "Xenía" },
  { event: "card_click", sid: "s2", label: "Deméter" },
  { event: "page_time", sid: "s1", ms: 30000 },
  { event: "page_time", sid: "s2", ms: 50000 },
];
for (const e of eventos) {
  const res = await postTrack(e);
  if (res.code !== 202) chequear(`insert ${e.event}`, false, JSON.stringify(res.body));
}
await postTrack({ event: "form_submit", sid: "s3", label: "Cauce V3" }, "https://agenda.humanizar.tech");
// 2 de la sección anterior (CORS + sendBeacon) + 7 del lote + 1 de la agenda.
chequear("los eventos válidos entraron todos",
  (await db.query("SELECT count(*)::int AS n FROM track_events")).rows[0].n === 10);

console.log("\n/api/track — saneado");
{
  await postTrack({ event: "pageview", sid: "x".repeat(200), label: "y".repeat(900), ms: -5 });
  const fila = (await db.query(
    "SELECT session_id, label, ms FROM track_events ORDER BY id DESC LIMIT 1")).rows[0];
  chequear("session_id se recorta a 40", fila.session_id.length === 40);
  chequear("ms negativo se normaliza a 0 o nulo", fila.ms === null || fila.ms === 0);
}

console.log("\n/api/stats");
async function getStats(query, header) {
  const req = { method: "GET", headers: header ? { "x-panel-token": header } : {}, query };
  const res = resFalso();
  await stats(req, res);
  return res;
}
chequear("sin token responde 401", (await getStats({})).code === 401);
chequear("token errado responde 401", (await getStats({ token: "nope" })).code === 401);
{
  const res = await getStats({ token: "token-de-prueba", dias: "30" });
  chequear("token correcto responde 200", res.code === 200, JSON.stringify(res.body));
  const cat = res.body.resumen.find((r) => r.site === "catalogo.humanizar.tech");
  chequear("cuenta vistas del catálogo", Number(cat.pageviews) === 5, JSON.stringify(cat));
  chequear("cuenta sesiones distintas", Number(cat.sesiones) === 4, JSON.stringify(cat));
  chequear("cuenta clicks en tarjeta", Number(cat.clicks) === 3, JSON.stringify(cat));
  chequear("promedia el tiempo en página", Number(cat.seg_promedio) === 40, JSON.stringify(cat));
  const xenia = res.body.tarjetas.find((t) => t.label === "Xenía");
  chequear("agrupa clicks por tarjeta", xenia && xenia.clicks === 2, JSON.stringify(xenia));
  chequear("registra el envío de la agenda",
    res.body.formularios.some((f) => f.site === "agenda.humanizar.tech" && f.envios === 1));
  chequear("hay serie por día", res.body.por_dia.length >= 1);
}
chequear("acepta el token por query string",
  (await getStats({ token: "token-de-prueba" })).code === 200);

console.log(fallos === 0 ? "\nTodo verde.\n" : `\n${fallos} comprobación(es) fallaron.\n`);
process.exit(fallos === 0 ? 0 : 1);
