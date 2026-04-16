CREATE TABLE IF NOT EXISTS visits (
  user_id    TEXT NOT NULL,
  mesh_code  TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, mesh_code)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key)
);
