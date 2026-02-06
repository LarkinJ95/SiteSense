import { relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { surveys } from "./schema";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const bool = (name: string) => integer(name, { mode: "boolean" });

// Survey Templates
export const surveyTemplates = sqliteTable("survey_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  surveyType: text("survey_type").notNull(),
  category: text("category").default("general"), // general, asbestos, lead, environmental, etc.
  version: text("version").default("1.0"),
  isPublic: bool("is_public").default(true),
  isActive: bool("is_active").default(true),
  // Default survey settings
  defaultSettings: text("default_settings"), // JSON string with default survey configuration
  estimatedDuration: integer("estimated_duration"), // in hours
  requiredCertifications: text("required_certifications", { mode: "json" }),
  safetyRequirements: text("safety_requirements", { mode: "json" }),
  equipmentRequired: text("equipment_required", { mode: "json" }),
  // Metadata
  createdBy: text("created_by").notNull(),
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  tags: text("tags", { mode: "json" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Checklist Templates
export const checklistTemplates = sqliteTable("checklist_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyTemplateId: text("survey_template_id").references(() => surveyTemplates.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("pre-survey"), // pre-survey, during-survey, post-survey, safety, equipment
  isRequired: bool("is_required").default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Checklist Items
export const checklistItems = sqliteTable("checklist_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  checklistTemplateId: text("checklist_template_id").notNull().references(() => checklistTemplates.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  description: text("description"),
  itemType: text("item_type").default("checkbox"), // checkbox, text_input, number_input, file_upload, photo
  isRequired: bool("is_required").default(false),
  order: integer("order").default(0),
  validationRules: text("validation_rules"), // JSON string with validation rules
  defaultValue: text("default_value"),
  options: text("options", { mode: "json" }), // For dropdown/radio items
  createdAt: timestamp("created_at").defaultNow(),
});

// Observation Templates
export const observationTemplates = sqliteTable("observation_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyTemplateId: text("survey_template_id").references(() => surveyTemplates.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  materialType: text("material_type"),
  defaultConditions: text("default_conditions", { mode: "json" }),
  defaultRiskLevels: text("default_risk_levels", { mode: "json" }),
  requiredFields: text("required_fields", { mode: "json" }),
  sampleRequired: bool("sample_required").default(false),
  photoRequired: bool("photo_required").default(false),
  gpsRequired: bool("gps_required").default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Survey Instances from Templates
export const surveyInstances = sqliteTable("survey_instances", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  templateId: text("template_id").references(() => surveyTemplates.id),
  templateVersion: text("template_version"),
  customizations: text("customizations"), // JSON string with any customizations made
  createdAt: timestamp("created_at").defaultNow(),
});

// Checklist Responses
export const checklistResponses = sqliteTable("checklist_responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  checklistTemplateId: text("checklist_template_id").notNull().references(() => checklistTemplates.id),
  itemId: text("item_id").notNull().references(() => checklistItems.id),
  response: text("response"),
  isCompleted: bool("is_completed").default(false),
  completedBy: text("completed_by"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  attachments: text("attachments", { mode: "json" }), // file paths
  createdAt: timestamp("created_at").defaultNow(),
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
