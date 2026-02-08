-- Add sampler user id to asbestos sample logs (building-level + inspection-level)

ALTER TABLE `asbestos_building_samples` ADD COLUMN `sampler_user_id` text;
--> statement-breakpoint
ALTER TABLE `asbestos_inspection_samples` ADD COLUMN `sampler_user_id` text;

