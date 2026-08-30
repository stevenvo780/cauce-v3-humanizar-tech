-- Métricas de uso de las webs de Humanizar (humanizar.tech, catalogo., agenda.)
-- Postgres. Probado contra Neon free tier.

CREATE TABLE IF NOT EXISTS track_events (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  site        TEXT         NOT NULL,
  event       TEXT         NOT NULL,
  path        TEXT         NOT NULL DEFAULT '/',
  label       TEXT,
  session_id  TEXT         NOT NULL,
  referrer    TEXT,
  ms          INTEGER
);

CREATE INDEX IF NOT EXISTS track_events_ts_idx         ON track_events (ts DESC);
CREATE INDEX IF NOT EXISTS track_events_site_event_idx ON track_events (site, event, ts DESC);
CREATE INDEX IF NOT EXISTS track_events_session_idx    ON track_events (session_id);
