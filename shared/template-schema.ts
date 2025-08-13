import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { surveys } from "./schema";

// Survey Templates
export const surveyTemplates = pgTable("survey_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  surveyType: text("survey_type").notNull(),
  category: text("category").default("general"), // general, asbestos, lead, environmental, etc.
  version: text("version").default("1.0"),
  isPublic: boolean("is_public").default(true),
  isActive: boolean("is_active").default(true),
  // Default survey settings
  defaultSettings: text("default_settings"), // JSON string with default survey configuration
  estimatedDuration: integer("estimated_duration"), // in hours
  requiredCertifications: text("required_certifications").array(),
  safetyRequirements: text("safety_requirements").array(),
  equipmentRequired: text("equipment_required").array(),
  // Metadata
  createdBy: text("created_by").notNull(),
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Checklist Templates
export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyTemplateId: varchar("survey_template_id").references(() => surveyTemplates.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("pre-survey"), // pre-survey, during-survey, post-survey, safety, equipment
  isRequired: boolean("is_required").default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Checklist Items
export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistTemplateId: varchar("checklist_template_id").notNull().references(() => checklistTemplates.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  description: text("description"),
  itemType: text("item_type").default("checkbox"), // checkbox, text_input, number_input, file_upload, photo
  isRequired: boolean("is_required").default(false),
  order: integer("order").default(0),
  validationRules: text("validation_rules"), // JSON string with validation rules
  defaultValue: text("default_value"),
  options: text("options").array(), // For dropdown/radio items
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Observation Templates
export const observationTemplates = pgTable("observation_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyTemplateId: varchar("survey_template_id").references(() => surveyTemplates.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  materialType: text("material_type"),
  defaultConditions: text("default_conditions").array(),
  defaultRiskLevels: text("default_risk_levels").array(),
  requiredFields: text("required_fields").array(),
  sampleRequired: boolean("sample_required").default(false),
  photoRequired: boolean("photo_required").default(false),
  gpsRequired: boolean("gps_required").default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Survey Instances from Templates
export const surveyInstances = pgTable("survey_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  templateId: varchar("template_id").references(() => surveyTemplates.id),
  templateVersion: text("template_version"),
  customizations: text("customizations"), // JSON string with any customizations made
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Checklist Responses
export const checklistResponses = pgTable("checklist_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  checklistTemplateId: varchar("checklist_template_id").notNull().references(() => checklistTemplates.id),
  itemId: varchar("item_id").notNull().references(() => checklistItems.id),
  response: text("response"),
  isCompleted: boolean("is_completed").default(false),
  completedBy: text("completed_by"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  attachments: text("attachments").array(), // file paths
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Relations
export const surveyTemplateRelations = relations(surveyTemplates, ({ many }) => ({
  checklists: many(checklistTemplates),
  observations: many(observationTemplates),
  instances: many(surveyInstances),
}));

export const checklistTemplateRelations = relations(checklistTemplates, ({ one, many }) => ({
  surveyTemplate: one(surveyTemplates, {
    fields: [checklistTemplates.surveyTemplateId],
    references: [surveyTemplates.id],
  }),
  items: many(checklistItems),
  responses: many(checklistResponses),
}));

export const checklistItemRelations = relations(checklistItems, ({ one, many }) => ({
  checklistTemplate: one(checklistTemplates, {
    fields: [checklistItems.checklistTemplateId],
    references: [checklistTemplates.id],
  }),
  responses: many(checklistResponses),
}));

export const observationTemplateRelations = relations(observationTemplates, ({ one }) => ({
  surveyTemplate: one(surveyTemplates, {
    fields: [observationTemplates.surveyTemplateId],
    references: [surveyTemplates.id],
  }),
}));

export const surveyInstanceRelations = relations(surveyInstances, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyInstances.surveyId],
    references: [surveys.id],
  }),
  template: one(surveyTemplates, {
    fields: [surveyInstances.templateId],
    references: [surveyTemplates.id],
  }),
}));

export const checklistResponseRelations = relations(checklistResponses, ({ one }) => ({
  survey: one(surveys, {
    fields: [checklistResponses.surveyId],
    references: [surveys.id],
  }),
  checklistTemplate: one(checklistTemplates, {
    fields: [checklistResponses.checklistTemplateId],
    references: [checklistTemplates.id],
  }),
  item: one(checklistItems, {
    fields: [checklistResponses.itemId],
    references: [checklistItems.id],
  }),
}));