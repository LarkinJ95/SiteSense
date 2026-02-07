import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, numeric } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const bool = (name: string) => integer(name, { mode: "boolean" });

export const surveys = sqliteTable("surveys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  siteName: text("site_name").notNull(),
  address: text("address"),
  jobNumber: text("job_number"),
  surveyType: text("survey_type").notNull(),
  surveyDate: timestamp("survey_date").notNull(),
  inspector: text("inspector").notNull(),
  notes: text("notes"),
  enableGPS: bool("enable_gps").default(false),
  useTemplate: bool("use_template").default(false),
  requirePhotos: bool("require_photos").default(false),
  status: text("status").notNull().default("draft"), // draft, scheduled, in-progress, samples-sent-to-lab, report-completed, report-sent, completed, on-hold, archived
  // Weather conditions during survey
  weatherConditions: text("weather_conditions"),
  temperature: numeric("temperature"), // in Fahrenheit
  humidity: numeric("humidity"), // percentage
  windSpeed: numeric("wind_speed"), // mph
  // Equipment tracking
  equipmentUsed: text("equipment_used", { mode: "json" }),
  calibrationDates: text("calibration_dates", { mode: "json" }),
  // Advanced survey features
  priority: text("priority").default("medium"), // low, medium, high, urgent
  clientName: text("client_name"),
  projectNumber: text("project_number"),
  estimatedDuration: integer("estimated_duration"), // in hours
  actualDuration: integer("actual_duration"), // in hours
  teamMembers: text("team_members", { mode: "json" }),
  safetyRequirements: text("safety_requirements", { mode: "json" }),
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
  qaChecked: bool("qa_checked").default(false),
  qaCheckDate: timestamp("qa_check_date"),
  qaCheckedBy: text("qa_checked_by"),
  // Data management
  dataClassification: text("data_classification").default("standard"), // public, internal, confidential, restricted
  retentionPeriod: integer("retention_period").default(2555), // days (7 years default)
  archiveDate: timestamp("archive_date"),
  exportCount: integer("export_count").default(0),
  lastExported: timestamp("last_exported"),
  sitePhotoUrl: text("site_photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  area: text("area").notNull(),
  homogeneousArea: text("homogeneous_area"),
  materialType: text("material_type").notNull(),
  condition: text("condition").notNull(),
  quantity: text("quantity"),
  riskLevel: text("risk_level"), // low, medium, high, critical
  sampleCollected: bool("sample_collected").default(false),
  sampleId: text("sample_id"),
  collectionMethod: text("collection_method"),
  sampleNotes: text("sample_notes"),
  // Lab Results
  asbestosType: text("asbestos_type"), // chrysotile, amosite, crocidolite, etc. or "None Detected"
  asbestosPercentage: numeric("asbestos_percentage"),
  leadResultMgKg: numeric("lead_result_mg_kg"),
  leadResultPercent: numeric("lead_result_percent"), // calculated: leadResultMgKg / 10000
  cadmiumResultMgKg: numeric("cadmium_result_mg_kg"),
  cadmiumResultPercent: numeric("cadmium_result_percent"), // calculated: cadmiumResultMgKg / 10000
  labReportFilename: text("lab_report_filename"),
  labReportUploadedAt: timestamp("lab_report_uploaded_at"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  notes: text("notes"),
  // Advanced observation features
  observationType: text("observation_type").default("visual"), // visual, sample, measurement, photo
  priority: text("priority").default("normal"), // low, normal, high, urgent
  followUpRequired: bool("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  // Quality and validation
  verified: bool("verified").default(false),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const asbestosSamples = sqliteTable("asbestos_samples", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
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
  asbestosPercent: numeric("asbestos_percent"),
  results: text("results"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const asbestosSamplePhotos = sqliteTable("asbestos_sample_photos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sampleId: text("sample_id").notNull().references(() => asbestosSamples.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const asbestosSampleLayers = sqliteTable("asbestos_sample_layers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sampleId: text("sample_id").notNull().references(() => asbestosSamples.id, { onDelete: "cascade" }),
  layerNumber: integer("layer_number").notNull(),
  materialType: text("material_type"),
  asbestosType: text("asbestos_type"),
  asbestosPercent: numeric("asbestos_percent"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paintSamples = sqliteTable("paint_samples", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  functionalArea: text("functional_area").notNull(),
  sampleNumber: text("sample_number").notNull(),
  sampleDescription: text("sample_description"),
  sampleLocation: text("sample_location"),
  substrate: text("substrate"),
  substrateOther: text("substrate_other"),
  collectionMethod: text("collection_method"),
  leadResultMgKg: numeric("lead_result_mg_kg"),
  cadmiumResultMgKg: numeric("cadmium_result_mg_kg"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paintSamplePhotos = sqliteTable("paint_sample_photos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sampleId: text("sample_id").notNull().references(() => paintSamples.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const homogeneousAreas = sqliteTable("homogeneous_areas", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  haId: text("ha_id"),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const functionalAreas = sqliteTable("functional_areas", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  length: numeric("length"),
  width: numeric("width"),
  height: numeric("height"),
  wallCount: integer("wall_count"),
  doorCount: integer("door_count"),
  windowCount: integer("window_count"),
  sqft: numeric("sqft"),
  wallSqft: numeric("wall_sqft"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const observationPhotos = sqliteTable("observation_photos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  observationId: text("observation_id").notNull().references(() => observations.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
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
export const personnelProfiles = sqliteTable('personnel_profiles', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  employeeId: text('employee_id'),
  jobTitle: text('job_title'),
  department: text('department'),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  certifications: text("certifications", { mode: "json" }),
  medicalClearance: bool('medical_clearance').default(false),
  lastMedicalDate: text('last_medical_date'),
  stateAccreditationNumber: text('state_accreditation_number'),
  notes: text('notes'),
  isActive: bool('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Personnel module (org-scoped, stable IDs)
export const personnel = sqliteTable("personnel", {
  personId: text("person_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  tradeRole: text("trade_role"),
  employeeId: text("employee_id"),
  email: text("email"),
  phone: text("phone"),
  respiratorClearanceDate: text("respirator_clearance_date"), // YYYY-MM-DD
  fitTestDate: text("fit_test_date"), // YYYY-MM-DD
  medicalSurveillanceDate: text("medical_surveillance_date"), // YYYY-MM-DD
  active: bool("active").default(true),
  // Marks whether this person should be selectable as a survey inspector.
  isInspector: bool("is_inspector").default(false),
  createdByUserId: text("created_by_user_id"),
  updatedByUserId: text("updated_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const personnelJobAssignments = sqliteTable("personnel_job_assignments", {
  assignmentId: text("assignment_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  personId: text("person_id").notNull().references(() => personnel.personId, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => airMonitoringJobs.id, { onDelete: "cascade" }),
  dateFrom: timestamp("date_from"),
  dateTo: timestamp("date_to"),
  shiftDate: text("shift_date"), // YYYY-MM-DD (optional)
  roleOnJob: text("role_on_job"),
  supervisorPersonId: text("supervisor_person_id"),
  supervisorName: text("supervisor_name"),
  notes: text("notes"),
  createdByUserId: text("created_by_user_id"),
  updatedByUserId: text("updated_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Optional org-configurable limits. If not configured, we do not flag exceedances.
export const exposureLimits = sqliteTable("exposure_limits", {
  limitId: text("limit_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  profileKey: text("profile_key").notNull(), // OSHA | MIOSHA | custom
  analyte: text("analyte").notNull(), // asbestos, silica, lead, cadmium, etc.
  units: text("units").notNull(),
  actionLevel: numeric("action_level"),
  pel: numeric("pel"),
  rel: numeric("rel"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const exposureRecords = sqliteTable("exposure_records", {
  exposureId: text("exposure_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  personId: text("person_id").notNull().references(() => personnel.personId, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => airMonitoringJobs.id, { onDelete: "cascade" }),
  airSampleId: text("air_sample_id").references(() => airSamples.id, { onDelete: "set null" }),
  sampleRunId: text("sample_run_id"),
  date: timestamp("date"), // sample date/time
  analyte: text("analyte").notNull(),
  durationMinutes: integer("duration_minutes"),
  concentration: numeric("concentration"),
  units: text("units"),
  method: text("method"),
  sampleType: text("sample_type"), // personal | area
  taskActivity: text("task_activity"),
  ppeLevel: text("ppe_level"),
  // computed snapshot (auditable)
  twa8hr: numeric("twa_8hr"),
  profileKey: text("profile_key"),
  computedVersion: integer("computed_version").default(1),
  limitType: text("limit_type"), // AL | PEL | REL
  limitValue: numeric("limit_value"),
  percentOfLimit: numeric("percent_of_limit"),
  exceedanceFlag: bool("exceedance_flag").default(false),
  nearMissFlag: bool("near_miss_flag").default(false),
  sourceRefs: text("source_refs", { mode: "json" }), // lab result id, field sheet id, etc.
  createdByUserId: text("created_by_user_id"),
  updatedByUserId: text("updated_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Air monitoring jobs - main container for air sampling projects
export const airMonitoringJobs = sqliteTable('air_monitoring_jobs', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  surveyId: text('survey_id').references(() => surveys.id),
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
  temperature: numeric('temperature'), // °F
  humidity: numeric('humidity'), // %
  barometricPressure: numeric('barometric_pressure'), // kPa
  windSpeed: numeric('wind_speed'), // mph
  windDirection: text('wind_direction'),
  precipitation: text('precipitation'),
  visibility: text('visibility'),
  
  // Job details
  workDescription: text('work_description'),
  hazardsPotential: text("hazards_potential", { mode: "json" }),
  controlMeasures: text("control_measures", { mode: "json" }),
  safetyNotes: text('safety_notes'),
  
  // Status and workflow
  status: text('status', {
    enum: ['planning', 'setup', 'sampling', 'complete', 'lab-analysis', 'reporting', 'closed']
  }).default('planning'),
  
  // Documentation
  permits: text("permits", { mode: "json" }),
  photos: text("photos", { mode: "json" }),
  reports: text("reports", { mode: "json" }),
  
  // Team information
  fieldCrew: text("field_crew", { mode: "json" }),
  supervisor: text('supervisor'),
  
  // Notes and additional info
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Daily weather logs for multi-day air monitoring
export const dailyWeatherLogs = sqliteTable('daily_weather_logs', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  jobId: text('job_id').references(() => airMonitoringJobs.id, { onDelete: 'cascade' }).notNull(),
  logDate: text('log_date').notNull(), // YYYY-MM-DD format
  logTime: timestamp('log_time').notNull(),
  
  // Weather conditions in US standard units
  weatherConditions: text('weather_conditions'),
  temperature: numeric('temperature'), // °F
  humidity: numeric('humidity'), // %
  barometricPressure: numeric('barometric_pressure'), // inHg
  windSpeed: numeric('wind_speed'), // mph
  windDirection: text('wind_direction'),
  precipitation: text('precipitation'),
  visibility: text('visibility'),
  
  // Additional environmental factors
  notes: text('notes'),
  loggedBy: text('logged_by'),
  coordinates: text('coordinates'), // GPS coordinates when logged
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Air monitoring samples
export const airSamples = sqliteTable('air_samples', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  jobId: text('job_id').references(() => airMonitoringJobs.id, { onDelete: 'cascade' }).notNull(),
  surveyId: text('survey_id').references(() => surveys.id),
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
  flowRate: numeric('flow_rate'), // L/min
  samplingDuration: integer('sampling_duration'), // minutes
  totalVolume: numeric('total_volume'), // L
  
  // Location and environmental data
  location: text('location'),
  area: text('area'),
  building: text('building'),
  floor: text('floor'),
  room: text('room'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  temperature: numeric('temperature'), // °F
  humidity: numeric('humidity'), // %
  pressure: numeric('pressure'), // kPa
  windSpeed: numeric('wind_speed'), // mph
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
  reportingLimit: numeric('reporting_limit'),
  detectionLimit: numeric('detection_limit'),
  
  // Results
  result: numeric('result'),
  resultUnit: text('result_unit'),
  uncertainty: numeric('uncertainty'),
  qualifiers: text("qualifiers", { mode: "json" }),
  exceedsLimit: bool('exceeds_limit').default(false),
  regulatoryLimit: numeric('regulatory_limit'),
  limitType: text('limit_type'), // PEL, TLV, REL, etc.
  
  // Results posting
  labReportDate: timestamp('lab_report_date'),
  reportedBy: text('reported_by'),
  reviewedBy: text('reviewed_by'),
  reportNotes: text('report_notes'),
  labReportFilename: text('lab_report_filename'),
  labReportUploadedAt: timestamp('lab_report_uploaded_at'),
  
  // Quality control
  blankCorrection: bool('blank_correction').default(false),
  qcFlags: text("qc_flags", { mode: "json" }),
  
  // Status tracking
  status: text('status', {
    enum: ['collecting', 'collected', 'shipped', 'analyzing', 'completed', 'cancelled']
  }).default('collecting'),
  
  // Photos and documentation
  samplePhotos: text("sample_photos", { mode: "json" }),
  fieldNotes: text('field_notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const airMonitoringDocuments = sqliteTable("air_monitoring_documents", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  jobId: text("job_id").references(() => airMonitoringJobs.id, { onDelete: "cascade" }).notNull(),
  documentType: text("document_type"),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Air monitoring equipment
export const airMonitoringEquipment = sqliteTable('air_monitoring_equipment', {
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
  isActive: bool('is_active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Field tools equipment tracking
export const fieldToolsEquipment = sqliteTable('field_tools_equipment', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  serialNumber: text('serial_number'),
  calibrationDate: text('calibration_date'),
  nextCalibration: text('next_calibration'),
  status: text('status'), // calibrated, due, overdue
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User profile settings (linked to auth user id)
export const userProfiles = sqliteTable('user_profiles', {
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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Password auth (D1-backed)
export const authUsers = sqliteTable("auth_users", {
  userId: text("user_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const authSessions = sqliteTable("auth_sessions", {
  sessionId: text("session_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => authUsers.userId, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
});

// Organizations
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  domain: text('domain'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const organizationMembers = sqliteTable('organization_members', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  role: text('role').default('member'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit log (org-scoped via optional organizationId; historical rows may be null)
// Backed by the existing `audit_log` table created in the initial migration.
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  oldValues: text('old_values'),
  newValues: text('new_values'),
  userId: text('user_id').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Organization-level Equipment Tracking (Air Sampling Pumps)
export const equipment = sqliteTable("equipment", {
  equipmentId: text("equipment_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // "Air Sampling Pump" initially
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number").notNull(),
  assetTag: text("asset_tag"),
  status: text("status").notNull().default("in_service"), // in_service | out_for_cal | repair | retired | lost
  assignedToUserId: text("assigned_to_user_id"),
  location: text("location"),
  calibrationIntervalDays: integer("calibration_interval_days"),
  lastCalibrationDate: text("last_calibration_date"), // YYYY-MM-DD
  calibrationDueDate: text("calibration_due_date"), // YYYY-MM-DD (stored + derived)
  active: bool("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const equipmentCalibrationEvents = sqliteTable("equipment_calibration_events", {
  calEventId: text("cal_event_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  equipmentId: text("equipment_id").notNull().references(() => equipment.equipmentId, { onDelete: "cascade" }),
  calDate: text("cal_date").notNull(), // YYYY-MM-DD
  calType: text("cal_type").notNull(), // annual | verification | as_found | as_left | repair
  performedBy: text("performed_by"),
  methodStandard: text("method_standard"),
  targetFlowLpm: numeric("target_flow_lpm"),
  asFoundFlowLpm: numeric("as_found_flow_lpm"),
  asLeftFlowLpm: numeric("as_left_flow_lpm"),
  tolerance: numeric("tolerance"),
  toleranceUnit: text("tolerance_unit"), // percent | lpm
  passFail: text("pass_fail"), // pass | fail | unknown
  certificateNumber: text("certificate_number"),
  certificateFileUrl: text("certificate_file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const equipmentUsage = sqliteTable("equipment_usage", {
  usageId: text("usage_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  equipmentId: text("equipment_id").notNull().references(() => equipment.equipmentId, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => airMonitoringJobs.id, { onDelete: "set null" }),
  usedFrom: timestamp("used_from"),
  usedTo: timestamp("used_to"),
  context: text("context"), // Air Sampling / PCM / TEM / etc.
  sampleRunId: text("sample_run_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const equipmentNotes = sqliteTable("equipment_notes", {
  noteId: text("note_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  equipmentId: text("equipment_id").notNull().references(() => equipment.equipmentId, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  createdByUserId: text("created_by_user_id").notNull(),
  noteText: text("note_text").notNull(),
  noteType: text("note_type"),
  visibility: text("visibility").default("org"), // org | private
});

export const equipmentDocuments = sqliteTable("equipment_documents", {
  documentId: text("document_id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  equipmentId: text("equipment_id").notNull().references(() => equipment.equipmentId, { onDelete: "cascade" }),
  filename: text("filename").notNull(), // R2 object key
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  docType: text("doc_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedByUserId: text("uploaded_by_user_id"),
  linkedEntityType: text("linked_entity_type"), // equipment | calibration_event | usage | note | other
  linkedEntityId: text("linked_entity_id"),
});

// Define relations for air monitoring
export const personnelRelations = relations(personnelProfiles, ({ many }) => ({
  airSamples: many(airSamples),
}));

export const personnelNewRelations = relations(personnel, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [personnel.organizationId],
    references: [organizations.id],
  }),
  assignments: many(personnelJobAssignments),
  exposureRecords: many(exposureRecords),
}));

export const personnelAssignmentRelations = relations(personnelJobAssignments, ({ one }) => ({
  person: one(personnel, {
    fields: [personnelJobAssignments.personId],
    references: [personnel.personId],
  }),
  job: one(airMonitoringJobs, {
    fields: [personnelJobAssignments.jobId],
    references: [airMonitoringJobs.id],
  }),
}));

export const exposureRecordRelations = relations(exposureRecords, ({ one }) => ({
  person: one(personnel, {
    fields: [exposureRecords.personId],
    references: [personnel.personId],
  }),
  job: one(airMonitoringJobs, {
    fields: [exposureRecords.jobId],
    references: [airMonitoringJobs.id],
  }),
  airSample: one(airSamples, {
    fields: [exposureRecords.airSampleId],
    references: [airSamples.id],
  }),
}));

export const exposureLimitRelations = relations(exposureLimits, ({ one }) => ({
  organization: one(organizations, {
    fields: [exposureLimits.organizationId],
    references: [organizations.id],
  }),
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
  auditLogs: many(auditLog),
}));

export const authUserRelations = relations(authUsers, ({ many }) => ({
  sessions: many(authSessions),
}));

export const authSessionRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, {
    fields: [authSessions.userId],
    references: [authUsers.userId],
  }),
}));

export const organizationMemberRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLog.organizationId],
    references: [organizations.id],
  }),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [equipment.organizationId],
    references: [organizations.id],
  }),
  calibrationEvents: many(equipmentCalibrationEvents),
  usage: many(equipmentUsage),
  notes: many(equipmentNotes),
  documents: many(equipmentDocuments),
}));

export const equipmentCalibrationEventRelations = relations(equipmentCalibrationEvents, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentCalibrationEvents.equipmentId],
    references: [equipment.equipmentId],
  }),
}));

export const equipmentUsageRelations = relations(equipmentUsage, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentUsage.equipmentId],
    references: [equipment.equipmentId],
  }),
  job: one(airMonitoringJobs, {
    fields: [equipmentUsage.jobId],
    references: [airMonitoringJobs.id],
  }),
}));

export const equipmentNotesRelations = relations(equipmentNotes, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentNotes.equipmentId],
    references: [equipment.equipmentId],
  }),
}));

export const equipmentDocumentsRelations = relations(equipmentDocuments, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentDocuments.equipmentId],
    references: [equipment.equipmentId],
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

export const insertPersonnelSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional().nullable(),
  tradeRole: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  respiratorClearanceDate: z.string().optional().nullable(),
  fitTestDate: z.string().optional().nullable(),
  medicalSurveillanceDate: z.string().optional().nullable(),
  active: z.boolean().optional(),
  isInspector: z.boolean().optional(),
});

export const insertPersonnelAssignmentSchema = z.object({
  personId: z.string().min(1),
  jobId: z.string().min(1),
  dateFrom: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date().optional()),
  dateTo: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date().optional()),
  shiftDate: z.string().optional().nullable(),
  roleOnJob: z.string().optional().nullable(),
  supervisorPersonId: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const upsertExposureLimitSchema = z.object({
  profileKey: z.string().min(1),
  analyte: z.string().min(1),
  units: z.string().min(1),
  actionLevel: z.string().or(z.number()).optional().transform((val) => (val === undefined || val === null || val === "" ? undefined : val.toString())),
  pel: z.string().or(z.number()).optional().transform((val) => (val === undefined || val === null || val === "" ? undefined : val.toString())),
  rel: z.string().or(z.number()).optional().transform((val) => (val === undefined || val === null || val === "" ? undefined : val.toString())),
});

export const insertAirMonitoringJobSchema = createInsertSchema(airMonitoringJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Drizzle's sqlite `numeric(...)` columns are modeled as strings. Accept number inputs from the UI and coerce.
  temperature: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return value;
    if (typeof value === "number") return value.toString();
    return value;
  }, z.string().nullable().optional()),
  humidity: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return value;
    if (typeof value === "number") return value.toString();
    return value;
  }, z.string().nullable().optional()),
  barometricPressure: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return value;
    if (typeof value === "number") return value.toString();
    return value;
  }, z.string().nullable().optional()),
  windSpeed: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return value;
    if (typeof value === "number") return value.toString();
    return value;
  }, z.string().nullable().optional()),
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

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  timestamp: true,
});

export const insertDailyWeatherLogSchema = createInsertSchema(dailyWeatherLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  logTime: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return value;
    if (value instanceof Date) return value;
    if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date()),
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
export type Personnel = typeof personnel.$inferSelect;
export type InsertPersonnel = z.infer<typeof insertPersonnelSchema>;
export type PersonnelJobAssignment = typeof personnelJobAssignments.$inferSelect;
export type InsertPersonnelJobAssignment = z.infer<typeof insertPersonnelAssignmentSchema>;
export type ExposureRecord = typeof exposureRecords.$inferSelect;
export type ExposureLimit = typeof exposureLimits.$inferSelect;
export type UpsertExposureLimit = z.infer<typeof upsertExposureLimitSchema>;
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
export type AuthUserRow = typeof authUsers.$inferSelect;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type DailyWeatherLog = typeof dailyWeatherLogs.$inferSelect;
export type InsertDailyWeatherLog = z.infer<typeof insertDailyWeatherLogSchema>;

// Custom Report Builder
export const reportTemplates = sqliteTable("report_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(), // survey, air_monitoring, compliance, custom
  sections: text("sections", { mode: "json" }), // array of section names
  fields: text("fields", { mode: "json" }), // array of field names to include
  filters: text("filters"), // JSON string of filter criteria
  layout: text("layout").default("standard"), // standard, detailed, summary
  includeCharts: bool("include_charts").default(false),
  includePhotos: bool("include_photos").default(true),
  includeMaps: bool("include_maps").default(false),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  logoUrl: text("logo_url"),
  createdBy: text("created_by").notNull(),
  isPublic: bool("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Portal
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  portalAccess: bool("portal_access").default(false),
  accessLevel: text("access_level").default("basic"), // basic, premium, enterprise
  allowDownloads: bool("allow_downloads").default(true),
  allowComments: bool("allow_comments").default(true),
  customBranding: bool("custom_branding").default(false),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3b82f6"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Internal Messaging
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id"),
  surveyId: text("survey_id").references(() => surveys.id, { onDelete: 'cascade' }),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("direct"), // direct, survey_comment, system_alert
  priority: text("priority").default("normal"), // low, normal, high, urgent
  isRead: bool("is_read").default(false),
  readAt: timestamp("read_at"),
  attachmentUrl: text("attachment_url"),
  parentMessageId: text("parent_message_id"), // Will be set up with relations
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification System
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // survey_update, message, system, compliance_alert, due_date
  relatedId: text("related_id"), // survey_id, message_id, etc.
  isRead: bool("is_read").default(false),
  readAt: timestamp("read_at"),
  actionUrl: text("action_url"),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  deliveryMethod: text("delivery_method", { mode: "json" }), // email, sms, in_app
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chain of Custody
export const chainOfCustody = sqliteTable("chain_of_custody", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sampleId: text("sample_id").notNull(),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  currentCustodian: text("current_custodian").notNull(),
  previousCustodian: text("previous_custodian"),
  transferDate: timestamp("transfer_date").notNull(),
  transferReason: text("transfer_reason").notNull(),
  condition: text("condition").notNull(), // good, damaged, sealed, opened
  location: text("location").notNull(),
  temperature: numeric("temperature"),
  sealIntact: bool("seal_intact").default(true),
  witnessName: text("witness_name"),
  witnessSignature: text("witness_signature"),
  digitalSignature: text("digital_signature"),
  photos: text("photos", { mode: "json" }),
  notes: text("notes"),
  barcodeScanned: bool("barcode_scanned").default(false),
  gpsCoordinates: text("gps_coordinates"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Compliance Tracking
export const complianceRules = sqliteTable("compliance_rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  regulatoryBody: text("regulatory_body").notNull(), // EPA, OSHA, local_authority
  ruleType: text("rule_type").notNull(), // time_limit, documentation, testing, reporting
  applicableSurveyTypes: text("applicable_survey_types", { mode: "json" }),
  threshold: text("threshold"), // JSON string for complex thresholds
  warningDays: integer("warning_days").default(30),
  criticalDays: integer("critical_days").default(7),
  autoCheck: bool("auto_check").default(true),
  isActive: bool("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const complianceTracking = sqliteTable("compliance_tracking", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  ruleId: text("rule_id").notNull().references(() => complianceRules.id, { onDelete: 'cascade' }),
  status: text("status").notNull(), // compliant, warning, critical, non_compliant
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  evidence: text("evidence"), // file URLs or references
  notes: text("notes"),
  assignedTo: text("assigned_to"),
  checkedBy: text("checked_by"),
  lastChecked: timestamp("last_checked").defaultNow(),
  autoGenerated: bool("auto_generated").default(false),
});

// Real-time Collaboration
export const collaborationSessions = sqliteTable("collaboration_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  hostUserId: text("host_user_id").notNull(),
  participants: text("participants", { mode: "json" }), // array of user IDs
  sessionType: text("session_type").default("survey_edit"), // survey_edit, review, discussion
  isActive: bool("is_active").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
  sharedCursor: text("shared_cursor"), // JSON for cursor positions
  permissions: text("permissions"), // JSON for user permissions
  createdAt: timestamp("created_at").defaultNow(),
});

export const collaborationChanges = sqliteTable("collaboration_changes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().references(() => collaborationSessions.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull(),
  changeType: text("change_type").notNull(), // field_update, observation_add, photo_upload, etc.
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: timestamp("timestamp").defaultNow(),
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

// Equipment tracking input schemas (API-facing)
export const insertEquipmentRecordSchema = z.object({
  organizationId: z.string().optional(),
  category: z.string().min(1),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().min(1),
  assetTag: z.string().optional().nullable(),
  status: z
    .enum(["in_service", "out_for_cal", "repair", "retired", "lost"])
    .optional()
    .default("in_service"),
  assignedToUserId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  calibrationIntervalDays: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().int().positive().optional()),
  lastCalibrationDate: z.string().optional().nullable(), // YYYY-MM-DD
  calibrationDueDate: z.string().optional().nullable(), // YYYY-MM-DD
  active: z.boolean().optional(),
});

export const insertEquipmentCalibrationEventSchema = z.object({
  equipmentId: z.string().min(1),
  calDate: z.string().min(1), // YYYY-MM-DD
  calType: z
    .enum(["annual", "verification", "as_found", "as_left", "repair"])
    .optional()
    .default("annual"),
  performedBy: z.string().optional().nullable(),
  methodStandard: z.string().optional().nullable(),
  targetFlowLpm: z.string().or(z.number()).optional().transform((val) => (val === undefined || val === null || val === "" ? undefined : val.toString())),
  asFoundFlowLpm: z.string().or(z.number()).optional().transform((val) => (val === undefined || val === null || val === "" ? undefined : val.toString())),
  asLeftFlowLpm: z.string().or(z.number()).optional().transform((val) => (val === undefined || val === null || val === "" ? undefined : val.toString())),
  tolerance: z.string().or(z.number()).optional().transform((val) => (val === undefined || val === null || val === "" ? undefined : val.toString())),
  toleranceUnit: z.enum(["percent", "lpm"]).optional(),
  passFail: z.enum(["pass", "fail", "unknown"]).optional().default("unknown"),
  certificateNumber: z.string().optional().nullable(),
  certificateFileUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const insertEquipmentUsageSchema = z.object({
  equipmentId: z.string().min(1),
  jobId: z.string().optional().nullable(),
  usedFrom: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date().optional()),
  usedTo: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim()) return new Date(value);
    return value;
  }, z.date().optional()),
  context: z.string().optional().nullable(),
  sampleRunId: z.string().optional().nullable(),
});

export const insertEquipmentNoteSchema = z.object({
  equipmentId: z.string().min(1),
  noteText: z.string().min(1),
  noteType: z.string().optional().nullable(),
  visibility: z.enum(["org", "private"]).optional().default("org"),
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

// Export types for equipment tracking
export type EquipmentRecord = typeof equipment.$inferSelect;
export type InsertEquipmentRecord = z.infer<typeof insertEquipmentRecordSchema>;
export type EquipmentCalibrationEvent = typeof equipmentCalibrationEvents.$inferSelect;
export type InsertEquipmentCalibrationEvent = z.infer<typeof insertEquipmentCalibrationEventSchema>;
export type EquipmentUsageRow = typeof equipmentUsage.$inferSelect;
export type InsertEquipmentUsageRow = z.infer<typeof insertEquipmentUsageSchema>;
export type EquipmentNote = typeof equipmentNotes.$inferSelect;
export type InsertEquipmentNote = z.infer<typeof insertEquipmentNoteSchema>;
export type EquipmentDocument = typeof equipmentDocuments.$inferSelect;
