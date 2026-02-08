-- Building-level samples (not tied to inspections) + Abatement/Repair log + Inventory notes

ALTER TABLE `asbestos_inventory_items` ADD COLUMN `notes` text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `asbestos_building_samples` (
  `sample_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `client_id` text NOT NULL,
  `building_id` text NOT NULL,
  `inspection_id` text, -- optional link to an inspection
  `sample_type` text NOT NULL, -- acm | paint_metals
  `item_id` text,
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
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`inspection_id`) REFERENCES `asbestos_inspections`(`inspection_id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`item_id`) REFERENCES `asbestos_inventory_items`(`item_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asbestos_building_samples_idx` ON `asbestos_building_samples` (`organization_id`, `building_id`, `sample_type`, `collected_at`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `abatement_repair_logs` (
  `log_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `client_id` text NOT NULL,
  `building_id` text NOT NULL,
  `item_id` text,
  `associated_item_number` text,
  `associated_sample_number` text,
  `material_description` text,
  `location` text,
  `abatement_date` integer,
  `contractor` text,
  `method` text,
  `waste_shipment_id` text,
  `disposal_site` text,
  `clearance_date` integer,
  `clearance_result` text,
  `cost` numeric,
  `notes` text,
  `created_by_user_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`building_id`) REFERENCES `asbestos_buildings`(`building_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`item_id`) REFERENCES `asbestos_inventory_items`(`item_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `abatement_repair_logs_idx` ON `abatement_repair_logs` (`organization_id`, `building_id`, `abatement_date`);

