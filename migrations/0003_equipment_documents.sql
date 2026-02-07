CREATE TABLE IF NOT EXISTS `equipment_documents` (
\t`document_id` text PRIMARY KEY NOT NULL,
\t`organization_id` text NOT NULL,
\t`equipment_id` text NOT NULL,
\t`filename` text NOT NULL,
\t`original_name` text NOT NULL,
\t`mime_type` text NOT NULL,
\t`size` integer NOT NULL,
\t`doc_type` text,
\t`uploaded_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
\t`uploaded_by_user_id` text,
\t`linked_entity_type` text,
\t`linked_entity_id` text,
\tFOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
\tFOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`equipment_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `equipment_documents_equipment_idx` ON `equipment_documents` (`organization_id`,`equipment_id`,`uploaded_at`);

