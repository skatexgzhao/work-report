-- Daily template: 问题与风险 before 明日计划
INSERT INTO template_versions (template_id, version, form_schema, prompt_template, output_schema)
SELECT
  t.id,
  COALESCE((SELECT MAX(tv2.version) FROM template_versions tv2 WHERE tv2.template_id = t.id), 0) + 1,
  '{"fields":[{"key":"completed","label":"今日工作","type":"textarea","required":true,"order":1,"rows":10,"hint":"已完成写结果；进行中写进度和卡点。几条要点即可。","placeholder":"例：1）修好登录验证码，测试已确认"},{"key":"risk","label":"问题与风险","type":"textarea","required":false,"order":2,"rows":6,"hint":"写影响、已尝试的办法、需要谁协助。","placeholder":"例：测试机磁盘满，已清日志，需运维扩容"},{"key":"plan","label":"明日计划","type":"textarea","required":false,"order":3,"rows":5,"hint":"写明天要交付或推进的事，尽量写结果。","placeholder":"例：1）完成报表页自测并提交代码"}]}',
  tv.prompt_template,
  tv.output_schema
FROM templates t
JOIN template_versions tv ON tv.id = t.current_version_id
WHERE t.type = 'DAILY';

UPDATE templates
SET current_version_id = (
  SELECT id FROM template_versions WHERE template_id = templates.id ORDER BY version DESC LIMIT 1
)
WHERE type = 'DAILY';
