CREATE TABLE IF NOT EXISTS daily_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  department_id INTEGER NOT NULL,
  template_version_id INTEGER NOT NULL,
  report_date DATE NOT NULL,
  content_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, report_date),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (template_version_id) REFERENCES template_versions(id)
);

CREATE TABLE IF NOT EXISTS period_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL,
  user_id INTEGER,
  department_id INTEGER,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  current_version_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS period_report_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  version_type TEXT NOT NULL,
  template_version_id INTEGER,
  source_snapshot TEXT,
  content_json TEXT NOT NULL,
  raw_content TEXT,
  created_by INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, version),
  FOREIGN KEY (report_id) REFERENCES period_reports(id),
  FOREIGN KEY (template_version_id) REFERENCES template_versions(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
