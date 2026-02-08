-- Add analyte field for paint/metals samples (building-level and inspection-level)

ALTER TABLE `asbestos_building_samples` ADD COLUMN `analyte` text;
--> statement-breakpoint
ALTER TABLE `asbestos_inspection_samples` ADD COLUMN `analyte` text;

