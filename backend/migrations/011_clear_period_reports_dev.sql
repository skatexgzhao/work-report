-- 清空周期报告存量，便于统一使用 period_v2（开发/演示环境；保留日报不受影响）
DELETE FROM ai_executions WHERE report_id IS NOT NULL;
DELETE FROM period_report_versions;
UPDATE period_reports SET current_version_id = NULL;
DELETE FROM period_reports;
