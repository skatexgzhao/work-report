-- Daily template v2: labels, hints, placeholders for writing guidance (content keys unchanged)
INSERT INTO template_versions (template_id, version, form_schema, prompt_template, output_schema)
SELECT
  t.id,
  COALESCE((SELECT MAX(tv2.version) FROM template_versions tv2 WHERE tv2.template_id = t.id), 0) + 1,
  '{"fields":[{"key":"completed","label":"今日工作","type":"textarea","required":true,"order":1,"rows":8,"hint":"建议分两块：【已完成】写清楚产出结果；【进行中】写进度和卡点。几条要点即可，不必套固定格式。","placeholder":"【已完成】\n1）订单模块：修好登录报错，测试已通过\n2）例会：定了本周上线时间和负责人\n\n【进行中】\n1）报表页面改版，大约完成一半；卡在接口还没对接"},{"key":"plan","label":"明日计划","type":"textarea","required":false,"order":2,"rows":3,"hint":"选填。写明天准备交付或推进的事，尽量写结果而不是「继续弄」。","placeholder":"例如：\n1）把报表页面对接完并自测\n2）整理本周问题清单发给主管"},{"key":"risk","label":"问题与风险","type":"textarea","required":false,"order":3,"rows":4,"hint":"选填。写影响、你已经试过什么、需要谁帮忙。","placeholder":"例如：\n1）测试环境经常宕机，影响联调；已联系运维加内存，还需要审批预算"}]}',
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
