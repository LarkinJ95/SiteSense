CREATE TABLE IF NOT EXISTS `equipment` (
  `equipment_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `category` text NOT NULL,
  `manufacturer` text,
  `model` text,
  `serial_number` text NOT NULL,
  `asset_tag` text,
  `status` text NOT NULL DEFAULT 'in_service',
  `assigned_to_user_id` text,
  `location` text,
  `calibration_interval_days` integer,
  `last_calibration_date` text,
  `calibration_due_date` text,
  `active` integer NOT NULL DEFAULT true,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `equipment_org_serial_unique` ON `equipment` (`organization_id`, `serial_number`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_org_active_idx` ON `equipment` (`organization_id`, `active`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment_calibration_events` (
  `cal_event_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `equipment_id` text NOT NULL,
  `cal_date` text NOT NULL,
  `cal_type` text NOT NULL,
  `performed_by` text,
  `method_standard` text,
  `target_flow_lpm` numeric,
  `as_found_flow_lpm` numeric,
  `as_left_flow_lpm` numeric,
  `tolerance` numeric,
  `tolerance_unit` text,
  `pass_fail` text,
  `certificate_number` text,
  `certificate_file_url` text,
  `notes` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_cal_events_equipment_idx` ON `equipment_calibration_events` (`organization_id`, `equipment_id`, `cal_date`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment_usage` (
  `usage_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `equipment_id` text NOT NULL,
  `job_id` text,
  `used_from` integer,
  `used_to` integer,
  `context` text,
  `sample_run_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`job_id`) REFERENCES `air_monitoring_jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_usage_equipment_idx` ON `equipment_usage` (`organization_id`, `equipment_id`, `used_from`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment_notes` (
  `note_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `equipment_id` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `created_by_user_id` text NOT NULL,
  `note_text` text NOT NULL,
  `note_type` text,
  `visibility` text DEFAULT 'org',
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_notes_equipment_idx` ON `equipment_notes` (`organization_id`, `equipment_id`, `created_at`);

