-- 訪問済みメッシュ（第2次地域区分, JIS X 0410 の6桁コード）
CREATE TABLE IF NOT EXISTS visits (
  user_id    TEXT NOT NULL,
  mesh_code  TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, mesh_code)
);

CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits (user_id);

-- ユーザー設定（key/value 形式）
-- 現在使用中のキー:
--   map_mode   : "standard" | "grayscale" | "white"  （地図カラーモード）
--   show_lines : true | false                         （メッシュ線表示）
CREATE TABLE IF NOT EXISTS settings (
  user_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,             -- JSON.stringify() した値
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings (user_id);
