CREATE TABLE IF NOT EXISTS `auth_users` (
  `user_id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `name` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `auth_users_email_unique` ON `auth_users` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `auth_sessions` (
  `session_id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  `expires_at` integer NOT NULL,
  `user_agent` text,
  `ip_address` text,
  FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `auth_sessions_user_idx` ON `auth_sessions` (`user_id`, `expires_at`);

