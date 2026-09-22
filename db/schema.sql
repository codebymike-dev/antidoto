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

-- --- Módulo en vivo (tipo Kahoot) ------------------------------------------
-- Puntajes, rachas y ranking NO se guardan: se calculan desde live_answers, igual
-- que las métricas de participations.

-- Un juego es un set de preguntas reutilizable. company_id nulo = juego global
-- (lo crea un superadmin y lo pueden usar todas las empresas, pero no editar).
CREATE TABLE IF NOT EXISTS live_games (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  created_by  INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  archived_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_live_games_company ON live_games(company_id);

-- Sin UNIQUE(game_id, position): reordenar sería un baile de posiciones temporales.
-- El orden lo garantiza el editor al guardar.
CREATE TABLE IF NOT EXISTS live_questions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id    INTEGER NOT NULL REFERENCES live_games(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('quiz', 'vf', 'encuesta', 'nube')),
  prompt     TEXT NOT NULL,
  time_limit INTEGER NOT NULL DEFAULT 20 CHECK (time_limit BETWEEN 5 AND 240)
);

CREATE INDEX IF NOT EXISTS idx_live_questions_game ON live_questions(game_id, position);

-- La nube de palabras no tiene opciones; la encuesta no tiene correctas.
CREATE TABLE IF NOT EXISTS live_options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES live_questions(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  text        TEXT NOT NULL,
  is_correct  INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_live_options_question ON live_options(question_id, position);

-- Una partida es una ejecución de un juego. Aquí vive el estado en curso (el reloj
-- del servidor incluido): no hay Redis, Ably solo reparte los eventos.
-- game_id sin ON DELETE: borrar un juego con partidas falla, así no se pierden reportes.
-- Los juegos se archivan, no se borran.
CREATE TABLE IF NOT EXISTS live_matches (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id             INTEGER NOT NULL REFERENCES live_games(id),
  host_user_id        INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  -- Empresa del host al crearla (nula si la lanzó un superadmin); define quién la ve.
  company_id          INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  pin                 TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'lobby'
                      CHECK (status IN ('lobby', 'question', 'reveal', 'leaderboard', 'finished')),
  join_locked         INTEGER NOT NULL DEFAULT 0 CHECK (join_locked IN (0, 1)),
  -- Posición de la pregunta en curso; nula en el lobby.
  current_position    INTEGER,
  -- Epoch en ms del servidor. Una respuesta después de question_ends_at se rechaza.
  question_started_at INTEGER,
  question_ends_at    INTEGER,
  -- No nulo = pausada; al reanudar, question_ends_at = ahora + esto.
  paused_remaining_ms INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  started_at          TEXT,
  finished_at         TEXT
);

-- El PIN solo tiene que ser único entre las partidas abiertas; se recicla al terminar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_matches_open_pin ON live_matches(pin) WHERE status <> 'finished';
CREATE INDEX IF NOT EXISTS idx_live_matches_game ON live_matches(game_id);
CREATE INDEX IF NOT EXISTS idx_live_matches_company ON live_matches(company_id);

-- El id es aleatorio, no secuencial: viaja en una cookie y no debe ser adivinable.
CREATE TABLE IF NOT EXISTS live_players (
  id                 TEXT PRIMARY KEY,
  match_id           INTEGER NOT NULL REFERENCES live_matches(id) ON DELETE CASCADE,
  nickname           TEXT NOT NULL,
  accepted_policy_at TEXT NOT NULL,
  kicked_at          TEXT,
  joined_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_players_nickname ON live_players(match_id, nickname COLLATE NOCASE);

-- Una respuesta por jugador y pregunta: el UNIQUE también frena dobles envíos.
-- is_correct es nulo en encuesta y nube (no hay respuesta correcta).
CREATE TABLE IF NOT EXISTS live_answers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   TEXT NOT NULL REFERENCES live_players(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES live_questions(id) ON DELETE CASCADE,
  option_id   INTEGER REFERENCES live_options(id) ON DELETE CASCADE,
  text        TEXT,
  is_correct  INTEGER CHECK (is_correct IS NULL OR is_correct IN (0, 1)),
  response_ms INTEGER NOT NULL CHECK (response_ms >= 0),
  points      INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  answered_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (option_id IS NOT NULL OR text IS NOT NULL),
  UNIQUE (player_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_live_answers_question ON live_answers(question_id);

-- Contador de intentos para limitar fuerza bruta en login y códigos de actividad.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_key ON rate_limit_hits(key, created_at);
