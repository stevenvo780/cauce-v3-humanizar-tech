import { getPool, aplicarCors } from "./_db.js";

const EVENTOS = new Set(["pageview", "card_click", "form_submit", "page_time"]);
const SITIOS = new Set(["humanizar.tech", "catalogo.humanizar.tech", "agenda.humanizar.tech"]);

function recortar(valor, largo) {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio.slice(0, largo) : null;
}

function sitioDe(req, body) {
  const declarado = recortar(body.site, 80);
  if (declarado && SITIOS.has(declarado)) return declarado;
  const origen = req.headers.origin;
  if (origen) {
    try {
      const host = new URL(origen).hostname;
      if (SITIOS.has(host)) return host;
    } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "body_invalido" });
  }

  const event = recortar(body.event, 40);
  if (!event || !EVENTOS.has(event)) {
    return res.status(400).json({ ok: false, error: "evento_desconocido" });
  }

  const site = sitioDe(req, body);
  if (!site) return res.status(400).json({ ok: false, error: "sitio_desconocido" });

  const sessionId = recortar(body.sid, 40);
  if (!sessionId) return res.status(400).json({ ok: false, error: "sesion_ausente" });

  const ms = Number.isFinite(body.ms) ? Math.min(Math.max(Math.trunc(body.ms), 0), 86_400_000) : null;

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ ok: false, error: "sin_DATABASE_URL" });
  }

  try {
    await pool.query(
      `INSERT INTO track_events (site, event, path, label, session_id, referrer, ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        site,
        event,
        recortar(body.path, 300) || "/",
        recortar(body.label, 200),
        sessionId,
        recortar(body.ref, 200),
        ms,
      ],
    );
    return res.status(202).json({ ok: true });
  } catch (err) {
    console.error("track insert falló:", err.message);
    return res.status(500).json({ ok: false, error: "insert_fallo" });
  }
}

function safeParse(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}
