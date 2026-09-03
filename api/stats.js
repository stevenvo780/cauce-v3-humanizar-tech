import { timingSafeEqual } from "node:crypto";
import { getPool } from "./_db.js";

function tokenValido(recibido) {
  const esperado = process.env.PANEL_TOKEN;
  if (!esperado || typeof recibido !== "string") return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  // Token solo por cabecera: por query string quedaría en logs de acceso, historial del navegador y cabeceras Referer.
  const recibido = req.headers["x-panel-token"];
  if (!tokenValido(Array.isArray(recibido) ? recibido[0] : recibido)) {
    return res.status(401).json({ ok: false, error: "token_invalido" });
  }

  const dias = Math.min(Math.max(parseInt(req.query?.dias ?? "30", 10) || 30, 1), 365);

  const pool = getPool();
  if (!pool) return res.status(503).json({ ok: false, error: "sin_DATABASE_URL" });

  const desde = `${dias} days`;

  try {
    const [resumen, tarjetas, formularios, porDia] = await Promise.all([
      pool.query(
        `SELECT site,
                count(*) FILTER (WHERE event = 'pageview')    AS pageviews,
                count(DISTINCT session_id)                    AS sesiones,
                count(*) FILTER (WHERE event = 'card_click')  AS clicks,
                count(*) FILTER (WHERE event = 'form_submit') AS envios,
                round(avg(ms) FILTER (WHERE event = 'page_time') / 1000.0)::int AS seg_promedio
           FROM track_events
          WHERE ts > now() - $1::interval
          GROUP BY site
          ORDER BY pageviews DESC`,
        [desde],
      ),
      pool.query(
        `SELECT site, label, count(*)::int AS clicks
           FROM track_events
          WHERE event = 'card_click' AND ts > now() - $1::interval AND label IS NOT NULL
          GROUP BY site, label
          ORDER BY clicks DESC
          LIMIT 30`,
        [desde],
      ),
      pool.query(
        `SELECT site, label, count(*)::int AS envios
           FROM track_events
          WHERE event = 'form_submit' AND ts > now() - $1::interval
          GROUP BY site, label
          ORDER BY envios DESC
          LIMIT 30`,
        [desde],
      ),
      pool.query(
        `SELECT date_trunc('day', ts)::date AS dia,
                count(*) FILTER (WHERE event = 'pageview')::int    AS pageviews,
                count(*) FILTER (WHERE event = 'card_click')::int  AS clicks,
                count(*) FILTER (WHERE event = 'form_submit')::int AS envios
           FROM track_events
          WHERE ts > now() - $1::interval
          GROUP BY 1
          ORDER BY 1`,
        [desde],
      ),
    ]);

    return res.status(200).json({
      ok: true,
      dias,
      resumen: resumen.rows,
      tarjetas: tarjetas.rows,
      formularios: formularios.rows,
      por_dia: porDia.rows,
    });
  } catch (err) {
    console.error("stats falló:", err.message);
    return res.status(500).json({ ok: false, error: "consulta_fallo" });
  }
}
