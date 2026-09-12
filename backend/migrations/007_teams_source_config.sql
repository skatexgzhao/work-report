-- Teams (sub-groups within department)
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  leader_user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, name),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (leader_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_teams (
  user_id INTEGER NOT NULL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Extend period_reports for team reports and source configuration
ALTER TABLE period_reports ADD COLUMN team_id INTEGER REFERENCES teams(id);
ALTER TABLE period_reports ADD COLUMN source_config TEXT;

-- Team report templates
INSERT INTO templates (name, type, scope, status)
SELECT '默认小组周报模板', 'TEAM_WEEKLY', 'SYSTEM', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE type = 'TEAM_WEEKLY');

INSERT INTO template_versions (template_id, version, form_schema, prompt_template, output_schema)
SELECT t.id, 1, '{}',
  '以下是小组成员已提交的工作素材，不得虚构。周期：{{startDate}}~{{endDate}}。素材：{{reportData}}',
  '{"summary":"","completed":[],"key_results":[],"problems":[],"next_plan":[],"risks":[]}'
FROM templates t WHERE t.type = 'TEAM_WEEKLY'
AND NOT EXISTS (SELECT 1 FROM template_versions tv WHERE tv.template_id = t.id);

UPDATE templates SET current_version_id = (
  SELECT id FROM template_versions WHERE template_id = templates.id ORDER BY version DESC LIMIT 1
) WHERE type = 'TEAM_WEEKLY' AND current_version_id IS NULL;

INSERT INTO templates (name, type, scope, status)
SELECT '默认小组月报模板', 'TEAM_MONTHLY', 'SYSTEM', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE type = 'TEAM_MONTHLY');

INSERT INTO template_versions (template_id, version, form_schema, prompt_template, output_schema)
SELECT t.id, 1, '{}',
  '以下是小组月报素材。周期：{{startDate}}~{{endDate}}。素材：{{reportData}}',
  '{"summary":"","completed":[],"key_results":[],"problems":[],"next_plan":[],"risks":[]}'
FROM templates t WHERE t.type = 'TEAM_MONTHLY'
AND NOT EXISTS (SELECT 1 FROM template_versions tv WHERE tv.template_id = t.id);

UPDATE templates SET current_version_id = (
  SELECT id FROM template_versions WHERE template_id = templates.id ORDER BY version DESC LIMIT 1
) WHERE type = 'TEAM_MONTHLY' AND current_version_id IS NULL;

-- Seed default team for 技术部
INSERT OR IGNORE INTO teams (department_id, name, leader_user_id, status)
SELECT d.id, '默认小组', u.id, 'ACTIVE'
FROM departments d
JOIN users u ON u.username = 'manager'
WHERE d.name = '技术部';

INSERT OR IGNORE INTO user_teams (user_id, team_id)
SELECT u.id, t.id
FROM users u
JOIN teams t ON t.name = '默认小组'
JOIN departments d ON d.id = t.department_id AND d.name = u.department
WHERE u.department = '技术部';
