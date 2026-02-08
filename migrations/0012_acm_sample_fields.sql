-- Add ACM-specific fields to building/inspection sample logs

ALTER TABLE `asbestos_building_samples` ADD COLUMN `asbestos_type` text;
--> statement-breakpoint
ALTER TABLE `asbestos_building_samples` ADD COLUMN `asbestos_percent` numeric;
--> statement-breakpoint
ALTER TABLE `asbestos_building_samples` ADD COLUMN `description` text;
--> statement-breakpoint

ALTER TABLE `asbestos_inspection_samples` ADD COLUMN `asbestos_type` text;
--> statement-breakpoint
ALTER TABLE `asbestos_inspection_samples` ADD COLUMN `asbestos_percent` numeric;
--> statement-breakpoint
ALTER TABLE `asbestos_inspection_samples` ADD COLUMN `description` text;

