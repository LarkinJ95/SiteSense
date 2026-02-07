CREATE TABLE IF NOT EXISTS `equipment_documents` (
  `document_id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `equipment_id` text NOT NULL,
  `filename` text NOT NULL,
  `original_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size` integer NOT NULL,
  `doc_type` text,
  `uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `uploaded_by_user_id` text,
  `linked_entity_type` text,
  `linked_entity_id` text,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_documents_equipment_idx` ON `equipment_documents` (`organization_id`, `equipment_id`, `uploaded_at`);

