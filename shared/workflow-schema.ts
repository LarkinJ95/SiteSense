import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { surveys, observations } from "./schema";

// Workflow Templates
export const workflowTemplates = pgTable("workflow_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  surveyType: text("survey_type").notNull(),
  steps: text("steps").array(), // JSON array of step definitions
  estimatedDuration: integer("estimated_duration"), // in hours
  requiredRoles: text("required_roles").array(),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Workflow Instances
export const workflowInstances = pgTable("workflow_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  templateId: varchar("template_id").references(() => workflowTemplates.id),
  status: text("status").notNull().default("active"), // active, completed, cancelled, paused
  currentStep: integer("current_step").default(0),
  progress: integer("progress").default(0), // percentage
  assignedTo: text("assigned_to"),
  startDate: timestamp("start_date").default(sql`now()`),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Workflow Steps
export const workflowSteps = pgTable("workflow_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowInstanceId: varchar("workflow_instance_id").notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  stepNumber: integer("step_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, skipped
  assignedTo: text("assigned_to"),
  estimatedDuration: integer("estimated_duration"), // in minutes
  actualDuration: integer("actual_duration"), // in minutes
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Task Management
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: 'cascade' }),
  observationId: varchar("observation_id").references(() => observations.id, { onDelete: 'cascade' }),
  workflowStepId: varchar("workflow_step_id").references(() => workflowSteps.id, { onDelete: 'cascade' }),
  type: text("type").notNull().default("general"), // general, follow-up, qa-check, sample-collection, lab-submission
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("open"), // open, in-progress, completed, cancelled
  assignedTo: text("assigned_to"),
  createdBy: text("created_by").notNull(),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  estimatedEffort: integer("estimated_effort"), // in hours
  actualEffort: integer("actual_effort"), // in hours
  tags: text("tags").array(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Audit Trail
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // survey, observation, workflow, task
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(), // created, updated, deleted, assigned, completed
  oldValues: text("old_values"), // JSON string
  newValues: text("new_values"), // JSON string
  userId: text("user_id").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").default(sql`now()`),
});

// Data Export Logs
export const exportLogs = pgTable("export_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: 'cascade' }),
  exportType: text("export_type").notNull(), // pdf, excel, csv, json
  format: text("format"), // detailed format specification
  requestedBy: text("requested_by").notNull(),
  status: text("status").default("pending"), // pending, processing, completed, failed
  fileSize: integer("file_size"), // in bytes
  recordCount: integer("record_count"),
  filename: text("filename"),
  downloadCount: integer("download_count").default(0),
  lastDownloaded: timestamp("last_downloaded"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Relations
export const workflowTemplateRelations = relations(workflowTemplates, ({ many }) => ({
  instances: many(workflowInstances),
}));

export const workflowInstanceRelations = relations(workflowInstances, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [workflowInstances.surveyId],
    references: [surveys.id],
  }),
  template: one(workflowTemplates, {
    fields: [workflowInstances.templateId],
    references: [workflowTemplates.id],
  }),
  steps: many(workflowSteps),
}));

export const workflowStepRelations = relations(workflowSteps, ({ one, many }) => ({
  workflowInstance: one(workflowInstances, {
    fields: [workflowSteps.workflowInstanceId],
    references: [workflowInstances.id],
  }),
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  survey: one(surveys, {
    fields: [tasks.surveyId],
    references: [surveys.id],
  }),
  observation: one(observations, {
    fields: [tasks.observationId],
    references: [observations.id],
  }),
  workflowStep: one(workflowSteps, {
    fields: [tasks.workflowStepId],
    references: [workflowSteps.id],
  }),
}));

export const exportLogRelations = relations(exportLogs, ({ one }) => ({
  survey: one(surveys, {
    fields: [exportLogs.surveyId],
    references: [surveys.id],
  }),
}));