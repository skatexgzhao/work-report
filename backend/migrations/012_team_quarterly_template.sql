-- Team quarterly report template (missing in earlier seeds)
INSERT INTO templates (name, type, scope, status)
SELECT '默认小组季报模板', 'TEAM_QUARTERLY', 'SYSTEM', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE type = 'TEAM_QUARTERLY');

INSERT INTO template_versions (template_id, version, form_schema, prompt_template, output_schema)
SELECT t.id, 1, '{}',
  '以下是小组成员已提交的工作素材，不得虚构。周期：{{startDate}}~{{endDate}}。{{scopeHint}}{{focusBlock}}素材：{{reportData}}',
  '{"content_format":"period_v2","achievements":[],"issues":[],"next_focus":[]}'
FROM templates t WHERE t.type = 'TEAM_QUARTERLY'
AND NOT EXISTS (SELECT 1 FROM template_versions tv WHERE tv.template_id = t.id);

UPDATE templates SET current_version_id = (
  SELECT id FROM template_versions WHERE template_id = templates.id ORDER BY version DESC LIMIT 1
) WHERE type = 'TEAM_QUARTERLY' AND current_version_id IS NULL;
