-- Esquema de Antídoto para Turso (libSQL).
-- Las métricas de avance, promedio y número de participantes NO se guardan:
-- se calculan desde `participations` para que nunca queden desincronizadas.

CREATE TABLE IF NOT EXISTS companies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS missions (
  id          TEXT PRIMARY KEY,
  tag         TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  archived_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Un código de actividad es la pareja misión + empresa que reparte el admin.
CREATE TABLE IF NOT EXISTS activity_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL UNIQUE,
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- 'vencido' no se guarda: se deriva de expires_at para que no quede obsoleto.
  estado     TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_codes_mission ON activity_codes(mission_id);
CREATE INDEX IF NOT EXISTS idx_activity_codes_company ON activity_codes(company_id);

-- Cada vez que alguien entra con un código queda registrado aquí.
-- El id es aleatorio, no secuencial: viaja en una cookie y no debe ser adivinable.
CREATE TABLE IF NOT EXISTS participations (
  id                 TEXT PRIMARY KEY,
  activity_code_id   INTEGER NOT NULL REFERENCES activity_codes(id) ON DELETE CASCADE,
  participant_name   TEXT NOT NULL,
  avance             INTEGER NOT NULL DEFAULT 0 CHECK (avance BETWEEN 0 AND 100),
  puntaje            REAL CHECK (puntaje IS NULL OR puntaje BETWEEN 0 AND 10),
  accepted_policy_at TEXT NOT NULL,
  started_at         TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_participations_code ON participations(activity_code_id);
CREATE INDEX IF NOT EXISTS idx_participations_started ON participations(started_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  username            TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('super', 'empresa')),
  -- Obligatorio para role='empresa', nulo para 'super'.
  company_id          INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  notifications_read_at TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((role = 'empresa' AND company_id IS NOT NULL) OR (role = 'super' AND company_id IS NULL))
);

-- El token de sesión se guarda hasheado; la cookie lleva el valor en claro.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash    TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(admin_user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  text          TEXT NOT NULL,
  admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  company_id    INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS legal_texts (
  key        TEXT PRIMARY KEY CHECK (key IN ('privacidad', 'terminos')),
  body       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Solo el resultado final de cada sesión en vivo; las rondas las lleva el host en el cliente.
CREATE TABLE IF NOT EXISTS live_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id       TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  host_user_id     INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  connected        INTEGER NOT NULL DEFAULT 0,
  rounds_completed INTEGER NOT NULL DEFAULT 0,
  scores_json      TEXT,
  started_at       TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_mission ON live_sessions(mission_id);
