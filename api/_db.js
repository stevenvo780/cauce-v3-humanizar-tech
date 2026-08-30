import pg from "pg";

const ORIGENES = new Set([
  "https://humanizar.tech",
  "https://www.humanizar.tech",
  "https://catalogo.humanizar.tech",
  "https://agenda.humanizar.tech",
]);

let pool;

export function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export function aplicarCors(req, res) {
  const origen = req.headers.origin;
  if (origen && ORIGENES.has(origen)) {
    res.setHeader("Access-Control-Allow-Origin", origen);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}
