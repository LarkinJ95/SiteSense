-- Add organization scoping to audit_log
-- Existing rows will have NULL organization_id.

ALTER TABLE `audit_log` ADD COLUMN `organization_id` text;

CREATE INDEX IF NOT EXISTS `idx_audit_log_org_timestamp`
  ON `audit_log` (`organization_id`, `timestamp`);

