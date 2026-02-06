CREATE TABLE `air_monitoring_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`document_type` text,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_by` text,
	`uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`job_id`) REFERENCES `air_monitoring_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `air_monitoring_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`equipment_type` text NOT NULL,
	`manufacturer` text,
	`model` text,
	`serial_number` text,
	`calibration_date` integer,
	`calibration_due` integer,
	`flow_rate_range` text,
	`is_active` integer DEFAULT true,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `air_monitoring_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text,
	`organization_id` text,
	`job_name` text NOT NULL,
	`job_number` text NOT NULL,
	`client_name` text,
	`project_manager` text,
	`site_name` text NOT NULL,
	`address` text NOT NULL,
	`city` text,
	`state` text,
	`zip_code` text,
	`country` text DEFAULT 'USA',
	`coordinates` text,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`actual_start_date` integer,
	`actual_end_date` integer,
	`weather_conditions` text,
	`temperature` numeric,
	`humidity` numeric,
	`barometric_pressure` numeric,
	`wind_speed` numeric,
	`wind_direction` text,
	`precipitation` text,
	`visibility` text,
	`work_description` text,
	`hazards_potential` text,
	`control_measures` text,
	`safety_notes` text,
	`status` text DEFAULT 'planning',
	`permits` text,
	`photos` text,
	`reports` text,
	`field_crew` text,
	`supervisor` text,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `air_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`survey_id` text,
	`personnel_id` text,
	`sample_number` text,
	`sample_type` text NOT NULL,
	`custom_sample_type` text,
	`analyte` text NOT NULL,
	`custom_analyte` text,
	`sampling_method` text,
	`pump_id` text,
	`flow_rate` numeric,
	`sampling_duration` integer,
	`total_volume` numeric,
	`location` text,
	`area` text,
	`building` text,
	`floor` text,
	`room` text,
	`latitude` numeric,
	`longitude` numeric,
	`temperature` numeric,
	`humidity` numeric,
	`pressure` numeric,
	`wind_speed` numeric,
	`wind_direction` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`collected_by` text NOT NULL,
	`monitor_worn_by` text,
	`witnessed_by` text,
	`chain_of_custody` text,
	`lab_id` text,
	`lab_sample_id` text,
	`analysis_method` text,
	`reporting_limit` numeric,
	`detection_limit` numeric,
	`result` numeric,
	`result_unit` text,
	`uncertainty` numeric,
	`qualifiers` text,
	`exceeds_limit` integer DEFAULT false,
	`regulatory_limit` numeric,
	`limit_type` text,
	`lab_report_date` integer,
	`reported_by` text,
	`reviewed_by` text,
	`report_notes` text,
	`lab_report_filename` text,
	`lab_report_uploaded_at` integer,
	`blank_correction` integer DEFAULT false,
	`qc_flags` text,
	`status` text DEFAULT 'collecting',
	`sample_photos` text,
	`field_notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`job_id`) REFERENCES `air_monitoring_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`personnel_id`) REFERENCES `personnel_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `asbestos_sample_layers` (
	`id` text PRIMARY KEY NOT NULL,
	`sample_id` text NOT NULL,
	`layer_number` integer NOT NULL,
	`material_type` text,
	`asbestos_type` text,
	`asbestos_percent` numeric,
	`description` text,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`sample_id`) REFERENCES `asbestos_samples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `asbestos_sample_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`sample_id` text NOT NULL,
	`url` text NOT NULL,
	`filename` text,
	`uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`sample_id`) REFERENCES `asbestos_samples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `asbestos_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`functional_area` text NOT NULL,
	`homogeneous_area` text NOT NULL,
	`sample_number` text NOT NULL,
	`material_type` text NOT NULL,
	`sample_description` text,
	`sample_location` text,
	`estimated_quantity` text,
	`quantity_unit` text,
	`condition` text,
	`collection_method` text,
	`asbestos_type` text,
	`asbestos_percent` numeric,
	`results` text,
	`latitude` numeric,
	`longitude` numeric,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chain_of_custody` (
	`id` text PRIMARY KEY NOT NULL,
	`sample_id` text NOT NULL,
	`survey_id` text NOT NULL,
	`current_custodian` text NOT NULL,
	`previous_custodian` text,
	`transfer_date` integer NOT NULL,
	`transfer_reason` text NOT NULL,
	`condition` text NOT NULL,
	`location` text NOT NULL,
	`temperature` numeric,
	`seal_intact` integer DEFAULT true,
	`witness_name` text,
	`witness_signature` text,
	`digital_signature` text,
	`photos` text,
	`notes` text,
	`barcode_scanned` integer DEFAULT false,
	`gps_coordinates` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_email` text NOT NULL,
	`contact_phone` text,
	`address` text,
	`portal_access` integer DEFAULT false,
	`access_level` text DEFAULT 'basic',
	`allow_downloads` integer DEFAULT true,
	`allow_comments` integer DEFAULT true,
	`custom_branding` integer DEFAULT false,
	`logo_url` text,
	`primary_color` text DEFAULT '#3b82f6',
	`last_login` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `collaboration_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`change_type` text NOT NULL,
	`field_name` text,
	`old_value` text,
	`new_value` text,
	`timestamp` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`session_id`) REFERENCES `collaboration_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `collaboration_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`host_user_id` text NOT NULL,
	`participants` text,
	`session_type` text DEFAULT 'survey_edit',
	`is_active` integer DEFAULT true,
	`last_activity` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`shared_cursor` text,
	`permissions` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `compliance_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`regulatory_body` text NOT NULL,
	`rule_type` text NOT NULL,
	`applicable_survey_types` text,
	`threshold` text,
	`warning_days` integer DEFAULT 30,
	`critical_days` integer DEFAULT 7,
	`auto_check` integer DEFAULT true,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `compliance_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`status` text NOT NULL,
	`due_date` integer,
	`completed_date` integer,
	`evidence` text,
	`notes` text,
	`assigned_to` text,
	`checked_by` text,
	`last_checked` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`auto_generated` integer DEFAULT false,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rule_id`) REFERENCES `compliance_rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_weather_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`log_date` text NOT NULL,
	`log_time` integer NOT NULL,
	`weather_conditions` text,
	`temperature` numeric,
	`humidity` numeric,
	`barometric_pressure` numeric,
	`wind_speed` numeric,
	`wind_direction` text,
	`precipitation` text,
	`visibility` text,
	`notes` text,
	`logged_by` text,
	`coordinates` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`job_id`) REFERENCES `air_monitoring_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `field_tools_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`serial_number` text,
	`calibration_date` text,
	`next_calibration` text,
	`status` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `functional_areas` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`length` numeric,
	`width` numeric,
	`height` numeric,
	`wall_count` integer,
	`door_count` integer,
	`window_count` integer,
	`sqft` numeric,
	`wall_sqft` numeric,
	`photo_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `homogeneous_areas` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`ha_id` text,
	`title` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text,
	`survey_id` text,
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`message_type` text DEFAULT 'direct',
	`priority` text DEFAULT 'normal',
	`is_read` integer DEFAULT false,
	`read_at` integer,
	`attachment_url` text,
	`parent_message_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`type` text NOT NULL,
	`related_id` text,
	`is_read` integer DEFAULT false,
	`read_at` integer,
	`action_url` text,
	`priority` text DEFAULT 'normal',
	`delivery_method` text,
	`sent_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `observation_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`observation_id`) REFERENCES `observations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`area` text NOT NULL,
	`homogeneous_area` text,
	`material_type` text NOT NULL,
	`condition` text NOT NULL,
	`quantity` text,
	`risk_level` text,
	`sample_collected` integer DEFAULT false,
	`sample_id` text,
	`collection_method` text,
	`sample_notes` text,
	`asbestos_type` text,
	`asbestos_percentage` numeric,
	`lead_result_mg_kg` numeric,
	`lead_result_percent` numeric,
	`cadmium_result_mg_kg` numeric,
	`cadmium_result_percent` numeric,
	`lab_report_filename` text,
	`lab_report_uploaded_at` integer,
	`latitude` numeric,
	`longitude` numeric,
	`notes` text,
	`observation_type` text DEFAULT 'visual',
	`priority` text DEFAULT 'normal',
	`follow_up_required` integer DEFAULT false,
	`follow_up_date` integer,
	`follow_up_notes` text,
	`verified` integer DEFAULT false,
	`verified_by` text,
	`verification_date` integer,
	`status` text DEFAULT 'draft',
	`reviewed_by` text,
	`review_date` integer,
	`review_notes` text,
	`immediate_action` text,
	`recommended_action` text,
	`action_taken` text,
	`action_date` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member',
	`status` text DEFAULT 'active',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text,
	`status` text DEFAULT 'active',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `paint_sample_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`sample_id` text NOT NULL,
	`url` text NOT NULL,
	`filename` text,
	`uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`sample_id`) REFERENCES `paint_samples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `paint_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`functional_area` text NOT NULL,
	`sample_number` text NOT NULL,
	`sample_description` text,
	`sample_location` text,
	`substrate` text,
	`substrate_other` text,
	`collection_method` text,
	`lead_result_mg_kg` numeric,
	`cadmium_result_mg_kg` numeric,
	`latitude` numeric,
	`longitude` numeric,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `personnel_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`employee_id` text,
	`job_title` text,
	`department` text,
	`company` text,
	`email` text,
	`phone` text,
	`certifications` text,
	`medical_clearance` integer DEFAULT false,
	`last_medical_date` text,
	`state_accreditation_number` text,
	`notes` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `report_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`template_type` text NOT NULL,
	`sections` text,
	`fields` text,
	`filters` text,
	`layout` text DEFAULT 'standard',
	`include_charts` integer DEFAULT false,
	`include_photos` integer DEFAULT true,
	`include_maps` integer DEFAULT false,
	`header_text` text,
	`footer_text` text,
	`logo_url` text,
	`created_by` text NOT NULL,
	`is_public` integer DEFAULT false,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`site_name` text NOT NULL,
	`address` text,
	`job_number` text,
	`survey_type` text NOT NULL,
	`survey_date` integer NOT NULL,
	`inspector` text NOT NULL,
	`notes` text,
	`enable_gps` integer DEFAULT false,
	`use_template` integer DEFAULT false,
	`require_photos` integer DEFAULT false,
	`status` text DEFAULT 'draft' NOT NULL,
	`weather_conditions` text,
	`temperature` numeric,
	`humidity` numeric,
	`wind_speed` numeric,
	`equipment_used` text,
	`calibration_dates` text,
	`priority` text DEFAULT 'medium',
	`client_name` text,
	`project_number` text,
	`estimated_duration` integer,
	`actual_duration` integer,
	`team_members` text,
	`safety_requirements` text,
	`access_requirements` text,
	`special_instructions` text,
	`workflow_stage` text DEFAULT 'planning',
	`approval_status` text DEFAULT 'pending',
	`reviewer_notes` text,
	`assigned_to` text,
	`due_date` integer,
	`completed_date` integer,
	`qa_checked` integer DEFAULT false,
	`qa_check_date` integer,
	`qa_checked_by` text,
	`data_classification` text DEFAULT 'standard',
	`retention_period` integer DEFAULT 2555,
	`archive_date` integer,
	`export_count` integer DEFAULT 0,
	`last_exported` integer,
	`site_photo_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`first_name` text,
	`last_name` text,
	`email` text,
	`phone` text,
	`organization` text,
	`job_title` text,
	`department` text,
	`address` text,
	`role` text,
	`status` text,
	`avatar` text,
	`preferences` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`checklist_template_id` text NOT NULL,
	`text` text NOT NULL,
	`description` text,
	`item_type` text DEFAULT 'checkbox',
	`is_required` integer DEFAULT false,
	`order` integer DEFAULT 0,
	`validation_rules` text,
	`default_value` text,
	`options` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`checklist_template_id`) REFERENCES `checklist_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `checklist_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`checklist_template_id` text NOT NULL,
	`item_id` text NOT NULL,
	`response` text,
	`is_completed` integer DEFAULT false,
	`completed_by` text,
	`completed_at` integer,
	`notes` text,
	`attachments` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`checklist_template_id`) REFERENCES `checklist_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `checklist_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checklist_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_template_id` text,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'pre-survey',
	`is_required` integer DEFAULT false,
	`order` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_template_id`) REFERENCES `survey_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `observation_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_template_id` text,
	`name` text NOT NULL,
	`description` text,
	`material_type` text,
	`default_conditions` text,
	`default_risk_levels` text,
	`required_fields` text,
	`sample_required` integer DEFAULT false,
	`photo_required` integer DEFAULT false,
	`gps_required` integer DEFAULT false,
	`order` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_template_id`) REFERENCES `survey_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `survey_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`template_id` text,
	`template_version` text,
	`customizations` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `survey_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `survey_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`survey_type` text NOT NULL,
	`category` text DEFAULT 'general',
	`version` text DEFAULT '1.0',
	`is_public` integer DEFAULT true,
	`is_active` integer DEFAULT true,
	`default_settings` text,
	`estimated_duration` integer,
	`required_certifications` text,
	`safety_requirements` text,
	`equipment_required` text,
	`created_by` text NOT NULL,
	`usage_count` integer DEFAULT 0,
	`last_used` integer,
	`tags` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`old_values` text,
	`new_values` text,
	`user_id` text NOT NULL,
	`user_agent` text,
	`ip_address` text,
	`timestamp` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `export_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text,
	`export_type` text NOT NULL,
	`format` text,
	`requested_by` text NOT NULL,
	`status` text DEFAULT 'pending',
	`file_size` integer,
	`record_count` integer,
	`filename` text,
	`download_count` integer DEFAULT 0,
	`last_downloaded` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`survey_id` text,
	`observation_id` text,
	`workflow_step_id` text,
	`type` text DEFAULT 'general' NOT NULL,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'open',
	`assigned_to` text,
	`created_by` text NOT NULL,
	`due_date` integer,
	`completed_date` integer,
	`estimated_effort` integer,
	`actual_effort` integer,
	`tags` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`observation_id`) REFERENCES `observations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_step_id`) REFERENCES `workflow_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workflow_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`template_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`current_step` integer DEFAULT 0,
	`progress` integer DEFAULT 0,
	`assigned_to` text,
	`start_date` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`due_date` integer,
	`completed_date` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_instance_id` text NOT NULL,
	`step_number` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`assigned_to` text,
	`estimated_duration` integer,
	`actual_duration` integer,
	`start_date` integer,
	`completed_date` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workflow_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`survey_type` text NOT NULL,
	`steps` text,
	`estimated_duration` integer,
	`required_roles` text,
	`is_active` integer DEFAULT true,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
