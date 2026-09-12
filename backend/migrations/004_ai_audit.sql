CREATE TABLE IF NOT EXISTS ai_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER,
  user_id INTEGER,
  model TEXT,
  template_version_id INTEGER,
  prompt TEXT,
  input_snapshot TEXT,
  raw_response TEXT,
  parsed_result TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES period_reports(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (template_version_id) REFERENCES template_versions(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  detail TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ai_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT 'deepseek',
  base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com/v1',
  api_key_encrypted TEXT,
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  timeout_ms INTEGER NOT NULL DEFAULT 60000,
  temperature REAL NOT NULL DEFAULT 0.3,
  max_tokens INTEGER NOT NULL DEFAULT 4000,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
