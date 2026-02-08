-- Asbestos Inspections (Client -> Building -> Inventory) + Excel exports/reporting foundations

-- Scope existing clients to organizations (nullable for legacy rows).
ALTER TABLE `clients` ADD COLUMN `organization_id` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `clients_org_idx` ON `clients` (`organization_id`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asbestos_buildings` (
  `building_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `client_id` text NOT NULL,
  `name` text NOT NULL,
  `address` text,
  `notes` text,
  `active` integer NOT NULL DEFAULT true,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asbestos_buildings_org_client_idx` ON `asbestos_buildings` (`organization_id`, `client_id`, `active`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asbestos_inventory_items` (
  `item_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `client_id` text NOT NULL,
  `building_id` text NOT NULL,
  `external_item_id` text,
  `material` text,
  `location` text,
  `category` text,
  `acm_status` text, -- ACM | PACM | none
  `condition` text,
  `quantity` numeric,
  `uom` text,
  `status` text,
  `last_inspected_at` integer,
  `last_updated_at` integer,
  `active` integer NOT NULL DEFAULT true,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asbestos_inventory_org_building_idx` ON `asbestos_inventory_items` (`organization_id`, `building_id`, `active`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asbestos_inspections` (
  `inspection_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `client_id` text NOT NULL,
  `building_id` text NOT NULL,
  `inspection_date` integer NOT NULL,
  `inspectors` text, -- json array of user ids
  `status` text NOT NULL DEFAULT 'draft', -- Draft/In Progress/Final
  `recurrence_years` integer,
  `next_due_date` integer,
  `notes` text,
  `created_by_user_id` text,
  `updated_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asbestos_inspections_org_building_idx` ON `asbestos_inspections` (`organization_id`, `building_id`, `inspection_date`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asbestos_inspection_inventory_changes` (
  `change_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `inspection_id` text NOT NULL,
  `item_id` text,
  `field_name` text NOT NULL,
  `old_value` text,
  `new_value` text,
  `reason` text,
  `created_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`inspection_id`) REFERENCES `asbestos_inspections`(`inspection_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `asbestos_inventory_items`(`item_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asbestos_inspection_changes_idx` ON `asbestos_inspection_inventory_changes` (`organization_id`, `inspection_id`, `created_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asbestos_inspection_samples` (
  `sample_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `inspection_id` text NOT NULL,
  `sample_type` text NOT NULL, -- acm | paint_metals
  `item_id` text, -- optional link to inventory item
  `sample_number` text,
  `collected_at` integer,
  `material` text,
  `location` text,
  `lab` text,
  `tat` text,
  `coc` text,
  `result` text,
  `result_unit` text,
  `notes` text,
  `created_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`inspection_id`) REFERENCES `asbestos_inspections`(`inspection_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `asbestos_inventory_items`(`item_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asbestos_inspection_samples_idx` ON `asbestos_inspection_samples` (`organization_id`, `inspection_id`, `sample_type`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asbestos_inspection_documents` (
  `document_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `inspection_id` text NOT NULL,
  `filename` text NOT NULL,
  `original_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size` integer NOT NULL,
  `doc_type` text,
  `uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `uploaded_by_user_id` text,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`inspection_id`) REFERENCES `asbestos_inspections`(`inspection_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asbestos_inspection_docs_idx` ON `asbestos_inspection_documents` (`organization_id`, `inspection_id`, `uploaded_at`);

