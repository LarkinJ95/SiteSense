import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

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
  status: text("status").notNull().default("draft"), // draft, scheduled, in-progress, samples-sent-to-lab, report-completed, report-sent, completed, on-hold, archived
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

// Personnel profiles for personal air monitoring
export const personnelProfiles = pgTable('personnel_profiles', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  employeeId: text('employee_id'),
  jobTitle: text('job_title'),
  department: text('department'),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  certifications: text('certifications').array(),
  medicalClearance: boolean('medical_clearance').default(false),
  lastMedicalDate: text('last_medical_date'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// Air monitoring jobs - main container for air sampling projects
export const airMonitoringJobs = pgTable('air_monitoring_jobs', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  surveyId: varchar('survey_id').references(() => surveys.id),
  
  // Job identification
  jobName: text('job_name').notNull(),
  jobNumber: text('job_number').notNull(),
  clientName: text('client_name'),
  projectManager: text('project_manager'),
  
  // Location details
  siteName: text('site_name').notNull(),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country').default('USA'),
  coordinates: text('coordinates'), // GPS coordinates
  
  // Job timing
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  actualStartDate: timestamp('actual_start_date'),
  actualEndDate: timestamp('actual_end_date'),
  
  // Weather and environmental conditions
  weatherConditions: text('weather_conditions'),
  temperature: decimal('temperature'), // °C
  humidity: decimal('humidity'), // %
  barometricPressure: decimal('barometric_pressure'), // kPa
  windSpeed: decimal('wind_speed'), // m/s
  windDirection: text('wind_direction'),
  precipitation: text('precipitation'),
  visibility: text('visibility'),
  
  // Job details
  workDescription: text('work_description'),
  hazardsPotential: text('hazards_potential').array(),
  controlMeasures: text('control_measures').array(),
  safetyNotes: text('safety_notes'),
  
  // Status and workflow
  status: text('status', {
    enum: ['planning', 'setup', 'sampling', 'complete', 'lab-analysis', 'reporting', 'closed']
  }).default('planning'),
  
  // Documentation
  permits: text('permits').array(),
  photos: text('photos').array(),
  reports: text('reports').array(),
  
  // Team information
  fieldCrew: text('field_crew').array(),
  supervisor: text('supervisor'),
  
  // Notes and additional info
  notes: text('notes'),
  
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// Daily weather logs for multi-day air monitoring
export const dailyWeatherLogs = pgTable('daily_weather_logs', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  jobId: text('job_id').references(() => airMonitoringJobs.id, { onDelete: 'cascade' }).notNull(),
  logDate: text('log_date').notNull(), // YYYY-MM-DD format
  logTime: timestamp('log_time').notNull(),
  
  // Weather conditions in US standard units
  weatherConditions: text('weather_conditions'),
  temperature: decimal('temperature'), // °F
  humidity: decimal('humidity'), // %
  barometricPressure: decimal('barometric_pressure'), // inHg
  windSpeed: decimal('wind_speed'), // mph
  windDirection: text('wind_direction'),
  precipitation: text('precipitation'),
  visibility: text('visibility'),
  
  // Additional environmental factors
  notes: text('notes'),
  loggedBy: text('logged_by'),
  coordinates: text('coordinates'), // GPS coordinates when logged
  
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// Air monitoring samples
export const airSamples = pgTable('air_samples', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  jobId: text('job_id').references(() => airMonitoringJobs.id, { onDelete: 'cascade' }).notNull(),
  surveyId: varchar('survey_id').references(() => surveys.id),
  personnelId: text('personnel_id').references(() => personnelProfiles.id),
  sampleType: text('sample_type', { 
    enum: ['personal', 'area', 'background', 'outdoor'] 
  }).notNull(),
  analyte: text('analyte', {
    enum: ['asbestos', 'lead', 'cadmium', 'hexavalent_chromium', 'silica', 'heavy_metals', 'benzene', 'toluene', 'other']
  }).notNull(),
  customAnalyte: text('custom_analyte'), // For "other" analyte type
  samplingMethod: text('sampling_method', {
    enum: ['pcm', 'tem', 'plm', 'xrf', 'icp', 'gravimetric', 'active', 'passive']
  }),
  pumpId: text('pump_id'),
  flowRate: decimal('flow_rate'), // L/min
  samplingDuration: integer('sampling_duration'), // minutes
  totalVolume: decimal('total_volume'), // L
  
  // Location and environmental data
  location: text('location'),
  area: text('area'),
  building: text('building'),
  floor: text('floor'),
  room: text('room'),
  latitude: decimal('latitude'),
  longitude: decimal('longitude'),
  temperature: decimal('temperature'), // °C
  humidity: decimal('humidity'), // %
  pressure: decimal('pressure'), // kPa
  windSpeed: decimal('wind_speed'), // m/s
  windDirection: text('wind_direction'),
  
  // Timing
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  
  // Chain of custody
  collectedBy: text('collected_by').notNull(),
  monitorWornBy: text('monitor_worn_by'), // Personnel wearing the monitor (for personal samples)
  witnessedBy: text('witnessed_by'),
  chainOfCustody: text('chain_of_custody'),
  
  // Laboratory information
  labId: text('lab_id'),
  labSampleId: text('lab_sample_id'),
  analysisMethod: text('analysis_method'),
  reportingLimit: decimal('reporting_limit'),
  detectionLimit: decimal('detection_limit'),
  
  // Results
  result: decimal('result'),
  resultUnit: text('result_unit'),
  uncertainty: decimal('uncertainty'),
  qualifiers: text('qualifiers').array(),
  exceedsLimit: boolean('exceeds_limit').default(false),
  regulatoryLimit: decimal('regulatory_limit'),
  limitType: text('limit_type'), // PEL, TLV, REL, etc.
  
  // Quality control
  blankCorrection: boolean('blank_correction').default(false),
  qcFlags: text('qc_flags').array(),
  
  // Status tracking
  status: text('status', {
    enum: ['collecting', 'collected', 'shipped', 'analyzing', 'completed', 'cancelled']
  }).default('collecting'),
  
  // Photos and documentation
  samplePhotos: text('sample_photos').array(),
  fieldNotes: text('field_notes'),
  
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// Air monitoring equipment
export const airMonitoringEquipment = pgTable('air_monitoring_equipment', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  equipmentType: text('equipment_type', {
    enum: ['pump', 'cassette', 'tube', 'badge', 'meter', 'other']
  }).notNull(),
  manufacturer: text('manufacturer'),
  model: text('model'),
  serialNumber: text('serial_number'),
  calibrationDate: timestamp('calibration_date'),
  calibrationDue: timestamp('calibration_due'),
  flowRateRange: text('flow_rate_range'),
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').default(sql`now()`),
});

// Define relations for air monitoring
export const personnelRelations = relations(personnelProfiles, ({ many }) => ({
  airSamples: many(airSamples),
}));

export const airSampleRelations = relations(airSamples, ({ one }) => ({
  survey: one(surveys, {
    fields: [airSamples.surveyId],
    references: [surveys.id],
  }),
  personnel: one(personnelProfiles, {
    fields: [airSamples.personnelId],
    references: [personnelProfiles.id],
  }),
  job: one(airMonitoringJobs, {
    fields: [airSamples.jobId],
    references: [airMonitoringJobs.id],
  }),
}));

export const airMonitoringJobRelations = relations(airMonitoringJobs, ({ many, one }) => ({
  airSamples: many(airSamples),
  dailyWeatherLogs: many(dailyWeatherLogs),
  survey: one(surveys, {
    fields: [airMonitoringJobs.surveyId],
    references: [surveys.id],
  }),
}));

export const dailyWeatherLogRelations = relations(dailyWeatherLogs, ({ one }) => ({
  job: one(airMonitoringJobs, {
    fields: [dailyWeatherLogs.jobId],
    references: [airMonitoringJobs.id],
  }),
}));

// Update survey relations
export const surveyRelations = relations(surveys, ({ many }) => ({
  observations: many(observations),
  airSamples: many(airSamples),
}));

// Create Zod schemas
export const insertPersonnelProfileSchema = createInsertSchema(personnelProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirMonitoringJobSchema = createInsertSchema(airMonitoringJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirSampleSchema = createInsertSchema(airSamples).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirMonitoringEquipmentSchema = createInsertSchema(airMonitoringEquipment).omit({
  id: true,
  createdAt: true,
});

export const insertDailyWeatherLogSchema = createInsertSchema(dailyWeatherLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;
export type InsertObservation = z.infer<typeof insertObservationSchema>;
export type Observation = typeof observations.$inferSelect;
export type InsertObservationPhoto = z.infer<typeof insertObservationPhotoSchema>;
export type ObservationPhoto = typeof observationPhotos.$inferSelect;
export type PersonnelProfile = typeof personnelProfiles.$inferSelect;
export type InsertPersonnelProfile = z.infer<typeof insertPersonnelProfileSchema>;
export type AirMonitoringJob = typeof airMonitoringJobs.$inferSelect;
export type InsertAirMonitoringJob = z.infer<typeof insertAirMonitoringJobSchema>;
export type AirSample = typeof airSamples.$inferSelect;
export type InsertAirSample = z.infer<typeof insertAirSampleSchema>;
export type AirMonitoringEquipment = typeof airMonitoringEquipment.$inferSelect;
export type InsertAirMonitoringEquipment = z.infer<typeof insertAirMonitoringEquipmentSchema>;
export type DailyWeatherLog = typeof dailyWeatherLogs.$inferSelect;
export type InsertDailyWeatherLog = z.infer<typeof insertDailyWeatherLogSchema>;
