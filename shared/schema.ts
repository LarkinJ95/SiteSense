import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "set null" }),
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

export const asbestosSamples = pgTable("asbestos_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  functionalArea: text("functional_area").notNull(),
  homogeneousArea: text("homogeneous_area").notNull(),
  sampleNumber: text("sample_number").notNull(),
  materialType: text("material_type").notNull(),
  sampleDescription: text("sample_description"),
  sampleLocation: text("sample_location"),
  estimatedQuantity: text("estimated_quantity"),
  quantityUnit: text("quantity_unit"),
  condition: text("condition"),
  collectionMethod: text("collection_method"),
  asbestosType: text("asbestos_type"),
  asbestosPercent: decimal("asbestos_percent"),
  results: text("results"),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const asbestosSamplePhotos = pgTable("asbestos_sample_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sampleId: varchar("sample_id").notNull().references(() => asbestosSamples.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`),
});

export const asbestosSampleLayers = pgTable("asbestos_sample_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sampleId: varchar("sample_id").notNull().references(() => asbestosSamples.id, { onDelete: "cascade" }),
  layerNumber: integer("layer_number").notNull(),
  materialType: text("material_type"),
  asbestosType: text("asbestos_type"),
  asbestosPercent: decimal("asbestos_percent"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const paintSamples = pgTable("paint_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  functionalArea: text("functional_area").notNull(),
  sampleNumber: text("sample_number").notNull(),
  sampleDescription: text("sample_description"),
  sampleLocation: text("sample_location"),
  substrate: text("substrate"),
  substrateOther: text("substrate_other"),
  collectionMethod: text("collection_method"),
  leadResultMgKg: decimal("lead_result_mg_kg"),
  cadmiumResultMgKg: decimal("cadmium_result_mg_kg"),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const paintSamplePhotos = pgTable("paint_sample_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sampleId: varchar("sample_id").notNull().references(() => paintSamples.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`),
});

export const homogeneousAreas = pgTable("homogeneous_areas", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  haId: text("ha_id"),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const functionalAreas = pgTable("functional_areas", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  length: decimal("length"),
  width: decimal("width"),
  height: decimal("height"),
  wallCount: integer("wall_count"),
  doorCount: integer("door_count"),
  windowCount: integer("window_count"),
  sqft: decimal("sqft"),
  wallSqft: decimal("wall_sqft"),
  photoUrl: text("photo_url"),
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
  organizationId: z.string().optional(),
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
  condition: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional().default("Unknown")
  ),
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

export const insertAsbestosSampleSchema = z.object({
  surveyId: z.string().min(1),
  functionalArea: z.string().min(1),
  homogeneousArea: z.string().min(1),
  sampleNumber: z.string().optional(),
  materialType: z.string().min(1),
  sampleDescription: z.string().optional(),
  sampleLocation: z.string().optional(),
  estimatedQuantity: z.string().optional(),
  quantityUnit: z.string().optional(),
  condition: z.string().optional(),
  collectionMethod: z.string().optional(),
  asbestosType: z.string().optional(),
  asbestosPercent: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  results: z.string().optional(),
  latitude: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  longitude: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  notes: z.string().optional(),
});

export const insertPaintSampleSchema = z.object({
  surveyId: z.string().min(1),
  functionalArea: z.string().min(1),
  sampleNumber: z.string().min(1),
  sampleDescription: z.string().optional(),
  sampleLocation: z.string().optional(),
  substrate: z.string().optional(),
  substrateOther: z.string().optional(),
  collectionMethod: z.string().optional(),
  leadResultMgKg: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  cadmiumResultMgKg: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  latitude: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  longitude: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  notes: z.string().optional(),
});

export const insertAsbestosSampleLayerSchema = z.object({
  sampleId: z.string().min(1),
  layerNumber: z.number().int().min(1),
  materialType: z.string().optional(),
  asbestosType: z.string().optional(),
  asbestosPercent: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  description: z.string().optional(),
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
  stateAccreditationNumber: text('state_accreditation_number'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// Air monitoring jobs - main container for air sampling projects
export const airMonitoringJobs = pgTable('air_monitoring_jobs', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  surveyId: varchar('survey_id').references(() => surveys.id),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: "set null" }),
  
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
  sampleNumber: text('sample_number'),
  sampleType: text('sample_type', { 
    enum: ['area', 'blank', 'personal', 'excursion', 'clearance', 'other'] 
  }).notNull(),
  customSampleType: text('custom_sample_type'),
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
  
  // Results posting
  labReportDate: timestamp('lab_report_date'),
  reportedBy: text('reported_by'),
  reviewedBy: text('reviewed_by'),
  reportNotes: text('report_notes'),
  labReportFilename: text('lab_report_filename'),
  labReportUploadedAt: timestamp('lab_report_uploaded_at'),
  
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

export const airMonitoringDocuments = pgTable("air_monitoring_documents", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  jobId: text("job_id").references(() => airMonitoringJobs.id, { onDelete: "cascade" }).notNull(),
  documentType: text("document_type"),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`),
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

// Field tools equipment tracking
export const fieldToolsEquipment = pgTable('field_tools_equipment', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  serialNumber: text('serial_number'),
  calibrationDate: text('calibration_date'),
  nextCalibration: text('next_calibration'),
  status: text('status'), // calibrated, due, overdue
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// User profile settings (linked to auth user id)
export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  organization: text('organization'),
  jobTitle: text('job_title'),
  department: text('department'),
  address: text('address'),
  role: text('role'),
  status: text('status'),
  avatar: text('avatar'),
  preferences: text('preferences'), // JSON string
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

// Organizations
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  domain: text('domain'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

export const organizationMembers = pgTable('organization_members', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  role: text('role').default('member'),
  status: text('status').default('active'),
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
  documents: many(airMonitoringDocuments),
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

export const organizationRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
}));

export const organizationMemberRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
}));

// Update survey relations
export const surveyRelations = relations(surveys, ({ many }) => ({
  observations: many(observations),
  airSamples: many(airSamples),
  homogeneousAreas: many(homogeneousAreas),
  functionalAreas: many(functionalAreas),
}));

// Create Zod schemas
export const insertPersonnelProfileSchema = createInsertSchema(personnelProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  stateAccreditationNumber: z.string().optional(),
});

export const insertAirMonitoringJobSchema = createInsertSchema(airMonitoringJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.preprocess((value) => {
    if (value instanceof Date) return value;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date()),
  endDate: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) return value;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date().nullable().optional()),
  actualStartDate: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (value instanceof Date) return value;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date().optional()),
  actualEndDate: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (value instanceof Date) return value;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date().optional()),
});

export const insertAirSampleSchema = createInsertSchema(airSamples).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Lab Results section
  result: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  resultUnit: z.string().optional(),
  uncertainty: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  qualifiers: z.array(z.string()).optional(),
  exceedsLimit: z.boolean().optional(),
  regulatoryLimit: z.string().or(z.number()).optional().transform((val) => val ? val.toString() : undefined),
  limitType: z.string().optional(),
  
  // Analysis results posting
  labReportDate: z.string().or(z.date()).optional().transform((val) => val ? new Date(val) : undefined),
  reportedBy: z.string().optional(),
  reviewedBy: z.string().optional(),
  reportNotes: z.string().optional(),
});

export const insertHomogeneousAreaSchema = createInsertSchema(homogeneousAreas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFunctionalAreaSchema = createInsertSchema(functionalAreas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirMonitoringDocumentSchema = createInsertSchema(airMonitoringDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertAirMonitoringEquipmentSchema = createInsertSchema(airMonitoringEquipment).omit({
  id: true,
  createdAt: true,
});

export const insertFieldToolsEquipmentSchema = createInsertSchema(fieldToolsEquipment).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
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
export type AsbestosSample = typeof asbestosSamples.$inferSelect;
export type InsertAsbestosSample = z.infer<typeof insertAsbestosSampleSchema>;
export type AsbestosSamplePhoto = typeof asbestosSamplePhotos.$inferSelect;
export type AsbestosSampleLayer = typeof asbestosSampleLayers.$inferSelect;
export type InsertAsbestosSampleLayer = z.infer<typeof insertAsbestosSampleLayerSchema>;
export type PaintSample = typeof paintSamples.$inferSelect;
export type InsertPaintSample = z.infer<typeof insertPaintSampleSchema>;
export type PaintSamplePhoto = typeof paintSamplePhotos.$inferSelect;
export type PersonnelProfile = typeof personnelProfiles.$inferSelect;
export type HomogeneousArea = typeof homogeneousAreas.$inferSelect;
export type FunctionalArea = typeof functionalAreas.$inferSelect;
export type InsertPersonnelProfile = z.infer<typeof insertPersonnelProfileSchema>;
export type AirMonitoringJob = typeof airMonitoringJobs.$inferSelect;
export type InsertAirMonitoringJob = z.infer<typeof insertAirMonitoringJobSchema>;
export type AirSample = typeof airSamples.$inferSelect;
export type InsertAirSample = z.infer<typeof insertAirSampleSchema>;
export type AirMonitoringDocument = typeof airMonitoringDocuments.$inferSelect;
export type InsertAirMonitoringDocument = z.infer<typeof insertAirMonitoringDocumentSchema>;
export type AirMonitoringEquipment = typeof airMonitoringEquipment.$inferSelect;
export type InsertAirMonitoringEquipment = z.infer<typeof insertAirMonitoringEquipmentSchema>;
export type FieldToolsEquipment = typeof fieldToolsEquipment.$inferSelect;
export type InsertFieldToolsEquipment = z.infer<typeof insertFieldToolsEquipmentSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type DailyWeatherLog = typeof dailyWeatherLogs.$inferSelect;
export type InsertDailyWeatherLog = z.infer<typeof insertDailyWeatherLogSchema>;

// Custom Report Builder
export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(), // survey, air_monitoring, compliance, custom
  sections: text("sections").array(), // array of section names
  fields: text("fields").array(), // array of field names to include
  filters: text("filters"), // JSON string of filter criteria
  layout: text("layout").default("standard"), // standard, detailed, summary
  includeCharts: boolean("include_charts").default(false),
  includePhotos: boolean("include_photos").default(true),
  includeMaps: boolean("include_maps").default(false),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  logoUrl: text("logo_url"),
  createdBy: text("created_by").notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Client Portal
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  portalAccess: boolean("portal_access").default(false),
  accessLevel: text("access_level").default("basic"), // basic, premium, enterprise
  allowDownloads: boolean("allow_downloads").default(true),
  allowComments: boolean("allow_comments").default(true),
  customBranding: boolean("custom_branding").default(false),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3b82f6"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Internal Messaging
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id"),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: 'cascade' }),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("direct"), // direct, survey_comment, system_alert
  priority: text("priority").default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  attachmentUrl: text("attachment_url"),
  parentMessageId: varchar("parent_message_id"), // Will be set up with relations
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Notification System
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // survey_update, message, system, compliance_alert, due_date
  relatedId: text("related_id"), // survey_id, message_id, etc.
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  actionUrl: text("action_url"),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  deliveryMethod: text("delivery_method").array(), // email, sms, in_app
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Chain of Custody
export const chainOfCustody = pgTable("chain_of_custody", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sampleId: text("sample_id").notNull(),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  currentCustodian: text("current_custodian").notNull(),
  previousCustodian: text("previous_custodian"),
  transferDate: timestamp("transfer_date").notNull(),
  transferReason: text("transfer_reason").notNull(),
  condition: text("condition").notNull(), // good, damaged, sealed, opened
  location: text("location").notNull(),
  temperature: decimal("temperature"),
  sealIntact: boolean("seal_intact").default(true),
  witnessName: text("witness_name"),
  witnessSignature: text("witness_signature"),
  digitalSignature: text("digital_signature"),
  photos: text("photos").array(),
  notes: text("notes"),
  barcodeScanned: boolean("barcode_scanned").default(false),
  gpsCoordinates: text("gps_coordinates"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Compliance Tracking
export const complianceRules = pgTable("compliance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  regulatoryBody: text("regulatory_body").notNull(), // EPA, OSHA, local_authority
  ruleType: text("rule_type").notNull(), // time_limit, documentation, testing, reporting
  applicableSurveyTypes: text("applicable_survey_types").array(),
  threshold: text("threshold"), // JSON string for complex thresholds
  warningDays: integer("warning_days").default(30),
  criticalDays: integer("critical_days").default(7),
  autoCheck: boolean("auto_check").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const complianceTracking = pgTable("compliance_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  ruleId: varchar("rule_id").notNull().references(() => complianceRules.id, { onDelete: 'cascade' }),
  status: text("status").notNull(), // compliant, warning, critical, non_compliant
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  evidence: text("evidence"), // file URLs or references
  notes: text("notes"),
  assignedTo: text("assigned_to"),
  checkedBy: text("checked_by"),
  lastChecked: timestamp("last_checked").default(sql`now()`),
  autoGenerated: boolean("auto_generated").default(false),
});

// Real-time Collaboration
export const collaborationSessions = pgTable("collaboration_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  hostUserId: text("host_user_id").notNull(),
  participants: text("participants").array(), // array of user IDs
  sessionType: text("session_type").default("survey_edit"), // survey_edit, review, discussion
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity").default(sql`now()`),
  sharedCursor: text("shared_cursor"), // JSON for cursor positions
  permissions: text("permissions"), // JSON for user permissions
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const collaborationChanges = pgTable("collaboration_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => collaborationSessions.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull(),
  changeType: text("change_type").notNull(), // field_update, observation_add, photo_upload, etc.
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: timestamp("timestamp").default(sql`now()`),
});

// Create Zod schemas for new tables
export const reportBuilderSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const clientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const messageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const notificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const custodySchema = createInsertSchema(chainOfCustody).omit({
  id: true,
  createdAt: true,
});

export const complianceRuleSchema = createInsertSchema(complianceRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const complianceTrackingSchema = createInsertSchema(complianceTracking).omit({
  id: true,
  lastChecked: true,
});

export const collaborationSchema = createInsertSchema(collaborationSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const collaborationChangeSchema = createInsertSchema(collaborationChanges).omit({
  id: true,
  timestamp: true,
});

// Export types for new features
export type InsertReportTemplate = z.infer<typeof reportBuilderSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertClient = z.infer<typeof clientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertMessage = z.infer<typeof messageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertNotification = z.infer<typeof notificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertCustody = z.infer<typeof custodySchema>;
export type ChainOfCustody = typeof chainOfCustody.$inferSelect;
export type InsertComplianceRule = z.infer<typeof complianceRuleSchema>;
export type ComplianceRule = typeof complianceRules.$inferSelect;
export type InsertComplianceTracking = z.infer<typeof complianceTrackingSchema>;
export type ComplianceTracking = typeof complianceTracking.$inferSelect;
export type InsertCollaborationSession = z.infer<typeof collaborationSchema>;
export type CollaborationSession = typeof collaborationSessions.$inferSelect;
export type InsertCollaborationChange = z.infer<typeof collaborationChangeSchema>;
export type CollaborationChange = typeof collaborationChanges.$inferSelect;
