CREATE TABLE IF NOT EXISTS `equipment` (
\t`equipment_id` text PRIMARY KEY NOT NULL,
\t`organization_id` text NOT NULL,
\t`category` text NOT NULL,
\t`manufacturer` text,
\t`model` text,
\t`serial_number` text NOT NULL,
\t`asset_tag` text,
\t`status` text NOT NULL DEFAULT 'in_service',
\t`assigned_to_user_id` text,
\t`location` text,
\t`calibration_interval_days` integer,
\t`last_calibration_date` text,
\t`calibration_due_date` text,
\t`active` integer NOT NULL DEFAULT true,
\t`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
\t`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
\tFOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `equipment_org_serial_unique` ON `equipment` (`organization_id`,`serial_number`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_org_active_idx` ON `equipment` (`organization_id`,`active`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment_calibration_events` (
\t`cal_event_id` text PRIMARY KEY NOT NULL,
\t`organization_id` text NOT NULL,
\t`equipment_id` text NOT NULL,
\t`cal_date` text NOT NULL,
\t`cal_type` text NOT NULL,
\t`performed_by` text,
\t`method_standard` text,
\t`target_flow_lpm` numeric,
\t`as_found_flow_lpm` numeric,
\t`as_left_flow_lpm` numeric,
\t`tolerance` numeric,
\t`tolerance_unit` text,
\t`pass_fail` text,
\t`certificate_number` text,
\t`certificate_file_url` text,
\t`notes` text,
\t`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
\tFOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
\tFOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_cal_events_equipment_idx` ON `equipment_calibration_events` (`organization_id`,`equipment_id`,`cal_date`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment_usage` (
\t`usage_id` text PRIMARY KEY NOT NULL,
\t`organization_id` text NOT NULL,
\t`equipment_id` text NOT NULL,
\t`job_id` text,
\t`used_from` integer,
\t`used_to` integer,
\t`context` text,
\t`sample_run_id` text,
\t`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
\tFOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
\tFOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade,
\tFOREIGN KEY (`job_id`) REFERENCES `air_monitoring_jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_usage_equipment_idx` ON `equipment_usage` (`organization_id`,`equipment_id`,`used_from`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `equipment_notes` (
\t`note_id` text PRIMARY KEY NOT NULL,
\t`organization_id` text NOT NULL,
\t`equipment_id` text NOT NULL,
\t`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
\t`created_by_user_id` text NOT NULL,
\t`note_text` text NOT NULL,
\t`note_type` text,
\t`visibility` text DEFAULT 'org',
\tFOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
\tFOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_notes_equipment_idx` ON `equipment_notes` (`organization_id`,`equipment_id`,`created_at`);

