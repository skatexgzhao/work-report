ALTER TABLE period_reports ADD COLUMN generation_focus TEXT NOT NULL DEFAULT '';
ALTER TABLE period_reports ADD COLUMN content_format TEXT NOT NULL DEFAULT 'period_v1';
