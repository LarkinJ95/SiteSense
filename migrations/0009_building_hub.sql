-- Building Hub: building-level inventory audit, documents, abatement projects, budgets

CREATE TABLE IF NOT EXISTS `building_inventory_changes` (
  `change_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `building_id` text NOT NULL,
  `item_id` text NOT NULL,
  `field_name` text NOT NULL,
  `old_value` text,
  `new_value` text,
  `reason` text,
  `created_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `asbestos_inventory_items`(`item_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `building_inventory_changes_idx` ON `building_inventory_changes` (`organization_id`, `building_id`, `item_id`, `created_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `building_documents` (
  `document_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `client_id` text NOT NULL,
  `building_id` text NOT NULL,
  `filename` text NOT NULL,
  `original_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size` integer NOT NULL,
  `doc_type` text,
  `tags` text, -- json array
  `uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `uploaded_by_user_id` text,
  `linked_entity_type` text,
  `linked_entity_id` text,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `building_documents_idx` ON `building_documents` (`organization_id`, `building_id`, `uploaded_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `abatement_projects` (
  `project_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `client_id` text NOT NULL,
  `building_id` text NOT NULL,
  `project_name` text NOT NULL,
  `start_date` integer,
  `end_date` integer,
  `status` text NOT NULL DEFAULT 'planned', -- planned | in_progress | complete
  `scope_summary` text,
  `crew_lead_user_id` text,
  `crew_members` text, -- json array of user ids/names
  `subcontractor_org` text,
  `disposal_refs` text, -- json array (manifest ids etc)
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `abatement_projects_idx` ON `abatement_projects` (`organization_id`, `building_id`, `start_date`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `abatement_project_items` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `project_id` text NOT NULL,
  `item_id` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`project_id`) REFERENCES `abatement_projects`(`project_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `asbestos_inventory_items`(`item_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `abatement_project_items_unique` ON `abatement_project_items` (`organization_id`, `project_id`, `item_id`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `building_budgets` (
  `budget_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `building_id` text NOT NULL,
  `project_id` text,
  `estimated` numeric,
  `approved` numeric,
  `committed` numeric,
  `actual` numeric,
  `line_items` text, -- json (labor/materials/disposal/sub/monitoring/contingency)
  `enabled` integer NOT NULL DEFAULT true,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`project_id`) REFERENCES `abatement_projects`(`project_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `building_budgets_idx` ON `building_budgets` (`organization_id`, `building_id`, `updated_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `building_budget_changes` (
  `change_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `budget_id` text NOT NULL,
  `reason` text,
  `changes` text, -- json list of {field,from,to}
  `created_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`budget_id`) REFERENCES `building_budgets`(`budget_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `building_budget_changes_idx` ON `building_budget_changes` (`organization_id`, `budget_id`, `created_at`);

