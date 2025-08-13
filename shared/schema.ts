import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteName: text("site_name").notNull(),
  address: text("address"),
  jobNumber: text("job_number"),
  surveyType: text("survey_type").notNull(),
  surveyDate: timestamp("survey_date").notNull(),
  inspector: text("inspector").notNull(),
  notes: text("notes"),
  enableGPS: boolean("enable_gps").default(false),
  useTemplate: boolean("use_template").default(false),
  requirePhotos: boolean("require_photos").default(false),
  status: text("status").notNull().default("draft"), // draft, in-progress, completed, reviewed, archived
  // Weather conditions during survey
  weatherConditions: text("weather_conditions"),
  temperature: decimal("temperature"), // in Celsius
  humidity: decimal("humidity"), // percentage
  windSpeed: decimal("wind_speed"), // km/h
  // Equipment tracking
  equipmentUsed: text("equipment_used").array(),
  calibrationDates: text("calibration_dates").array(),
  // Advanced survey features
  priority: text("priority").default("medium"), // low, medium, high, urgent
  clientName: text("client_name"),
  projectNumber: text("project_number"),
  estimatedDuration: integer("estimated_duration"), // in hours
  actualDuration: integer("actual_duration"), // in hours
  teamMembers: text("team_members").array(),
  safetyRequirements: text("safety_requirements").array(),
  accessRequirements: text("access_requirements"),
  specialInstructions: text("special_instructions"),
  // Workflow integration
  workflowStage: text("workflow_stage").default("planning"), // planning, preparation, execution, review, completed
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected
  reviewerNotes: text("reviewer_notes"),
  assignedTo: text("assigned_to"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  // Quality assurance
  qaChecked: boolean("qa_checked").default(false),
  qaCheckDate: timestamp("qa_check_date"),
  qaCheckedBy: text("qa_checked_by"),
  // Data management
  dataClassification: text("data_classification").default("standard"), // public, internal, confidential, restricted
  retentionPeriod: integer("retention_period").default(2555), // days (7 years default)
  archiveDate: timestamp("archive_date"),
  exportCount: integer("export_count").default(0),
  lastExported: timestamp("last_exported"),
  sitePhotoUrl: text("site_photo_url"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const observations = pgTable("observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  area: text("area").notNull(),
  homogeneousArea: text("homogeneous_area"),
  materialType: text("material_type").notNull(),
  condition: text("condition").notNull(),
  quantity: text("quantity"),
  riskLevel: text("risk_level"), // low, medium, high, critical
  sampleCollected: boolean("sample_collected").default(false),
  sampleId: text("sample_id"),
  collectionMethod: text("collection_method"),
  sampleNotes: text("sample_notes"),
  // Lab Results
  asbestosType: text("asbestos_type"), // chrysotile, amosite, crocidolite, etc. or "None Detected"
  asbestosPercentage: decimal("asbestos_percentage"),
  leadResultMgKg: decimal("lead_result_mg_kg"),
  leadResultPercent: decimal("lead_result_percent"), // calculated: leadResultMgKg / 10000
  cadmiumResultMgKg: decimal("cadmium_result_mg_kg"),
  cadmiumResultPercent: decimal("cadmium_result_percent"), // calculated: cadmiumResultMgKg / 10000
  labReportFilename: text("lab_report_filename"),
  labReportUploadedAt: timestamp("lab_report_uploaded_at"),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  notes: text("notes"),
  // Advanced observation features
  observationType: text("observation_type").default("visual"), // visual, sample, measurement, photo
  priority: text("priority").default("normal"), // low, normal, high, urgent
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  // Quality and validation
  verified: boolean("verified").default(false),
  verifiedBy: text("verified_by"),
  verificationDate: timestamp("verification_date"),
  // Workflow tracking
  status: text("status").default("draft"), // draft, pending-review, approved, rejected
  reviewedBy: text("reviewed_by"),
  reviewDate: timestamp("review_date"),
  reviewNotes: text("review_notes"),
  // Risk assessment
  immediateAction: text("immediate_action"),
  recommendedAction: text("recommended_action"),
  actionTaken: text("action_taken"),
  actionDate: timestamp("action_date"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const observationPhotos = pgTable("observation_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  observationId: varchar("observation_id").notNull().references(() => observations.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`),
});

export const surveyRelations = relations(surveys, ({ many }) => ({
  observations: many(observations),
}));

export const observationRelations = relations(observations, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [observations.surveyId],
    references: [surveys.id],
  }),
  photos: many(observationPhotos),
}));

export const observationPhotoRelations = relations(observationPhotos, ({ one }) => ({
  observation: one(observations, {
    fields: [observationPhotos.observationId],
    references: [observations.id],
  }),
}));

export const insertSurveySchema = z.object({
  siteName: z.string().min(1),
  address: z.string().optional(),
  surveyType: z.string().min(1),
  surveyDate: z.string().or(z.date()).transform((val) => new Date(val)),
  inspector: z.string().min(1),
  notes: z.string().optional(),
  enableGPS: z.boolean().optional().default(false),
  useTemplate: z.boolean().optional().default(false),
  requirePhotos: z.boolean().optional().default(false),
  status: z.string().optional().default("draft"),
  // Weather conditions
  weatherConditions: z.string().optional(),
  temperature: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  humidity: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  windSpeed: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  // Equipment tracking
  equipmentUsed: z.array(z.string()).optional(),
  calibrationDates: z.array(z.string()).optional(),
});

export const insertObservationSchema = z.object({
  surveyId: z.string().min(1),
  area: z.string().min(1),
  homogeneousArea: z.string().optional(),
  materialType: z.string().min(1),
  condition: z.string().min(1),
  quantity: z.string().optional(),
  riskLevel: z.string().optional(),
  sampleCollected: z.boolean().optional().default(false),
  sampleId: z.string().optional(),
  collectionMethod: z.string().optional(),
  sampleNotes: z.string().optional(),
  // Lab Results
  asbestosType: z.string().optional(),
  asbestosPercentage: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  leadResultMgKg: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  cadmiumResultMgKg: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  labReportFilename: z.string().optional(),
  latitude: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  longitude: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  notes: z.string().optional(),
});

export const insertObservationPhotoSchema = createInsertSchema(observationPhotos).omit({
  id: true,
  uploadedAt: true,
});

export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;
export type InsertObservation = z.infer<typeof insertObservationSchema>;
export type Observation = typeof observations.$inferSelect;
export type InsertObservationPhoto = z.infer<typeof insertObservationPhotoSchema>;
export type ObservationPhoto = typeof observationPhotos.$inferSelect;
