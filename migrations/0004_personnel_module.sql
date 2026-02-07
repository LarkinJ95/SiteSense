CREATE TABLE IF NOT EXISTS `personnel` (
  `person_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `company` text,
  `trade_role` text,
  `employee_id` text,
  `email` text,
  `phone` text,
  `respirator_clearance_date` text,
  `fit_test_date` text,
  `medical_surveillance_date` text,
  `active` integer NOT NULL DEFAULT true,
  `created_by_user_id` text,
  `updated_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `personnel_org_active_idx` ON `personnel` (`organization_id`, `active`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `personnel_org_name_idx` ON `personnel` (`organization_id`, `last_name`, `first_name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `personnel_job_assignments` (
  `assignment_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `person_id` text NOT NULL,
  `job_id` text NOT NULL,
  `date_from` integer,
  `date_to` integer,
  `shift_date` text,
  `role_on_job` text,
  `supervisor_person_id` text,
  `supervisor_name` text,
  `notes` text,
  `created_by_user_id` text,
  `updated_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`person_id`) REFERENCES `personnel`(`person_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`job_id`) REFERENCES `air_monitoring_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `personnel_assignments_person_idx` ON `personnel_job_assignments` (`organization_id`, `person_id`, `date_from`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `personnel_assignments_job_idx` ON `personnel_job_assignments` (`organization_id`, `job_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exposure_limits` (
  `limit_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `profile_key` text NOT NULL,
  `analyte` text NOT NULL,
  `units` text NOT NULL,
  `action_level` numeric,
  `pel` numeric,
  `rel` numeric,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `exposure_limits_org_profile_analyte_unique` ON `exposure_limits` (`organization_id`, `profile_key`, `analyte`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exposure_records` (
  `exposure_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `person_id` text NOT NULL,
  `job_id` text NOT NULL,
  `air_sample_id` text,
  `sample_run_id` text,
  `date` integer,
  `analyte` text NOT NULL,
  `duration_minutes` integer,
  `concentration` numeric,
  `units` text,
  `method` text,
  `sample_type` text,
  `task_activity` text,
  `ppe_level` text,
  `twa_8hr` numeric,
  `profile_key` text,
  `computed_version` integer DEFAULT 1,
  `limit_type` text,
  `limit_value` numeric,
  `percent_of_limit` numeric,
  `exceedance_flag` integer DEFAULT false,
  `near_miss_flag` integer DEFAULT false,
  `source_refs` text,
  `created_by_user_id` text,
  `updated_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`person_id`) REFERENCES `personnel`(`person_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`job_id`) REFERENCES `air_monitoring_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`air_sample_id`) REFERENCES `air_samples`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exposure_records_person_idx` ON `exposure_records` (`organization_id`, `person_id`, `date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exposure_records_job_idx` ON `exposure_records` (`organization_id`, `job_id`, `date`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `exposure_records_org_air_sample_unique` ON `exposure_records` (`organization_id`, `air_sample_id`);

