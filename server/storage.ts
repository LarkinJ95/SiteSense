import { 
  surveys, 
  observations, 
  observationPhotos,
  asbestosSamples,
  asbestosSamplePhotos,
  asbestosSampleLayers,
  paintSamples,
  paintSamplePhotos,
  personnelProfiles,
  airMonitoringJobs,
  airSamples,
  airMonitoringEquipment,
  airMonitoringDocuments,
  homogeneousAreas,
  functionalAreas,
  fieldToolsEquipment,
  personnel as personnelTable,
  personnelJobAssignments as personnelJobAssignmentsTable,
  exposureRecords as exposureRecordsTable,
  exposureLimits as exposureLimitsTable,
  authUsers as authUsersTable,
  authSessions as authSessionsTable,
  userProfiles,
  organizations,
  organizationMembers,
  auditLog,
  equipment as equipmentTable,
  equipmentCalibrationEvents as equipmentCalibrationEventsTable,
  equipmentUsage as equipmentUsageTable,
  equipmentNotes as equipmentNotesTable,
  equipmentDocuments as equipmentDocumentsTable,
  dailyWeatherLogs,
  clients as clientsTable,
  asbestosBuildings as asbestosBuildingsTable,
  asbestosInventoryItems as asbestosInventoryItemsTable,
  asbestosInspections as asbestosInspectionsTable,
  asbestosInspectionInventoryChanges as asbestosInspectionInventoryChangesTable,
  asbestosInspectionSamples as asbestosInspectionSamplesTable,
  asbestosBuildingSamples as asbestosBuildingSamplesTable,
  asbestosInspectionDocuments as asbestosInspectionDocumentsTable,
  buildingInventoryChanges as buildingInventoryChangesTable,
  buildingDocuments as buildingDocumentsTable,
  abatementProjects as abatementProjectsTable,
  abatementProjectItems as abatementProjectItemsTable,
  abatementRepairLogs as abatementRepairLogsTable,
  buildingBudgets as buildingBudgetsTable,
  buildingBudgetChanges as buildingBudgetChangesTable,
  type Survey, 
  type InsertSurvey,
  type Observation,
  type InsertObservation,
  type ObservationPhoto,
  type InsertObservationPhoto,
  type AsbestosSample,
  type InsertAsbestosSample,
  type AsbestosSamplePhoto,
  type AsbestosSampleLayer,
  type InsertAsbestosSampleLayer,
  type PaintSample,
  type InsertPaintSample,
  type PaintSamplePhoto,
  type PersonnelProfile,
  type InsertPersonnelProfile,
  type Personnel,
  type InsertPersonnel,
  type PersonnelJobAssignment,
  type InsertPersonnelJobAssignment,
  type ExposureRecord,
  type ExposureLimit,
  type UpsertExposureLimit,
  type AuthUserRow,
  type AuthSessionRow,
  type AirMonitoringJob,
  type InsertAirMonitoringJob,
  type AirSample,
  type InsertAirSample,
  type AirMonitoringEquipment,
  type InsertAirMonitoringEquipment,
  type AirMonitoringDocument,
  type InsertAirMonitoringDocument,
  type HomogeneousArea,
  type FunctionalArea,
  type FieldToolsEquipment,
  type InsertFieldToolsEquipment,
  type UserProfile,
  type InsertUserProfile,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type EquipmentRecord,
  type EquipmentCalibrationEvent,
  type EquipmentUsageRow,
  type EquipmentNote,
  type EquipmentDocument,
  type DailyWeatherLog,
  type InsertDailyWeatherLog,
  type Client,
  type InsertClient,
  type AsbestosBuilding,
  type InsertAsbestosBuilding,
  type AsbestosInventoryItem,
  type InsertAsbestosInventoryItem,
  type AsbestosInspection,
  type InsertAsbestosInspection,
  type AsbestosInspectionInventoryChange,
  type InsertAsbestosInspectionInventoryChange,
  type AsbestosInspectionSample,
  type InsertAsbestosInspectionSample,
  type AsbestosInspectionDocument,
  type InsertAsbestosInspectionDocument,
  type AsbestosBuildingSample,
  type AbatementRepairLog,
  type BuildingInventoryChange,
  type InsertBuildingInventoryChange,
  type BuildingDocument,
  type InsertBuildingDocument,
  type AbatementProject,
  type InsertAbatementProject,
  type AbatementProjectItem,
  type InsertAbatementProjectItem,
  type BuildingBudget,
  type InsertBuildingBudget,
  type BuildingBudgetChange,
  type InsertBuildingBudgetChange
} from "@shared/schema";
import { getDb } from "./db";
import { eq, desc, or, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const db = () => getDb();

const didAffectRows = (result: any) => {
  const count =
    typeof result?.rowCount === "number"
      ? result.rowCount
      : typeof result?.rowsAffected === "number"
        ? result.rowsAffected
        : typeof result?.changes === "number"
          ? result.changes
          : typeof result?.meta?.changes === "number"
            ? result.meta.changes
          : 0;
  return count > 0;
};

export interface IStorage {
  // Survey methods
  getSurveys(): Promise<Survey[]>;
  getSurvey(id: string): Promise<Survey | undefined>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  updateSurvey(id: string, survey: Partial<InsertSurvey>): Promise<Survey | undefined>;
  updateSurveySitePhoto(id: string, sitePhotoUrl: string): Promise<Survey | undefined>;
  deleteSurvey(id: string): Promise<boolean>;
  searchSurveys(query: string): Promise<Survey[]>;
  
  // Observation methods
  getObservations(surveyId: string): Promise<Observation[]>;
  getObservation(id: string): Promise<Observation | undefined>;
  createObservation(observation: InsertObservation): Promise<Observation>;
  updateObservation(id: string, observation: Partial<InsertObservation>): Promise<Observation | undefined>;
  deleteObservation(id: string): Promise<boolean>;
  
  // Photo methods
  getObservationPhotos(observationId: string): Promise<ObservationPhoto[]>;
  getObservationPhoto(id: string): Promise<ObservationPhoto | undefined>;
  createObservationPhoto(photo: InsertObservationPhoto): Promise<ObservationPhoto>;
  deleteObservationPhoto(id: string): Promise<boolean>;

  // Asbestos sample methods
  getAsbestosSamples(surveyId: string): Promise<AsbestosSample[]>;
  getAsbestosSample(id: string): Promise<AsbestosSample | undefined>;
  createAsbestosSample(sample: InsertAsbestosSample): Promise<AsbestosSample>;
  updateAsbestosSample(id: string, sample: Partial<InsertAsbestosSample>): Promise<AsbestosSample | undefined>;
  deleteAsbestosSample(id: string): Promise<boolean>;
  getAsbestosSampleLayers(sampleId: string): Promise<AsbestosSampleLayer[]>;
  replaceAsbestosSampleLayers(sampleId: string, layers: InsertAsbestosSampleLayer[]): Promise<AsbestosSampleLayer[]>;
  getAsbestosSamplePhotos(sampleId: string): Promise<AsbestosSamplePhoto[]>;
  getAsbestosSamplePhoto(id: string): Promise<AsbestosSamplePhoto | undefined>;
  createAsbestosSamplePhoto(photo: { sampleId: string; url: string; filename?: string | null }): Promise<AsbestosSamplePhoto>;
  deleteAsbestosSamplePhoto(id: string): Promise<boolean>;

  // Paint sample methods
  getPaintSamples(surveyId: string): Promise<PaintSample[]>;
  getPaintSample(id: string): Promise<PaintSample | undefined>;
  createPaintSample(sample: InsertPaintSample): Promise<PaintSample>;
  updatePaintSample(id: string, sample: Partial<InsertPaintSample>): Promise<PaintSample | undefined>;
  deletePaintSample(id: string): Promise<boolean>;
  getPaintSamplePhotos(sampleId: string): Promise<PaintSamplePhoto[]>;
  getPaintSamplePhoto(id: string): Promise<PaintSamplePhoto | undefined>;
  createPaintSamplePhoto(photo: { sampleId: string; url: string; filename?: string | null }): Promise<PaintSamplePhoto>;
  deletePaintSamplePhoto(id: string): Promise<boolean>;
  
  // Stats methods
  getSurveyStats(): Promise<{
    totalSurveys: number;
    pendingReviews: number;
    samplesCollected: number;
    activeSites: number;
  }>;

  // Personnel methods
  getPersonnel(): Promise<PersonnelProfile[]>;
  getPersonnelProfile(id: string): Promise<PersonnelProfile | undefined>;
  createPersonnelProfile(profile: InsertPersonnelProfile): Promise<PersonnelProfile>;
  updatePersonnelProfile(id: string, profile: Partial<InsertPersonnelProfile>): Promise<PersonnelProfile | undefined>;
  deletePersonnelProfile(id: string): Promise<boolean>;

  // Personnel module (org-scoped)
  getPersonnelForOrg(organizationId: string, options?: { includeInactive?: boolean; search?: string | null }): Promise<Personnel[]>;
  getPersonnelById(id: string): Promise<Personnel | undefined>;
  createPersonnel(organizationId: string, userId: string, payload: InsertPersonnel): Promise<Personnel>;
  updatePersonnel(id: string, userId: string, patch: Partial<InsertPersonnel>): Promise<Personnel | undefined>;
  deactivatePersonnel(id: string, userId: string): Promise<Personnel | undefined>;
  getPersonnelAssignments(organizationId: string, personId: string): Promise<PersonnelJobAssignment[]>;
  getPersonnelAssignmentByPersonJob(organizationId: string, personId: string, jobId: string): Promise<PersonnelJobAssignment | undefined>;
  createPersonnelAssignment(organizationId: string, userId: string, payload: InsertPersonnelJobAssignment): Promise<PersonnelJobAssignment>;
  getExposureLimits(organizationId: string, profileKey?: string | null): Promise<ExposureLimit[]>;
  upsertExposureLimit(organizationId: string, payload: UpsertExposureLimit): Promise<ExposureLimit>;
  getExposureRecordsForPerson(organizationId: string, personId: string, options?: { from?: number | null; to?: number | null; analyte?: string | null }): Promise<ExposureRecord[]>;
  upsertExposureFromAirSample(params: {
    organizationId: string;
    userId: string;
    airSampleId: string;
    jobId: string;
    personId: string;
    dateMs: number | null;
    analyte: string;
    durationMinutes: number | null;
    concentration: string | null;
    units: string | null;
    method: string | null;
    sampleType: string | null;
    taskActivity?: string | null;
    ppeLevel?: string | null;
    profileKey: string | null;
    twa8hr: string | null;
    limitType: string | null;
    limitValue: string | null;
    percentOfLimit: string | null;
    exceedanceFlag: boolean;
    nearMissFlag: boolean;
    sourceRefs?: any;
  }): Promise<ExposureRecord>;

  // Air-sample based personnel stats/backfill helpers
  getAirSamplesForPersonInOrg(organizationId: string, personId: string): Promise<AirSample[]>;
  getAirSampleStatsByPerson(
    organizationId: string
  ): Promise<Array<{ personId: string; sampleCount: number; jobCount: number; lastJobDate: number | null }>>;
  getAirSamplesForMonitorNameInOrg(organizationId: string, monitorName: string): Promise<AirSample[]>;
  getAirSampleStatsByMonitorName(
    organizationId: string
  ): Promise<Array<{ monitorName: string; sampleCount: number; jobCount: number; lastJobDate: number | null }>>;

  // Password auth (D1-backed)
  getAuthUserByEmail(email: string): Promise<AuthUserRow | undefined>;
  getAuthUserById(userId: string): Promise<AuthUserRow | undefined>;
  createAuthUser(params: { email: string; passwordHash: string; name?: string | null }): Promise<AuthUserRow>;
  updateAuthUser(userId: string, patch: Partial<{ name: string | null; lastLoginAt: Date | null }>): Promise<AuthUserRow | undefined>;
  createAuthSession(params: { userId: string; expiresAt: Date; userAgent?: string | null; ipAddress?: string | null }): Promise<AuthSessionRow>;
  getAuthSession(sessionId: string): Promise<AuthSessionRow | undefined>;
  deleteAuthSession(sessionId: string): Promise<boolean>;
  deleteAuthSessionsForUser(userId: string): Promise<number>;

  // Air monitoring job methods
  getAirMonitoringJobs(): Promise<AirMonitoringJob[]>;
  getAirMonitoringJob(id: string): Promise<AirMonitoringJob | undefined>;
  createAirMonitoringJob(job: InsertAirMonitoringJob): Promise<AirMonitoringJob>;
  updateAirMonitoringJob(id: string, job: Partial<InsertAirMonitoringJob>): Promise<AirMonitoringJob | undefined>;
  deleteAirMonitoringJob(id: string): Promise<boolean>;
  getAirMonitoringJobSamples(jobId: string): Promise<AirSample[]>;

  // Air sample methods
  getAirSamples(): Promise<AirSample[]>;
  getAirSample(id: string): Promise<AirSample | undefined>;
  createAirSample(sample: InsertAirSample): Promise<AirSample>;
  updateAirSample(id: string, sample: Partial<InsertAirSample>): Promise<AirSample | undefined>;
  deleteAirSample(id: string): Promise<boolean>;

  // Air monitoring equipment methods
  getAirMonitoringEquipment(): Promise<AirMonitoringEquipment[]>;
  getAirMonitoringEquipmentItem(id: string): Promise<AirMonitoringEquipment | undefined>;
  createAirMonitoringEquipment(equipment: InsertAirMonitoringEquipment): Promise<AirMonitoringEquipment>;
  updateAirMonitoringEquipment(id: string, equipment: Partial<InsertAirMonitoringEquipment>): Promise<AirMonitoringEquipment | undefined>;
  deleteAirMonitoringEquipment(id: string): Promise<boolean>;

  // Field tools equipment methods
  getFieldToolsEquipment(userId: string): Promise<FieldToolsEquipment[]>;
  replaceFieldToolsEquipment(userId: string, items: InsertFieldToolsEquipment[]): Promise<FieldToolsEquipment[]>;

  // User profile methods
  getUserProfiles(): Promise<UserProfile[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  getUserProfileByEmail(email: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  deleteUserProfile(userId: string): Promise<boolean>;

  // Organization methods
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: string): Promise<boolean>;
  getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>;
  getOrganizationMemberById(id: string): Promise<OrganizationMember | undefined>;
  getOrganizationMembersWithUsers(organizationId: string): Promise<
    Array<
      OrganizationMember & {
        name?: string | null;
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      }
    >
  >;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  updateOrganizationMember(id: string, member: Partial<InsertOrganizationMember>): Promise<OrganizationMember | undefined>;
  removeOrganizationMember(id: string): Promise<boolean>;
  getOrganizationIdsForUser(userId: string): Promise<string[]>;
  createAuditLog(entry: {
    organizationId: string;
    actorUserId?: string | null;
    actorEmail?: string | null;
    actorName?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    summary?: string | null;
    metadata?: any;
  }): Promise<void>;
  getAuditLogs(organizationId: string, limit?: number): Promise<any[]>;
  getActiveOrganizationUsers(organizationId: string): Promise<
    Array<{
      userId: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      memberRole: string | null;
      memberStatus: string | null;
      profileStatus: string | null;
      createdAt: number | null;
    }>
  >;

  // Equipment tracking (organization-level)
  getEquipment(organizationId: string, options?: { includeInactive?: boolean }): Promise<EquipmentRecord[]>;
  getEquipmentById(id: string): Promise<EquipmentRecord | undefined>;
  createEquipment(record: Omit<EquipmentRecord, "createdAt" | "updatedAt"> & Partial<Pick<EquipmentRecord, "createdAt" | "updatedAt">>): Promise<EquipmentRecord>;
  updateEquipment(id: string, patch: Partial<EquipmentRecord>): Promise<EquipmentRecord | undefined>;
  softDeleteEquipment(id: string): Promise<boolean>;
  getEquipmentCalibrationEvents(organizationId: string, equipmentId: string): Promise<EquipmentCalibrationEvent[]>;
  getEquipmentCalibrationEventById(id: string): Promise<EquipmentCalibrationEvent | undefined>;
  createEquipmentCalibrationEvent(event: Partial<EquipmentCalibrationEvent> & { organizationId: string; equipmentId: string }): Promise<EquipmentCalibrationEvent>;
  updateEquipmentCalibrationEvent(id: string, patch: Partial<EquipmentCalibrationEvent>): Promise<EquipmentCalibrationEvent | undefined>;
  deleteEquipmentCalibrationEvent(id: string): Promise<boolean>;
  getEquipmentUsage(organizationId: string, equipmentId: string): Promise<EquipmentUsageRow[]>;
  getEquipmentUsageById(id: string): Promise<EquipmentUsageRow | undefined>;
  getEquipmentUsageBySampleRun(organizationId: string, equipmentId: string, sampleRunId: string): Promise<EquipmentUsageRow | undefined>;
  getEquipmentUsageBySampleRunId(organizationId: string, sampleRunId: string): Promise<EquipmentUsageRow | undefined>;
  createEquipmentUsage(row: Partial<EquipmentUsageRow> & { organizationId: string; equipmentId: string }): Promise<EquipmentUsageRow>;
  updateEquipmentUsage(id: string, patch: Partial<EquipmentUsageRow>): Promise<EquipmentUsageRow | undefined>;
  deleteEquipmentUsage(id: string): Promise<boolean>;
  getEquipmentNotes(organizationId: string, equipmentId: string): Promise<EquipmentNote[]>;
  createEquipmentNote(note: Partial<EquipmentNote> & { organizationId: string; equipmentId: string; createdByUserId: string; noteText: string }): Promise<EquipmentNote>;
  getEquipmentDocuments(organizationId: string, equipmentId: string): Promise<EquipmentDocument[]>;
  getEquipmentDocument(id: string): Promise<EquipmentDocument | undefined>;
  createEquipmentDocument(doc: Partial<EquipmentDocument> & { organizationId: string; equipmentId: string; filename: string; originalName: string; mimeType: string; size: number }): Promise<EquipmentDocument>;
  deleteEquipmentDocument(id: string): Promise<boolean>;

  // Asbestos Inspections (Client -> Building -> Inventory)
  getClientsByOrg(organizationId: string): Promise<Client[]>;
  getClientById(id: string): Promise<Client | undefined>;
  createClient(client: Partial<InsertClient> & { organizationId: string; name: string; contactEmail: string }): Promise<Client>;

  getAsbestosBuildings(organizationId: string, clientId?: string | null): Promise<AsbestosBuilding[]>;
  getAsbestosBuildingById(id: string): Promise<AsbestosBuilding | undefined>;
  createAsbestosBuilding(row: Partial<InsertAsbestosBuilding> & { organizationId: string; clientId: string; name: string }): Promise<AsbestosBuilding>;
  updateAsbestosBuilding(id: string, patch: Partial<InsertAsbestosBuilding>): Promise<AsbestosBuilding | undefined>;

  getAsbestosInventoryItems(organizationId: string, buildingId: string): Promise<AsbestosInventoryItem[]>;
  getAsbestosInventoryItemById(id: string): Promise<AsbestosInventoryItem | undefined>;
  createAsbestosInventoryItem(row: Partial<InsertAsbestosInventoryItem> & { organizationId: string; clientId: string; buildingId: string }): Promise<AsbestosInventoryItem>;
  updateAsbestosInventoryItem(id: string, patch: Partial<InsertAsbestosInventoryItem>): Promise<AsbestosInventoryItem | undefined>;

  getAsbestosInspections(organizationId: string, buildingId?: string | null): Promise<AsbestosInspection[]>;
  getAsbestosInspectionById(id: string): Promise<AsbestosInspection | undefined>;
  createAsbestosInspection(
    row: Partial<InsertAsbestosInspection> & { organizationId: string; clientId: string; buildingId: string; inspectionDate: number }
  ): Promise<AsbestosInspection>;
  updateAsbestosInspection(id: string, patch: Partial<InsertAsbestosInspection>): Promise<AsbestosInspection | undefined>;

  getAsbestosInspectionInventoryChanges(organizationId: string, inspectionId: string): Promise<AsbestosInspectionInventoryChange[]>;
  createAsbestosInspectionInventoryChange(
    row: Partial<InsertAsbestosInspectionInventoryChange> & { organizationId: string; inspectionId: string; fieldName: string }
  ): Promise<AsbestosInspectionInventoryChange>;

  getAsbestosInspectionSamples(organizationId: string, inspectionId: string): Promise<AsbestosInspectionSample[]>;
  getAsbestosInspectionSampleById(id: string): Promise<AsbestosInspectionSample | undefined>;
  createAsbestosInspectionSample(
    row: Partial<InsertAsbestosInspectionSample> & { organizationId: string; inspectionId: string; sampleType: string }
  ): Promise<AsbestosInspectionSample>;
  updateAsbestosInspectionSample(id: string, patch: Partial<InsertAsbestosInspectionSample>): Promise<AsbestosInspectionSample | undefined>;
  deleteAsbestosInspectionSample(id: string): Promise<boolean>;

  // Building-level samples (not necessarily tied to inspections)
  getAsbestosBuildingSamples(organizationId: string, buildingId: string, sampleType?: string | null): Promise<AsbestosBuildingSample[]>;
  getAsbestosBuildingSampleById(id: string): Promise<AsbestosBuildingSample | undefined>;
  getAsbestosBuildingSamplesByInspection(organizationId: string, inspectionId: string): Promise<AsbestosBuildingSample[]>;
  createAsbestosBuildingSample(
    row: Partial<AsbestosBuildingSample> & { organizationId: string; clientId: string; buildingId: string; sampleType: string }
  ): Promise<AsbestosBuildingSample>;
  updateAsbestosBuildingSample(id: string, patch: Partial<AsbestosBuildingSample>): Promise<AsbestosBuildingSample | undefined>;
  deleteAsbestosBuildingSample(id: string): Promise<boolean>;

  getAsbestosInspectionDocuments(organizationId: string, inspectionId: string): Promise<AsbestosInspectionDocument[]>;
  getAsbestosInspectionDocumentById(id: string): Promise<AsbestosInspectionDocument | undefined>;
  createAsbestosInspectionDocument(
    row: Partial<InsertAsbestosInspectionDocument> & {
      organizationId: string;
      inspectionId: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
    }
  ): Promise<AsbestosInspectionDocument>;
  deleteAsbestosInspectionDocument(id: string): Promise<boolean>;

  // Building hub
  getBuildingInventoryChanges(organizationId: string, buildingId: string, itemId?: string | null): Promise<BuildingInventoryChange[]>;
  createBuildingInventoryChange(
    row: Partial<InsertBuildingInventoryChange> & { organizationId: string; buildingId: string; itemId: string; fieldName: string }
  ): Promise<BuildingInventoryChange>;

  getBuildingDocuments(organizationId: string, buildingId: string): Promise<BuildingDocument[]>;
  getBuildingDocumentById(id: string): Promise<BuildingDocument | undefined>;
  createBuildingDocument(
    row: Partial<InsertBuildingDocument> & {
      organizationId: string;
      clientId: string;
      buildingId: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
    }
  ): Promise<BuildingDocument>;
  deleteBuildingDocument(id: string): Promise<boolean>;

  getAbatementProjects(organizationId: string, buildingId: string): Promise<AbatementProject[]>;
  createAbatementProject(
    row: Partial<InsertAbatementProject> & { organizationId: string; clientId: string; buildingId: string; projectName: string }
  ): Promise<AbatementProject>;
  updateAbatementProject(id: string, patch: Partial<InsertAbatementProject>): Promise<AbatementProject | undefined>;
  getAbatementProjectItemsCount(organizationId: string, projectId: string): Promise<number>;
  linkAbatementProjectItem(
    row: Partial<InsertAbatementProjectItem> & { organizationId: string; projectId: string; itemId: string }
  ): Promise<AbatementProjectItem>;

  // Abatement/Repair log (building-level)
  getAbatementRepairLogs(organizationId: string, buildingId: string): Promise<AbatementRepairLog[]>;
  createAbatementRepairLog(
    row: Partial<AbatementRepairLog> & { organizationId: string; clientId: string; buildingId: string }
  ): Promise<AbatementRepairLog>;
  updateAbatementRepairLog(id: string, patch: Partial<AbatementRepairLog>): Promise<AbatementRepairLog | undefined>;
  deleteAbatementRepairLog(id: string): Promise<boolean>;

  getBuildingBudget(organizationId: string, buildingId: string): Promise<BuildingBudget | undefined>;
  upsertBuildingBudget(row: Partial<InsertBuildingBudget> & { organizationId: string; buildingId: string }): Promise<BuildingBudget>;
  createBuildingBudgetChange(row: Partial<InsertBuildingBudgetChange> & { organizationId: string; budgetId: string }): Promise<BuildingBudgetChange>;
  getBuildingBudgetChanges(organizationId: string, budgetId: string): Promise<BuildingBudgetChange[]>;

  // Legacy helper used by exports. Prefer `getAsbestosBuildingSamples(...)` going forward.
  getInspectionSamplesForBuilding(organizationId: string, buildingId: string, sampleType?: string | null): Promise<any[]>;

  // Air monitoring documents
  getAirMonitoringDocuments(jobId: string): Promise<AirMonitoringDocument[]>;
  getAirMonitoringDocument(id: string): Promise<AirMonitoringDocument | undefined>;
  createAirMonitoringDocument(doc: InsertAirMonitoringDocument): Promise<AirMonitoringDocument>;
  deleteAirMonitoringDocument(id: string): Promise<boolean>;

  // Daily Weather Log methods
  getDailyWeatherLogs(jobId: string): Promise<DailyWeatherLog[]>;
  getDailyWeatherLog(id: string): Promise<DailyWeatherLog | undefined>;
  createDailyWeatherLog(log: InsertDailyWeatherLog): Promise<DailyWeatherLog>;
  updateDailyWeatherLog(id: string, log: Partial<InsertDailyWeatherLog>): Promise<DailyWeatherLog | undefined>;
  deleteDailyWeatherLog(id: string): Promise<boolean>;

  // Area management
  getHomogeneousAreas(surveyId: string): Promise<HomogeneousArea[]>;
  createHomogeneousArea(surveyId: string, data: { title?: string; description?: string | null }): Promise<HomogeneousArea>;
  deleteHomogeneousArea(surveyId: string, id: string): Promise<boolean>;
  getFunctionalAreas(surveyId: string): Promise<FunctionalArea[]>;
  createFunctionalArea(surveyId: string, data: { 
    title: string; 
    description?: string | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    wallCount?: number | null;
    doorCount?: number | null;
    windowCount?: number | null;
    sqft?: number | null;
    wallSqft?: number | null;
    photoUrl?: string | null;
  }): Promise<FunctionalArea>;
  updateFunctionalArea(surveyId: string, id: string, data: Partial<{
    title: string;
    description?: string | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    wallCount?: number | null;
    doorCount?: number | null;
    windowCount?: number | null;
    sqft?: number | null;
    wallSqft?: number | null;
    photoUrl?: string | null;
  }>): Promise<FunctionalArea | undefined>;
  deleteFunctionalArea(surveyId: string, id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getSurveys(): Promise<Survey[]> {
    return await db().select().from(surveys).orderBy(desc(surveys.updatedAt));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db().select().from(surveys).where(eq(surveys.id, id));
    return survey || undefined;
  }

  async createSurvey(insertSurvey: InsertSurvey): Promise<Survey> {
    const [survey] = await db()
      .insert(surveys)
      .values(insertSurvey)
      .returning();
    return survey;
  }

  async updateSurvey(id: string, updateSurvey: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const [survey] = await db()
      .update(surveys)
      .set({ ...updateSurvey, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return survey || undefined;
  }

  async updateSurveySitePhoto(id: string, sitePhotoUrl: string): Promise<Survey | undefined> {
    const [survey] = await db()
      .update(surveys)
      .set({ sitePhotoUrl, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return survey || undefined;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    const result = await db().delete(surveys).where(eq(surveys.id, id));
    return didAffectRows(result);
  }

  async searchSurveys(query: string): Promise<Survey[]> {
    const lowered = query.toLowerCase();
    return await db()
      .select()
      .from(surveys)
      .where(
        or(
          sql`lower(${surveys.siteName}) like ${`%${lowered}%`}`,
          sql`lower(${surveys.address}) like ${`%${lowered}%`}`,
          sql`lower(${surveys.jobNumber}) like ${`%${lowered}%`}`,
          sql`lower(${surveys.inspector}) like ${`%${lowered}%`}`,
          sql`lower(${surveys.surveyType}) like ${`%${lowered}%`}`
        )
      )
      .orderBy(desc(surveys.updatedAt));
  }

  async getObservations(surveyId: string): Promise<Observation[]> {
    return await db()
      .select()
      .from(observations)
      .where(eq(observations.surveyId, surveyId))
      .orderBy(desc(observations.createdAt));
  }

  async getObservation(id: string): Promise<Observation | undefined> {
    const [observation] = await db().select().from(observations).where(eq(observations.id, id));
    return observation || undefined;
  }

  async createObservation(insertObservation: InsertObservation): Promise<Observation> {
    const [observation] = await db()
      .insert(observations)
      .values(insertObservation)
      .returning();
    return observation;
  }

  async updateObservation(id: string, updateObservation: Partial<InsertObservation>): Promise<Observation | undefined> {
    const [observation] = await db()
      .update(observations)
      .set({ ...updateObservation, updatedAt: new Date() })
      .where(eq(observations.id, id))
      .returning();
    return observation || undefined;
  }

  async deleteObservation(id: string): Promise<boolean> {
    const result = await db().delete(observations).where(eq(observations.id, id));
    return didAffectRows(result);
  }

  async getObservationPhotos(observationId: string): Promise<ObservationPhoto[]> {
    return await db()
      .select()
      .from(observationPhotos)
      .where(eq(observationPhotos.observationId, observationId));
  }

  async getObservationPhoto(id: string): Promise<ObservationPhoto | undefined> {
    const [photo] = await db().select().from(observationPhotos).where(eq(observationPhotos.id, id));
    return photo || undefined;
  }

  async createObservationPhoto(insertPhoto: InsertObservationPhoto): Promise<ObservationPhoto> {
    const [photo] = await db()
      .insert(observationPhotos)
      .values(insertPhoto)
      .returning();
    return photo;
  }

  async deleteObservationPhoto(id: string): Promise<boolean> {
    const result = await db().delete(observationPhotos).where(eq(observationPhotos.id, id));
    return didAffectRows(result);
  }

  async getAsbestosSamples(surveyId: string): Promise<AsbestosSample[]> {
    return await db()
      .select()
      .from(asbestosSamples)
      .where(eq(asbestosSamples.surveyId, surveyId))
      .orderBy(desc(asbestosSamples.createdAt));
  }

  async getAsbestosSample(id: string): Promise<AsbestosSample | undefined> {
    const [sample] = await db().select().from(asbestosSamples).where(eq(asbestosSamples.id, id));
    return sample || undefined;
  }

  async createAsbestosSample(sample: InsertAsbestosSample): Promise<AsbestosSample> {
    const [created] = await db().insert(asbestosSamples).values(sample).returning();
    return created;
  }

  async updateAsbestosSample(id: string, sample: Partial<InsertAsbestosSample>): Promise<AsbestosSample | undefined> {
    const [updated] = await db()
      .update(asbestosSamples)
      .set({ ...sample, updatedAt: new Date() })
      .where(eq(asbestosSamples.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAsbestosSample(id: string): Promise<boolean> {
    const result = await db().delete(asbestosSamples).where(eq(asbestosSamples.id, id));
    return didAffectRows(result);
  }

  async getAsbestosSampleLayers(sampleId: string): Promise<AsbestosSampleLayer[]> {
    return await db()
      .select()
      .from(asbestosSampleLayers)
      .where(eq(asbestosSampleLayers.sampleId, sampleId))
      .orderBy(asbestosSampleLayers.layerNumber);
  }

  async replaceAsbestosSampleLayers(sampleId: string, layers: InsertAsbestosSampleLayer[]): Promise<AsbestosSampleLayer[]> {
    return await db().transaction(async (tx) => {
      await tx.delete(asbestosSampleLayers).where(eq(asbestosSampleLayers.sampleId, sampleId));
      if (!layers.length) return [];
      const created = await tx.insert(asbestosSampleLayers).values(layers).returning();
      return created;
    });
  }

  async getAsbestosSamplePhotos(sampleId: string): Promise<AsbestosSamplePhoto[]> {
    return await db()
      .select()
      .from(asbestosSamplePhotos)
      .where(eq(asbestosSamplePhotos.sampleId, sampleId))
      .orderBy(desc(asbestosSamplePhotos.uploadedAt));
  }

  async getAsbestosSamplePhoto(id: string): Promise<AsbestosSamplePhoto | undefined> {
    const [photo] = await db().select().from(asbestosSamplePhotos).where(eq(asbestosSamplePhotos.id, id));
    return photo || undefined;
  }

  async createAsbestosSamplePhoto(photo: { sampleId: string; url: string; filename?: string | null }): Promise<AsbestosSamplePhoto> {
    const [created] = await db().insert(asbestosSamplePhotos).values(photo).returning();
    return created;
  }

  async deleteAsbestosSamplePhoto(id: string): Promise<boolean> {
    const result = await db().delete(asbestosSamplePhotos).where(eq(asbestosSamplePhotos.id, id));
    return didAffectRows(result);
  }

  async getPaintSamples(surveyId: string): Promise<PaintSample[]> {
    return await db()
      .select()
      .from(paintSamples)
      .where(eq(paintSamples.surveyId, surveyId))
      .orderBy(desc(paintSamples.createdAt));
  }

  async getPaintSample(id: string): Promise<PaintSample | undefined> {
    const [sample] = await db().select().from(paintSamples).where(eq(paintSamples.id, id));
    return sample || undefined;
  }

  async createPaintSample(sample: InsertPaintSample): Promise<PaintSample> {
    const [created] = await db().insert(paintSamples).values(sample).returning();
    return created;
  }

  async updatePaintSample(id: string, sample: Partial<InsertPaintSample>): Promise<PaintSample | undefined> {
    const [updated] = await db()
      .update(paintSamples)
      .set({ ...sample, updatedAt: new Date() })
      .where(eq(paintSamples.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePaintSample(id: string): Promise<boolean> {
    const result = await db().delete(paintSamples).where(eq(paintSamples.id, id));
    return didAffectRows(result);
  }

  async getPaintSamplePhotos(sampleId: string): Promise<PaintSamplePhoto[]> {
    return await db()
      .select()
      .from(paintSamplePhotos)
      .where(eq(paintSamplePhotos.sampleId, sampleId))
      .orderBy(desc(paintSamplePhotos.uploadedAt));
  }

  async getPaintSamplePhoto(id: string): Promise<PaintSamplePhoto | undefined> {
    const [photo] = await db().select().from(paintSamplePhotos).where(eq(paintSamplePhotos.id, id));
    return photo || undefined;
  }

  async createPaintSamplePhoto(photo: { sampleId: string; url: string; filename?: string | null }): Promise<PaintSamplePhoto> {
    const [created] = await db().insert(paintSamplePhotos).values(photo).returning();
    return created;
  }

  async deletePaintSamplePhoto(id: string): Promise<boolean> {
    const result = await db().delete(paintSamplePhotos).where(eq(paintSamplePhotos.id, id));
    return didAffectRows(result);
  }

  async getSurveyStats(): Promise<{
    totalSurveys: number;
    pendingReviews: number;
    samplesCollected: number;
    activeSites: number;
  }> {
    const totalSurveys = await db().select().from(surveys);
    const pendingReviews = await db().select().from(surveys).where(eq(surveys.status, 'in-progress'));
    const allObservations = await db().select().from(observations);
    const samplesCollected = allObservations.filter(obs => obs.sampleCollected).length;
    const activeSites = new Set(totalSurveys.map(s => s.siteName)).size;

    return {
      totalSurveys: totalSurveys.length,
      pendingReviews: pendingReviews.length,
      samplesCollected,
      activeSites,
    };
  }

  // Personnel methods
  async getPersonnel(): Promise<PersonnelProfile[]> {
    return await db().select().from(personnelProfiles).orderBy(desc(personnelProfiles.createdAt));
  }

  async getPersonnelProfile(id: string): Promise<PersonnelProfile | undefined> {
    const [profile] = await db().select().from(personnelProfiles).where(eq(personnelProfiles.id, id));
    return profile;
  }

  async createPersonnelProfile(profile: InsertPersonnelProfile): Promise<PersonnelProfile> {
    const [newProfile] = await db().insert(personnelProfiles).values(profile).returning();
    return newProfile;
  }

  async updatePersonnelProfile(id: string, profile: Partial<InsertPersonnelProfile>): Promise<PersonnelProfile | undefined> {
    const [updatedProfile] = await db()
      .update(personnelProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(personnelProfiles.id, id))
      .returning();
    return updatedProfile;
  }

  async deletePersonnelProfile(id: string): Promise<boolean> {
    const result = await db().delete(personnelProfiles).where(eq(personnelProfiles.id, id));
    return didAffectRows(result);
  }

  // Personnel module (org-scoped)
  async getPersonnelForOrg(organizationId: string, options?: { includeInactive?: boolean; search?: string | null }): Promise<Personnel[]> {
    const includeInactive = Boolean(options?.includeInactive);
    const rawSearch = (options?.search || "").trim().toLowerCase();
    const baseWhere = includeInactive
      ? eq(personnelTable.organizationId, organizationId)
      : and(eq(personnelTable.organizationId, organizationId), eq(personnelTable.active, true));

    if (!rawSearch) {
      return await db().select().from(personnelTable).where(baseWhere).orderBy(desc(personnelTable.updatedAt));
    }

    // Simple search; SQLite LIKE is case-insensitive depending on collation, so we normalize with lower(...)
    const like = `%${rawSearch.replace(/%/g, "")}%`;
    return await db()
      .select()
      .from(personnelTable)
      .where(
        and(
          baseWhere,
          or(
            sql`lower(coalesce(${personnelTable.firstName}, '')) like ${like}`,
            sql`lower(coalesce(${personnelTable.lastName}, '')) like ${like}`,
            sql`lower(coalesce(${personnelTable.company}, '')) like ${like}`,
            sql`lower(coalesce(${personnelTable.tradeRole}, '')) like ${like}`,
            sql`lower(coalesce(${personnelTable.employeeId}, '')) like ${like}`,
            sql`lower(coalesce(${personnelTable.email}, '')) like ${like}`
          )
        )
      )
      .orderBy(desc(personnelTable.updatedAt));
  }

  async getPersonnelById(id: string): Promise<Personnel | undefined> {
    const [row] = await db().select().from(personnelTable).where(eq(personnelTable.personId, id));
    return row || undefined;
  }

  async createPersonnel(organizationId: string, userId: string, payload: InsertPersonnel): Promise<Personnel> {
    const [created] = await db()
      .insert(personnelTable)
      .values({
        organizationId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        company: payload.company ?? null,
        tradeRole: payload.tradeRole ?? null,
        employeeId: payload.employeeId ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        respiratorClearanceDate: payload.respiratorClearanceDate ?? null,
        fitTestDate: payload.fitTestDate ?? null,
        medicalSurveillanceDate: payload.medicalSurveillanceDate ?? null,
        active: payload.active ?? true,
        isInspector: payload.isInspector ?? false,
        createdByUserId: userId,
        updatedByUserId: userId,
      } as any)
      .returning();
    return created;
  }

  async updatePersonnel(id: string, userId: string, patch: Partial<InsertPersonnel>): Promise<Personnel | undefined> {
    const [updated] = await db()
      .update(personnelTable)
      .set({
        ...patch,
        updatedByUserId: userId,
        updatedAt: new Date(),
      } as any)
      .where(eq(personnelTable.personId, id))
      .returning();
    return updated || undefined;
  }

  async deactivatePersonnel(id: string, userId: string): Promise<Personnel | undefined> {
    const [updated] = await db()
      .update(personnelTable)
      .set({ active: false, updatedByUserId: userId, updatedAt: new Date() } as any)
      .where(eq(personnelTable.personId, id))
      .returning();
    return updated || undefined;
  }

  async getPersonnelAssignments(organizationId: string, personId: string): Promise<PersonnelJobAssignment[]> {
    return await db()
      .select()
      .from(personnelJobAssignmentsTable)
      .where(and(eq(personnelJobAssignmentsTable.organizationId, organizationId), eq(personnelJobAssignmentsTable.personId, personId)))
      .orderBy(desc(personnelJobAssignmentsTable.dateFrom));
  }

  async getPersonnelAssignmentByPersonJob(organizationId: string, personId: string, jobId: string): Promise<PersonnelJobAssignment | undefined> {
    const [row] = await db()
      .select()
      .from(personnelJobAssignmentsTable)
      .where(
        and(
          eq(personnelJobAssignmentsTable.organizationId, organizationId),
          eq(personnelJobAssignmentsTable.personId, personId),
          eq(personnelJobAssignmentsTable.jobId, jobId)
        )
      );
    return row || undefined;
  }

  async createPersonnelAssignment(organizationId: string, userId: string, payload: InsertPersonnelJobAssignment): Promise<PersonnelJobAssignment> {
    const [created] = await db()
      .insert(personnelJobAssignmentsTable)
      .values({
        organizationId,
        personId: payload.personId,
        jobId: payload.jobId,
        dateFrom: payload.dateFrom ?? null,
        dateTo: payload.dateTo ?? null,
        shiftDate: payload.shiftDate ?? null,
        roleOnJob: payload.roleOnJob ?? null,
        supervisorPersonId: payload.supervisorPersonId ?? null,
        supervisorName: payload.supervisorName ?? null,
        notes: payload.notes ?? null,
        createdByUserId: userId,
        updatedByUserId: userId,
      } as any)
      .returning();
    return created;
  }

  async getExposureLimits(organizationId: string, profileKey?: string | null): Promise<ExposureLimit[]> {
    const where = profileKey
      ? and(eq(exposureLimitsTable.organizationId, organizationId), eq(exposureLimitsTable.profileKey, profileKey))
      : eq(exposureLimitsTable.organizationId, organizationId);
    return await db().select().from(exposureLimitsTable).where(where).orderBy(desc(exposureLimitsTable.updatedAt));
  }

  async upsertExposureLimit(organizationId: string, payload: UpsertExposureLimit): Promise<ExposureLimit> {
    // D1 doesn't support full UPSERT in drizzle here; do a select-then-update/insert.
    const [existing] = await db()
      .select()
      .from(exposureLimitsTable)
      .where(
        and(
          eq(exposureLimitsTable.organizationId, organizationId),
          eq(exposureLimitsTable.profileKey, payload.profileKey),
          eq(exposureLimitsTable.analyte, payload.analyte)
        )
      );
    if (existing) {
      const [updated] = await db()
        .update(exposureLimitsTable)
        .set({
          units: payload.units,
          actionLevel: payload.actionLevel ?? null,
          pel: payload.pel ?? null,
          rel: payload.rel ?? null,
          updatedAt: new Date(),
        } as any)
        .where(eq(exposureLimitsTable.limitId, existing.limitId))
        .returning();
      return updated;
    }

    const [created] = await db()
      .insert(exposureLimitsTable)
      .values({
        organizationId,
        profileKey: payload.profileKey,
        analyte: payload.analyte,
        units: payload.units,
        actionLevel: payload.actionLevel ?? null,
        pel: payload.pel ?? null,
        rel: payload.rel ?? null,
      } as any)
      .returning();
    return created;
  }

  async getExposureRecordsForPerson(
    organizationId: string,
    personId: string,
    options?: { from?: number | null; to?: number | null; analyte?: string | null }
  ): Promise<ExposureRecord[]> {
    const parts: any[] = [eq(exposureRecordsTable.organizationId, organizationId), eq(exposureRecordsTable.personId, personId)];
    if (options?.from) parts.push(sql`${exposureRecordsTable.date} >= ${options.from}`);
    if (options?.to) parts.push(sql`${exposureRecordsTable.date} <= ${options.to}`);
    if (options?.analyte) parts.push(eq(exposureRecordsTable.analyte, options.analyte));
    const where = parts.length === 1 ? parts[0] : and(...parts);
    return await db().select().from(exposureRecordsTable).where(where).orderBy(desc(exposureRecordsTable.date));
  }

  async upsertExposureFromAirSample(params: any): Promise<ExposureRecord> {
    const [existing] = params.airSampleId
      ? await db()
          .select()
          .from(exposureRecordsTable)
          .where(and(eq(exposureRecordsTable.organizationId, params.organizationId), eq(exposureRecordsTable.airSampleId, params.airSampleId)))
      : [null];

    // Drizzle `timestamp_ms` columns map to `Date`. Callers often pass ms numbers or strings;
    // normalize here so we don't silently fail inserts/updates.
    const toDateOrNull = (value: any): Date | null => {
      if (value === null || value === undefined || value === "") return null;
      if (value instanceof Date) return value;
      if (typeof value === "number" && Number.isFinite(value)) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (typeof value === "string" && value.trim()) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    const values: any = {
      organizationId: params.organizationId,
      personId: params.personId,
      jobId: params.jobId,
      airSampleId: params.airSampleId ?? null,
      sampleRunId: params.sampleRunId ?? null,
      date: toDateOrNull(params.dateMs),
      analyte: params.analyte,
      durationMinutes: params.durationMinutes ?? null,
      concentration: params.concentration ?? null,
      units: params.units ?? null,
      method: params.method ?? null,
      sampleType: params.sampleType ?? null,
      taskActivity: params.taskActivity ?? null,
      ppeLevel: params.ppeLevel ?? null,
      twa8hr: params.twa8hr ?? null,
      profileKey: params.profileKey ?? null,
      computedVersion: params.computedVersion ?? 1,
      limitType: params.limitType ?? null,
      limitValue: params.limitValue ?? null,
      percentOfLimit: params.percentOfLimit ?? null,
      exceedanceFlag: Boolean(params.exceedanceFlag),
      nearMissFlag: Boolean(params.nearMissFlag),
      sourceRefs: params.sourceRefs ? JSON.stringify(params.sourceRefs) : null,
      updatedByUserId: params.userId,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await db()
        .update(exposureRecordsTable)
        .set(values)
        .where(eq(exposureRecordsTable.exposureId, existing.exposureId))
        .returning();
      return updated;
    }

    const [created] = await db()
      .insert(exposureRecordsTable)
      .values({ ...values, createdByUserId: params.userId } as any)
      .returning();
    return created;
  }

  async getAirSamplesForPersonInOrg(organizationId: string, personId: string): Promise<AirSample[]> {
    const pid = (personId || "").trim();
    if (!organizationId || !pid) return [];
    const rows = await db()
      .select({ sample: airSamples })
      .from(airSamples)
      .innerJoin(airMonitoringJobs, eq(airSamples.jobId, airMonitoringJobs.id))
      .where(
        and(
          eq(airMonitoringJobs.organizationId, organizationId),
          eq(airSamples.personId, pid),
          sql`trim(${airSamples.personId}) != ''`
        )
      )
      .orderBy(desc(airSamples.startTime));
    return rows.map((r: any) => r.sample);
  }

  async getAirSampleStatsByPerson(
    organizationId: string
  ): Promise<Array<{ personId: string; sampleCount: number; jobCount: number; lastJobDate: number | null }>> {
    if (!organizationId) return [];

    const rows = await db()
      .select({
        personId: airSamples.personId,
        sampleCount: sql<number>`count(1)`,
        jobCount: sql<number>`count(distinct ${airSamples.jobId})`,
        lastJobDate: sql<number | null>`max(${airSamples.startTime})`,
      })
      .from(airSamples)
      .innerJoin(airMonitoringJobs, eq(airSamples.jobId, airMonitoringJobs.id))
      .where(
        and(
          eq(airMonitoringJobs.organizationId, organizationId),
          sql`${airSamples.personId} is not null`,
          sql`trim(${airSamples.personId}) != ''`
        )
      )
      .groupBy(airSamples.personId);

    return (rows as any[]).map((r: any) => ({
      personId: String(r.personId || ""),
      sampleCount: Number(r.sampleCount || 0),
      jobCount: Number(r.jobCount || 0),
      lastJobDate: r.lastJobDate === null || r.lastJobDate === undefined ? null : Number(r.lastJobDate),
    }));
  }

  async getAirSamplesForMonitorNameInOrg(organizationId: string, monitorName: string): Promise<AirSample[]> {
    const name = (monitorName || "").trim().toLowerCase();
    if (!organizationId || !name) return [];
    const rows = await db()
      .select({ sample: airSamples })
      .from(airSamples)
      .innerJoin(airMonitoringJobs, eq(airSamples.jobId, airMonitoringJobs.id))
      .where(
        and(
          eq(airMonitoringJobs.organizationId, organizationId),
          sql`lower(trim(coalesce(${airSamples.monitorWornBy}, ''))) = ${name}`,
          or(sql`${airSamples.personId} is null`, sql`trim(${airSamples.personId}) = ''`),
          or(eq(airSamples.sampleType, "personal"), eq(airSamples.sampleType, "excursion"))
        )
      )
      .orderBy(desc(airSamples.startTime));
    return rows.map((r: any) => r.sample);
  }

  async getAirSampleStatsByMonitorName(
    organizationId: string
  ): Promise<Array<{ monitorName: string; sampleCount: number; jobCount: number; lastJobDate: number | null }>> {
    if (!organizationId) return [];
    const rows = await db()
      .select({
        monitorName: airSamples.monitorWornBy,
        sampleCount: sql<number>`count(1)`,
        jobCount: sql<number>`count(distinct ${airSamples.jobId})`,
        lastJobDate: sql<number | null>`max(${airSamples.startTime})`,
      })
      .from(airSamples)
      .innerJoin(airMonitoringJobs, eq(airSamples.jobId, airMonitoringJobs.id))
      .where(
        and(
          eq(airMonitoringJobs.organizationId, organizationId),
          or(sql`${airSamples.personId} is null`, sql`trim(${airSamples.personId}) = ''`),
          sql`${airSamples.monitorWornBy} is not null`,
          sql`trim(${airSamples.monitorWornBy}) != ''`,
          sql`lower(trim(${airSamples.monitorWornBy})) != 'n/a'`,
          or(eq(airSamples.sampleType, "personal"), eq(airSamples.sampleType, "excursion"))
        )
      )
      .groupBy(airSamples.monitorWornBy);

    return (rows as any[]).map((r: any) => ({
      monitorName: String(r.monitorName || ""),
      sampleCount: Number(r.sampleCount || 0),
      jobCount: Number(r.jobCount || 0),
      lastJobDate: r.lastJobDate === null || r.lastJobDate === undefined ? null : Number(r.lastJobDate),
    }));
  }

  // Password auth (D1-backed)
  async getAuthUserByEmail(email: string): Promise<AuthUserRow | undefined> {
    const normalized = (email || "").trim().toLowerCase();
    const [row] = await db().select().from(authUsersTable).where(sql`lower(${authUsersTable.email}) = ${normalized}`);
    return row || undefined;
  }

  async getAuthUserById(userId: string): Promise<AuthUserRow | undefined> {
    const [row] = await db().select().from(authUsersTable).where(eq(authUsersTable.userId, userId));
    return row || undefined;
  }

  async createAuthUser(params: { email: string; passwordHash: string; name?: string | null }): Promise<AuthUserRow> {
    const [created] = await db()
      .insert(authUsersTable)
      .values({
        email: params.email.trim().toLowerCase(),
        passwordHash: params.passwordHash,
        name: params.name ?? null,
      } as any)
      .returning();
    return created;
  }

  async updateAuthUser(userId: string, patch: Partial<{ name: string | null; lastLoginAt: Date | null }>): Promise<AuthUserRow | undefined> {
    const [updated] = await db()
      .update(authUsersTable)
      .set({ ...patch, updatedAt: new Date() } as any)
      .where(eq(authUsersTable.userId, userId))
      .returning();
    return updated || undefined;
  }

  async createAuthSession(params: { userId: string; expiresAt: Date; userAgent?: string | null; ipAddress?: string | null }): Promise<AuthSessionRow> {
    const [created] = await db()
      .insert(authSessionsTable)
      .values({
        userId: params.userId,
        expiresAt: params.expiresAt,
        userAgent: params.userAgent ?? null,
        ipAddress: params.ipAddress ?? null,
      } as any)
      .returning();
    return created;
  }

  async getAuthSession(sessionId: string): Promise<AuthSessionRow | undefined> {
    const [row] = await db().select().from(authSessionsTable).where(eq(authSessionsTable.sessionId, sessionId));
    return row || undefined;
  }

  async deleteAuthSession(sessionId: string): Promise<boolean> {
    const result = await db().delete(authSessionsTable).where(eq(authSessionsTable.sessionId, sessionId));
    return didAffectRows(result);
  }

  async deleteAuthSessionsForUser(userId: string): Promise<number> {
    const result = await db().delete(authSessionsTable).where(eq(authSessionsTable.userId, userId));
    if (typeof result?.changes === "number") return result.changes;
    if (typeof result?.rowsAffected === "number") return result.rowsAffected;
    if (typeof result?.rowCount === "number") return result.rowCount;
    return 0;
  }

  // Air monitoring job methods
  async getAirMonitoringJobs(): Promise<AirMonitoringJob[]> {
    return await db().select().from(airMonitoringJobs).orderBy(desc(airMonitoringJobs.createdAt));
  }

  async getAirMonitoringJob(id: string): Promise<AirMonitoringJob | undefined> {
    const [job] = await db().select().from(airMonitoringJobs).where(eq(airMonitoringJobs.id, id));
    return job || undefined;
  }

  async getAirMonitoringJobById(id: string): Promise<AirMonitoringJob> {
    const [job] = await db().select().from(airMonitoringJobs).where(eq(airMonitoringJobs.id, id));
    if (!job) throw new Error('Air monitoring job not found');
    return job;
  }

  async createAirMonitoringJob(job: InsertAirMonitoringJob): Promise<AirMonitoringJob> {
    const [newJob] = await db().insert(airMonitoringJobs).values(job).returning();
    return newJob;
  }

  async updateAirMonitoringJob(id: string, job: Partial<InsertAirMonitoringJob>): Promise<AirMonitoringJob | undefined> {
    const [updatedJob] = await db()
      .update(airMonitoringJobs)
      .set({ ...job, updatedAt: new Date() })
      .where(eq(airMonitoringJobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteAirMonitoringJob(id: string): Promise<boolean> {
    const result = await db().delete(airMonitoringJobs).where(eq(airMonitoringJobs.id, id));
    return didAffectRows(result);
  }

  async getAirMonitoringJobSamples(jobId: string): Promise<AirSample[]> {
    return await db().select().from(airSamples).where(eq(airSamples.jobId, jobId)).orderBy(desc(airSamples.createdAt));
  }

  // Air sample methods
  async getAirSamples(): Promise<AirSample[]> {
    return await db().select().from(airSamples).orderBy(desc(airSamples.createdAt));
  }

  async getAirSample(id: string): Promise<AirSample | undefined> {
    const [sample] = await db().select().from(airSamples).where(eq(airSamples.id, id));
    return sample;
  }

  async createAirSample(sample: InsertAirSample): Promise<AirSample> {
    const [newSample] = await db().insert(airSamples).values(sample).returning();
    return newSample;
  }

  async updateAirSample(id: string, sample: Partial<InsertAirSample>): Promise<AirSample | undefined> {
    try {
      const [updatedSample] = await db().update(airSamples)
        .set({ ...sample, updatedAt: new Date() })
        .where(eq(airSamples.id, id))
        .returning();
      return updatedSample || undefined;
    } catch (error) {
      console.error('Database error updating air sample:', error);
      throw error;
    }
  }

  async deleteAirSample(id: string): Promise<boolean> {
    const result = await db().delete(airSamples).where(eq(airSamples.id, id));
    return didAffectRows(result);
  }

  // Air monitoring equipment methods
  async getAirMonitoringEquipment(): Promise<AirMonitoringEquipment[]> {
    return await db().select().from(airMonitoringEquipment).orderBy(desc(airMonitoringEquipment.createdAt));
  }

  async getAirMonitoringEquipmentItem(id: string): Promise<AirMonitoringEquipment | undefined> {
    const [equipment] = await db().select().from(airMonitoringEquipment).where(eq(airMonitoringEquipment.id, id));
    return equipment;
  }

  async createAirMonitoringEquipment(equipment: InsertAirMonitoringEquipment): Promise<AirMonitoringEquipment> {
    const [newEquipment] = await db().insert(airMonitoringEquipment).values(equipment).returning();
    return newEquipment;
  }

  async updateAirMonitoringEquipment(id: string, equipment: Partial<InsertAirMonitoringEquipment>): Promise<AirMonitoringEquipment | undefined> {
    const [updatedEquipment] = await db()
      .update(airMonitoringEquipment)
      .set(equipment)
      .where(eq(airMonitoringEquipment.id, id))
      .returning();
    return updatedEquipment;
  }

  async deleteAirMonitoringEquipment(id: string): Promise<boolean> {
    const result = await db().delete(airMonitoringEquipment).where(eq(airMonitoringEquipment.id, id));
    return didAffectRows(result);
  }

  // Field tools equipment methods
  async getFieldToolsEquipment(userId: string): Promise<FieldToolsEquipment[]> {
    return await db().select().from(fieldToolsEquipment).where(eq(fieldToolsEquipment.userId, userId));
  }

  async replaceFieldToolsEquipment(userId: string, items: InsertFieldToolsEquipment[]): Promise<FieldToolsEquipment[]> {
    await db().delete(fieldToolsEquipment).where(eq(fieldToolsEquipment.userId, userId));
    if (!items.length) return [];
    const payload = items.map((item) => ({
      ...item,
      userId,
    }));
    const inserted = await db().insert(fieldToolsEquipment).values(payload).returning();
    return inserted;
  }

  // User profile methods
  async getUserProfiles(): Promise<UserProfile[]> {
    return await db().select().from(userProfiles).orderBy(desc(userProfiles.updatedAt));
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db().select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | undefined> {
    const [profile] = await db()
      .select()
      .from(userProfiles)
      .where(sql`lower(${userProfiles.email}) = ${email.toLowerCase()}`);
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const existing = await this.getUserProfile(profile.userId);
    if (existing) {
      const [updated] = await db()
        .update(userProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(userProfiles.userId, profile.userId))
        .returning();
      return updated;
    }
    const [created] = await db().insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db()
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  async deleteUserProfile(userId: string): Promise<boolean> {
    const result = await db().delete(userProfiles).where(eq(userProfiles.userId, userId));
    return didAffectRows(result);
  }

  // Organization methods
  async getOrganizations(): Promise<Organization[]> {
    return await db().select().from(organizations).orderBy(desc(organizations.updatedAt));
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db().select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db().insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db()
      .update(organizations)
      .set({ ...org, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    const result = await db().delete(organizations).where(eq(organizations.id, id));
    return didAffectRows(result);
  }

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    return await db()
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))
      .orderBy(desc(organizationMembers.createdAt));
  }

  async getOrganizationMemberById(id: string): Promise<OrganizationMember | undefined> {
    const [row] = await db().select().from(organizationMembers).where(eq(organizationMembers.id, id));
    return row || undefined;
  }

  async getOrganizationMembersWithUsers(organizationId: string) {
    const rows = await db()
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        status: organizationMembers.status,
        createdAt: organizationMembers.createdAt,
        email: userProfiles.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        authEmail: authUsersTable.email,
        authName: authUsersTable.name,
      })
      .from(organizationMembers)
      .leftJoin(userProfiles, eq(organizationMembers.userId, userProfiles.userId))
      .leftJoin(authUsersTable, eq(organizationMembers.userId, authUsersTable.userId))
      .where(eq(organizationMembers.organizationId, organizationId))
      .orderBy(desc(organizationMembers.createdAt));

    return rows.map((row: any) => {
      const profileName = `${row.firstName || ""} ${row.lastName || ""}`.trim();
      const name = profileName || row.authName || row.authEmail || row.userId;
      const email = row.email || row.authEmail || null;
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        role: row.role ?? null,
        status: row.status ?? null,
        createdAt: typeof row.createdAt === "number" ? row.createdAt : null,
        name,
        email,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
      };
    });
  }

  async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db().insert(organizationMembers).values(member).returning();
    return created;
  }

  async updateOrganizationMember(id: string, member: Partial<InsertOrganizationMember>): Promise<OrganizationMember | undefined> {
    const [updated] = await db()
      .update(organizationMembers)
      .set(member)
      .where(eq(organizationMembers.id, id))
      .returning();
    return updated || undefined;
  }

  async removeOrganizationMember(id: string): Promise<boolean> {
    const result = await db().delete(organizationMembers).where(eq(organizationMembers.id, id));
    return didAffectRows(result);
  }

  async getOrganizationIdsForUser(userId: string): Promise<string[]> {
    const memberships = await db()
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));
    return memberships.map((member) => member.organizationId);
  }

  async createAuditLog(entry: {
    organizationId: string;
    actorUserId?: string | null;
    actorEmail?: string | null;
    actorName?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    summary?: string | null;
    metadata?: any;
  }): Promise<void> {
    const userId = entry.actorUserId || "";
    if (!userId) return;
    try {
      await db().insert(auditLog).values({
        organizationId: entry.organizationId,
        entityType: entry.entityType || "unknown",
        entityId: entry.entityId || "unknown",
        action: entry.action,
        oldValues: null,
        newValues: JSON.stringify({
          actorEmail: entry.actorEmail ?? null,
          actorName: entry.actorName ?? null,
          summary: entry.summary ?? null,
          metadata: entry.metadata ?? null,
        }),
        userId,
        userAgent: null,
        ipAddress: null,
      } as any);
    } catch {
      // Audit should never break the primary workflow. If schema/migrations drift, skip logging.
      return;
    }
  }

  async getAuditLogs(organizationId: string, limit = 200): Promise<any[]> {
    const rows = await db()
      .select()
      .from(auditLog)
      .where(eq(auditLog.organizationId, organizationId))
      .orderBy(desc(auditLog.timestamp))
      .limit(Math.min(Math.max(limit, 1), 500));
    return rows.map((row: any) => ({
      ...row,
      details: row.newValues
        ? (() => {
            try {
              return JSON.parse(row.newValues);
            } catch {
              return row.newValues;
            }
          })()
        : null,
    }));
  }

  async getActiveOrganizationUsers(organizationId: string) {
    const rows = await db()
      .select({
        userId: organizationMembers.userId,
        memberRole: organizationMembers.role,
        memberStatus: organizationMembers.status,
        createdAt: organizationMembers.createdAt,
        email: userProfiles.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        profileStatus: userProfiles.status,
        authEmail: authUsersTable.email,
        authName: authUsersTable.name,
      })
      .from(organizationMembers)
      .leftJoin(userProfiles, eq(organizationMembers.userId, userProfiles.userId))
      .leftJoin(authUsersTable, eq(organizationMembers.userId, authUsersTable.userId))
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          sql`lower(coalesce(${organizationMembers.status}, '')) = 'active'`,
          or(
            sql`${userProfiles.userId} is null`,
            sql`lower(coalesce(${userProfiles.status}, '')) = 'active'`
          )
        )
      )
      .orderBy(desc(organizationMembers.createdAt));

    return rows.map((row) => ({
      userId: row.userId,
      email: (row.email ?? row.authEmail) ?? null,
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      name: row.authName ?? null,
      memberRole: row.memberRole ?? null,
      memberStatus: row.memberStatus ?? null,
      profileStatus: row.profileStatus ?? null,
      createdAt: typeof row.createdAt === "number" ? row.createdAt : null,
    }));
  }

  // Equipment tracking (organization-level)
  async getEquipment(organizationId: string, options?: { includeInactive?: boolean }): Promise<EquipmentRecord[]> {
    const where = options?.includeInactive
      ? eq(equipmentTable.organizationId, organizationId)
      : and(eq(equipmentTable.organizationId, organizationId), eq(equipmentTable.active, true));
    return await db().select().from(equipmentTable).where(where).orderBy(desc(equipmentTable.updatedAt));
  }

  async getEquipmentById(id: string): Promise<EquipmentRecord | undefined> {
    const [row] = await db().select().from(equipmentTable).where(eq(equipmentTable.equipmentId, id));
    return row || undefined;
  }

  async createEquipment(record: any): Promise<EquipmentRecord> {
    const [created] = await db().insert(equipmentTable).values(record).returning();
    return created;
  }

  async updateEquipment(id: string, patch: Partial<EquipmentRecord>): Promise<EquipmentRecord | undefined> {
    const [updated] = await db()
      .update(equipmentTable)
      .set({ ...patch, updatedAt: new Date() } as any)
      .where(eq(equipmentTable.equipmentId, id))
      .returning();
    return updated || undefined;
  }

  async softDeleteEquipment(id: string): Promise<boolean> {
    const result = await db()
      .update(equipmentTable)
      .set({ active: false, updatedAt: new Date() } as any)
      .where(eq(equipmentTable.equipmentId, id));
    return didAffectRows(result);
  }

  async getEquipmentCalibrationEvents(organizationId: string, equipmentId: string): Promise<EquipmentCalibrationEvent[]> {
    return await db()
      .select()
      .from(equipmentCalibrationEventsTable)
      .where(and(eq(equipmentCalibrationEventsTable.organizationId, organizationId), eq(equipmentCalibrationEventsTable.equipmentId, equipmentId)))
      .orderBy(desc(equipmentCalibrationEventsTable.calDate));
  }

  async getEquipmentCalibrationEventById(id: string): Promise<EquipmentCalibrationEvent | undefined> {
    const [row] = await db().select().from(equipmentCalibrationEventsTable).where(eq(equipmentCalibrationEventsTable.calEventId, id));
    return row || undefined;
  }

  async createEquipmentCalibrationEvent(event: any): Promise<EquipmentCalibrationEvent> {
    const [created] = await db().insert(equipmentCalibrationEventsTable).values(event).returning();
    return created;
  }

  async updateEquipmentCalibrationEvent(id: string, patch: Partial<EquipmentCalibrationEvent>): Promise<EquipmentCalibrationEvent | undefined> {
    const [updated] = await db()
      .update(equipmentCalibrationEventsTable)
      .set(patch as any)
      .where(eq(equipmentCalibrationEventsTable.calEventId, id))
      .returning();
    return updated || undefined;
  }

  async deleteEquipmentCalibrationEvent(id: string): Promise<boolean> {
    const result = await db().delete(equipmentCalibrationEventsTable).where(eq(equipmentCalibrationEventsTable.calEventId, id));
    return didAffectRows(result);
  }

  async getEquipmentUsage(organizationId: string, equipmentId: string): Promise<EquipmentUsageRow[]> {
    return await db()
      .select()
      .from(equipmentUsageTable)
      .where(and(eq(equipmentUsageTable.organizationId, organizationId), eq(equipmentUsageTable.equipmentId, equipmentId)))
      .orderBy(desc(equipmentUsageTable.usedFrom));
  }

  async getEquipmentUsageById(id: string): Promise<EquipmentUsageRow | undefined> {
    const [row] = await db().select().from(equipmentUsageTable).where(eq(equipmentUsageTable.usageId, id));
    return row || undefined;
  }

  async getEquipmentUsageBySampleRun(
    organizationId: string,
    equipmentId: string,
    sampleRunId: string
  ): Promise<EquipmentUsageRow | undefined> {
    const [row] = await db()
      .select()
      .from(equipmentUsageTable)
      .where(
        and(
          eq(equipmentUsageTable.organizationId, organizationId),
          eq(equipmentUsageTable.equipmentId, equipmentId),
          eq(equipmentUsageTable.sampleRunId, sampleRunId)
        )
      );
    return row || undefined;
  }

  async getEquipmentUsageBySampleRunId(organizationId: string, sampleRunId: string): Promise<EquipmentUsageRow | undefined> {
    const [row] = await db()
      .select()
      .from(equipmentUsageTable)
      .where(and(eq(equipmentUsageTable.organizationId, organizationId), eq(equipmentUsageTable.sampleRunId, sampleRunId)));
    return row || undefined;
  }

  async createEquipmentUsage(row: any): Promise<EquipmentUsageRow> {
    const [created] = await db().insert(equipmentUsageTable).values(row).returning();
    return created;
  }

  async updateEquipmentUsage(id: string, patch: Partial<EquipmentUsageRow>): Promise<EquipmentUsageRow | undefined> {
    const [updated] = await db()
      .update(equipmentUsageTable)
      .set(patch as any)
      .where(eq(equipmentUsageTable.usageId, id))
      .returning();
    return updated || undefined;
  }

  async deleteEquipmentUsage(id: string): Promise<boolean> {
    const result = await db().delete(equipmentUsageTable).where(eq(equipmentUsageTable.usageId, id));
    return didAffectRows(result);
  }

  async getEquipmentNotes(organizationId: string, equipmentId: string): Promise<EquipmentNote[]> {
    return await db()
      .select()
      .from(equipmentNotesTable)
      .where(and(eq(equipmentNotesTable.organizationId, organizationId), eq(equipmentNotesTable.equipmentId, equipmentId)))
      .orderBy(desc(equipmentNotesTable.createdAt));
  }

  async createEquipmentNote(note: any): Promise<EquipmentNote> {
    const [created] = await db().insert(equipmentNotesTable).values(note).returning();
    return created;
  }

  async getEquipmentDocuments(organizationId: string, equipmentId: string): Promise<EquipmentDocument[]> {
    return await db()
      .select()
      .from(equipmentDocumentsTable)
      .where(and(eq(equipmentDocumentsTable.organizationId, organizationId), eq(equipmentDocumentsTable.equipmentId, equipmentId)))
      .orderBy(desc(equipmentDocumentsTable.uploadedAt));
  }

  async getEquipmentDocument(id: string): Promise<EquipmentDocument | undefined> {
    const [row] = await db().select().from(equipmentDocumentsTable).where(eq(equipmentDocumentsTable.documentId, id));
    return row || undefined;
  }

  async createEquipmentDocument(doc: any): Promise<EquipmentDocument> {
    const [created] = await db().insert(equipmentDocumentsTable).values(doc).returning();
    return created;
  }

  async deleteEquipmentDocument(id: string): Promise<boolean> {
    const result = await db().delete(equipmentDocumentsTable).where(eq(equipmentDocumentsTable.documentId, id));
    return didAffectRows(result);
  }

  // Asbestos Inspections (Client -> Building -> Inventory)
  async getClientsByOrg(organizationId: string): Promise<Client[]> {
    return await db()
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.organizationId, organizationId))
      .orderBy(desc(clientsTable.updatedAt));
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const [row] = await db().select().from(clientsTable).where(eq(clientsTable.id, id));
    return row || undefined;
  }

  async createClient(client: any): Promise<Client> {
    const [created] = await db().insert(clientsTable).values(client).returning();
    return created;
  }

  async getAsbestosBuildings(organizationId: string, clientId?: string | null): Promise<AsbestosBuilding[]> {
    const where = clientId
      ? and(eq(asbestosBuildingsTable.organizationId, organizationId), eq(asbestosBuildingsTable.clientId, clientId))
      : eq(asbestosBuildingsTable.organizationId, organizationId);
    return await db()
      .select()
      .from(asbestosBuildingsTable)
      .where(where as any)
      .orderBy(desc(asbestosBuildingsTable.updatedAt));
  }

  async getAsbestosBuildingById(id: string): Promise<AsbestosBuilding | undefined> {
    const [row] = await db().select().from(asbestosBuildingsTable).where(eq(asbestosBuildingsTable.buildingId, id));
    return row || undefined;
  }

  async createAsbestosBuilding(row: any): Promise<AsbestosBuilding> {
    const [created] = await db().insert(asbestosBuildingsTable).values(row).returning();
    return created;
  }

  async updateAsbestosBuilding(id: string, patch: any): Promise<AsbestosBuilding | undefined> {
    const [updated] = await db()
      .update(asbestosBuildingsTable)
      .set(patch)
      .where(eq(asbestosBuildingsTable.buildingId, id))
      .returning();
    return updated || undefined;
  }

  async getAsbestosInventoryItems(organizationId: string, buildingId: string): Promise<AsbestosInventoryItem[]> {
    return await db()
      .select()
      .from(asbestosInventoryItemsTable)
      .where(and(eq(asbestosInventoryItemsTable.organizationId, organizationId), eq(asbestosInventoryItemsTable.buildingId, buildingId)))
      .orderBy(desc(asbestosInventoryItemsTable.updatedAt));
  }

  async getAsbestosInventoryItemById(id: string): Promise<AsbestosInventoryItem | undefined> {
    const [row] = await db().select().from(asbestosInventoryItemsTable).where(eq(asbestosInventoryItemsTable.itemId, id));
    return row || undefined;
  }

  async createAsbestosInventoryItem(row: any): Promise<AsbestosInventoryItem> {
    const [created] = await db().insert(asbestosInventoryItemsTable).values(row).returning();
    return created;
  }

  async updateAsbestosInventoryItem(id: string, patch: any): Promise<AsbestosInventoryItem | undefined> {
    const [updated] = await db()
      .update(asbestosInventoryItemsTable)
      .set(patch)
      .where(eq(asbestosInventoryItemsTable.itemId, id))
      .returning();
    return updated || undefined;
  }

  async getAsbestosInspections(organizationId: string, buildingId?: string | null): Promise<AsbestosInspection[]> {
    const where = buildingId
      ? and(eq(asbestosInspectionsTable.organizationId, organizationId), eq(asbestosInspectionsTable.buildingId, buildingId))
      : eq(asbestosInspectionsTable.organizationId, organizationId);
    return await db()
      .select()
      .from(asbestosInspectionsTable)
      .where(where as any)
      .orderBy(desc(asbestosInspectionsTable.inspectionDate));
  }

  async getAsbestosInspectionById(id: string): Promise<AsbestosInspection | undefined> {
    const [row] = await db().select().from(asbestosInspectionsTable).where(eq(asbestosInspectionsTable.inspectionId, id));
    return row || undefined;
  }

  async createAsbestosInspection(row: any): Promise<AsbestosInspection> {
    const [created] = await db().insert(asbestosInspectionsTable).values(row).returning();
    return created;
  }

  async updateAsbestosInspection(id: string, patch: any): Promise<AsbestosInspection | undefined> {
    const [updated] = await db()
      .update(asbestosInspectionsTable)
      .set(patch)
      .where(eq(asbestosInspectionsTable.inspectionId, id))
      .returning();
    return updated || undefined;
  }

  async getAsbestosInspectionInventoryChanges(organizationId: string, inspectionId: string): Promise<AsbestosInspectionInventoryChange[]> {
    return await db()
      .select()
      .from(asbestosInspectionInventoryChangesTable)
      .where(and(eq(asbestosInspectionInventoryChangesTable.organizationId, organizationId), eq(asbestosInspectionInventoryChangesTable.inspectionId, inspectionId)))
      .orderBy(desc(asbestosInspectionInventoryChangesTable.createdAt));
  }

  async createAsbestosInspectionInventoryChange(row: any): Promise<AsbestosInspectionInventoryChange> {
    const [created] = await db().insert(asbestosInspectionInventoryChangesTable).values(row).returning();
    return created;
  }

  async getAsbestosInspectionSamples(organizationId: string, inspectionId: string): Promise<AsbestosInspectionSample[]> {
    return await db()
      .select()
      .from(asbestosInspectionSamplesTable)
      .where(and(eq(asbestosInspectionSamplesTable.organizationId, organizationId), eq(asbestosInspectionSamplesTable.inspectionId, inspectionId)))
      .orderBy(desc(asbestosInspectionSamplesTable.updatedAt));
  }

  async getAsbestosInspectionSampleById(id: string): Promise<AsbestosInspectionSample | undefined> {
    const [row] = await db().select().from(asbestosInspectionSamplesTable).where(eq(asbestosInspectionSamplesTable.sampleId, id));
    return row || undefined;
  }

  async createAsbestosInspectionSample(row: any): Promise<AsbestosInspectionSample> {
    const [created] = await db().insert(asbestosInspectionSamplesTable).values(row).returning();
    return created;
  }

  async updateAsbestosInspectionSample(id: string, patch: any): Promise<AsbestosInspectionSample | undefined> {
    const [updated] = await db()
      .update(asbestosInspectionSamplesTable)
      .set(patch)
      .where(eq(asbestosInspectionSamplesTable.sampleId, id))
      .returning();
    return updated || undefined;
  }

  async deleteAsbestosInspectionSample(id: string): Promise<boolean> {
    const result = await db().delete(asbestosInspectionSamplesTable).where(eq(asbestosInspectionSamplesTable.sampleId, id));
    return didAffectRows(result);
  }

  async getAsbestosBuildingSamples(organizationId: string, buildingId: string, sampleType?: string | null): Promise<AsbestosBuildingSample[]> {
    const where =
      sampleType && sampleType.trim()
        ? and(
            eq(asbestosBuildingSamplesTable.organizationId, organizationId),
            eq(asbestosBuildingSamplesTable.buildingId, buildingId),
            eq(asbestosBuildingSamplesTable.sampleType, sampleType.trim())
          )
        : and(eq(asbestosBuildingSamplesTable.organizationId, organizationId), eq(asbestosBuildingSamplesTable.buildingId, buildingId));
    return await db()
      .select()
      .from(asbestosBuildingSamplesTable)
      .where(where as any)
      .orderBy(desc(asbestosBuildingSamplesTable.collectedAt), desc(asbestosBuildingSamplesTable.updatedAt));
  }

  async getAsbestosBuildingSampleById(id: string): Promise<AsbestosBuildingSample | undefined> {
    const [row] = await db().select().from(asbestosBuildingSamplesTable).where(eq(asbestosBuildingSamplesTable.sampleId, id));
    return row || undefined;
  }

  async getAsbestosBuildingSamplesByInspection(organizationId: string, inspectionId: string): Promise<AsbestosBuildingSample[]> {
    return await db()
      .select()
      .from(asbestosBuildingSamplesTable)
      .where(and(eq(asbestosBuildingSamplesTable.organizationId, organizationId), eq(asbestosBuildingSamplesTable.inspectionId, inspectionId)))
      .orderBy(desc(asbestosBuildingSamplesTable.collectedAt), desc(asbestosBuildingSamplesTable.updatedAt));
  }

  async createAsbestosBuildingSample(row: any): Promise<AsbestosBuildingSample> {
    const [created] = await db().insert(asbestosBuildingSamplesTable).values(row).returning();
    return created;
  }

  async updateAsbestosBuildingSample(id: string, patch: any): Promise<AsbestosBuildingSample | undefined> {
    const [updated] = await db()
      .update(asbestosBuildingSamplesTable)
      .set({ ...patch, updatedAt: new Date() } as any)
      .where(eq(asbestosBuildingSamplesTable.sampleId, id))
      .returning();
    return updated || undefined;
  }

  async deleteAsbestosBuildingSample(id: string): Promise<boolean> {
    const result = await db().delete(asbestosBuildingSamplesTable).where(eq(asbestosBuildingSamplesTable.sampleId, id));
    return didAffectRows(result);
  }

  async getAsbestosInspectionDocuments(organizationId: string, inspectionId: string): Promise<AsbestosInspectionDocument[]> {
    return await db()
      .select()
      .from(asbestosInspectionDocumentsTable)
      .where(and(eq(asbestosInspectionDocumentsTable.organizationId, organizationId), eq(asbestosInspectionDocumentsTable.inspectionId, inspectionId)))
      .orderBy(desc(asbestosInspectionDocumentsTable.uploadedAt));
  }

  async getAsbestosInspectionDocumentById(id: string): Promise<AsbestosInspectionDocument | undefined> {
    const [row] = await db().select().from(asbestosInspectionDocumentsTable).where(eq(asbestosInspectionDocumentsTable.documentId, id));
    return row || undefined;
  }

  async createAsbestosInspectionDocument(row: any): Promise<AsbestosInspectionDocument> {
    const [created] = await db().insert(asbestosInspectionDocumentsTable).values(row).returning();
    return created;
  }

  async deleteAsbestosInspectionDocument(id: string): Promise<boolean> {
    const result = await db().delete(asbestosInspectionDocumentsTable).where(eq(asbestosInspectionDocumentsTable.documentId, id));
    return didAffectRows(result);
  }

  // Building hub
  async getBuildingInventoryChanges(organizationId: string, buildingId: string, itemId?: string | null): Promise<BuildingInventoryChange[]> {
    const where = itemId
      ? and(
          eq(buildingInventoryChangesTable.organizationId, organizationId),
          eq(buildingInventoryChangesTable.buildingId, buildingId),
          eq(buildingInventoryChangesTable.itemId, itemId)
        )
      : and(eq(buildingInventoryChangesTable.organizationId, organizationId), eq(buildingInventoryChangesTable.buildingId, buildingId));
    return await db()
      .select()
      .from(buildingInventoryChangesTable)
      .where(where as any)
      .orderBy(desc(buildingInventoryChangesTable.createdAt));
  }

  async createBuildingInventoryChange(row: any): Promise<BuildingInventoryChange> {
    const [created] = await db().insert(buildingInventoryChangesTable).values(row).returning();
    return created;
  }

  async getBuildingDocuments(organizationId: string, buildingId: string): Promise<BuildingDocument[]> {
    return await db()
      .select()
      .from(buildingDocumentsTable)
      .where(and(eq(buildingDocumentsTable.organizationId, organizationId), eq(buildingDocumentsTable.buildingId, buildingId)))
      .orderBy(desc(buildingDocumentsTable.uploadedAt));
  }

  async getBuildingDocumentById(id: string): Promise<BuildingDocument | undefined> {
    const [row] = await db().select().from(buildingDocumentsTable).where(eq(buildingDocumentsTable.documentId, id));
    return row || undefined;
  }

  async createBuildingDocument(row: any): Promise<BuildingDocument> {
    const [created] = await db().insert(buildingDocumentsTable).values(row).returning();
    return created;
  }

  async deleteBuildingDocument(id: string): Promise<boolean> {
    const result = await db().delete(buildingDocumentsTable).where(eq(buildingDocumentsTable.documentId, id));
    return didAffectRows(result);
  }

  async getAbatementProjects(organizationId: string, buildingId: string): Promise<AbatementProject[]> {
    return await db()
      .select()
      .from(abatementProjectsTable)
      .where(and(eq(abatementProjectsTable.organizationId, organizationId), eq(abatementProjectsTable.buildingId, buildingId)))
      .orderBy(desc(abatementProjectsTable.updatedAt));
  }

  async createAbatementProject(row: any): Promise<AbatementProject> {
    const [created] = await db().insert(abatementProjectsTable).values(row).returning();
    return created;
  }

  async updateAbatementProject(id: string, patch: any): Promise<AbatementProject | undefined> {
    const [updated] = await db()
      .update(abatementProjectsTable)
      .set(patch)
      .where(eq(abatementProjectsTable.projectId, id))
      .returning();
    return updated || undefined;
  }

  async getAbatementProjectItemsCount(organizationId: string, projectId: string): Promise<number> {
    const rows = await db()
      .select({ count: sql<number>`count(*)` })
      .from(abatementProjectItemsTable)
      .where(and(eq(abatementProjectItemsTable.organizationId, organizationId), eq(abatementProjectItemsTable.projectId, projectId)));
    return rows?.[0]?.count ?? 0;
  }

  async linkAbatementProjectItem(row: any): Promise<AbatementProjectItem> {
    const [created] = await db().insert(abatementProjectItemsTable).values(row).returning();
    return created;
  }

  async getAbatementRepairLogs(organizationId: string, buildingId: string): Promise<AbatementRepairLog[]> {
    return await db()
      .select()
      .from(abatementRepairLogsTable)
      .where(and(eq(abatementRepairLogsTable.organizationId, organizationId), eq(abatementRepairLogsTable.buildingId, buildingId)))
      .orderBy(desc(abatementRepairLogsTable.abatementDate), desc(abatementRepairLogsTable.updatedAt));
  }

  async createAbatementRepairLog(row: any): Promise<AbatementRepairLog> {
    const [created] = await db().insert(abatementRepairLogsTable).values(row).returning();
    return created;
  }

  async updateAbatementRepairLog(id: string, patch: any): Promise<AbatementRepairLog | undefined> {
    const [updated] = await db()
      .update(abatementRepairLogsTable)
      .set({ ...patch, updatedAt: new Date() } as any)
      .where(eq(abatementRepairLogsTable.logId, id))
      .returning();
    return updated || undefined;
  }

  async deleteAbatementRepairLog(id: string): Promise<boolean> {
    const result = await db().delete(abatementRepairLogsTable).where(eq(abatementRepairLogsTable.logId, id));
    return didAffectRows(result);
  }

  async getBuildingBudget(organizationId: string, buildingId: string): Promise<BuildingBudget | undefined> {
    const [row] = await db()
      .select()
      .from(buildingBudgetsTable)
      .where(and(eq(buildingBudgetsTable.organizationId, organizationId), eq(buildingBudgetsTable.buildingId, buildingId)))
      .orderBy(desc(buildingBudgetsTable.updatedAt));
    return row || undefined;
  }

  async upsertBuildingBudget(row: any): Promise<BuildingBudget> {
    const existing = await this.getBuildingBudget(row.organizationId, row.buildingId);
    if (!existing) {
      const [created] = await db().insert(buildingBudgetsTable).values(row).returning();
      return created;
    }
    const [updated] = await db()
      .update(buildingBudgetsTable)
      .set({ ...row, updatedAt: new Date() })
      .where(eq(buildingBudgetsTable.budgetId, existing.budgetId))
      .returning();
    return updated || existing;
  }

  async createBuildingBudgetChange(row: any): Promise<BuildingBudgetChange> {
    const [created] = await db().insert(buildingBudgetChangesTable).values(row).returning();
    return created;
  }

  async getBuildingBudgetChanges(organizationId: string, budgetId: string): Promise<BuildingBudgetChange[]> {
    return await db()
      .select()
      .from(buildingBudgetChangesTable)
      .where(and(eq(buildingBudgetChangesTable.organizationId, organizationId), eq(buildingBudgetChangesTable.budgetId, budgetId)))
      .orderBy(desc(buildingBudgetChangesTable.createdAt));
  }

  async getInspectionSamplesForBuilding(organizationId: string, buildingId: string, sampleType?: string | null): Promise<any[]> {
    const st = sampleType && sampleType.trim() ? sampleType.trim() : null;

    const whereBuilding =
      st
        ? and(
            eq(asbestosBuildingSamplesTable.organizationId, organizationId),
            eq(asbestosBuildingSamplesTable.buildingId, buildingId),
            eq(asbestosBuildingSamplesTable.sampleType, st)
          )
        : and(eq(asbestosBuildingSamplesTable.organizationId, organizationId), eq(asbestosBuildingSamplesTable.buildingId, buildingId));

    const buildingRows = await db()
      .select()
      .from(asbestosBuildingSamplesTable)
      .where(whereBuilding as any)
      .orderBy(desc(asbestosBuildingSamplesTable.collectedAt), desc(asbestosBuildingSamplesTable.updatedAt));

    // Back-compat: include legacy inspection samples if they still exist in the DB and haven't been migrated.
    const whereLegacy =
      st
        ? and(
            eq(asbestosInspectionsTable.organizationId, organizationId),
            eq(asbestosInspectionsTable.buildingId, buildingId),
            eq(asbestosInspectionSamplesTable.sampleType, st)
          )
        : and(eq(asbestosInspectionsTable.organizationId, organizationId), eq(asbestosInspectionsTable.buildingId, buildingId));

    const legacyRows = await db()
      .select({
        sample: asbestosInspectionSamplesTable,
      })
      .from(asbestosInspectionSamplesTable)
      .innerJoin(asbestosInspectionsTable, eq(asbestosInspectionSamplesTable.inspectionId, asbestosInspectionsTable.inspectionId))
      .where(whereLegacy as any)
      .orderBy(desc(asbestosInspectionSamplesTable.updatedAt));

    const byId = new Map<string, any>();
    for (const s of buildingRows as any[]) {
      if (s?.sampleId) byId.set(String(s.sampleId), s);
    }
    for (const r of legacyRows as any[]) {
      const s = r?.sample;
      if (s?.sampleId && !byId.has(String(s.sampleId))) {
        byId.set(String(s.sampleId), s);
      }
    }
    return Array.from(byId.values());
  }

  async getAirMonitoringDocuments(jobId: string): Promise<AirMonitoringDocument[]> {
    return await db()
      .select()
      .from(airMonitoringDocuments)
      .where(eq(airMonitoringDocuments.jobId, jobId))
      .orderBy(desc(airMonitoringDocuments.uploadedAt));
  }

  async getAirMonitoringDocument(id: string): Promise<AirMonitoringDocument | undefined> {
    const [doc] = await db().select().from(airMonitoringDocuments).where(eq(airMonitoringDocuments.id, id));
    return doc || undefined;
  }

  async createAirMonitoringDocument(doc: InsertAirMonitoringDocument): Promise<AirMonitoringDocument> {
    const [created] = await db().insert(airMonitoringDocuments).values(doc).returning();
    return created;
  }

  async deleteAirMonitoringDocument(id: string): Promise<boolean> {
    const result = await db().delete(airMonitoringDocuments).where(eq(airMonitoringDocuments.id, id));
    return didAffectRows(result);
  }

  // Daily Weather Log methods
  async getDailyWeatherLogs(jobId: string): Promise<DailyWeatherLog[]> {
    return await db()
      .select()
      .from(dailyWeatherLogs)
      .where(eq(dailyWeatherLogs.jobId, jobId))
      .orderBy(desc(dailyWeatherLogs.logDate));
  }

  async getDailyWeatherLog(id: string): Promise<DailyWeatherLog | undefined> {
    const [log] = await db().select().from(dailyWeatherLogs).where(eq(dailyWeatherLogs.id, id));
    return log || undefined;
  }

  async createDailyWeatherLog(insertLog: InsertDailyWeatherLog): Promise<DailyWeatherLog> {
    const [log] = await db()
      .insert(dailyWeatherLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async updateDailyWeatherLog(id: string, updateLog: Partial<InsertDailyWeatherLog>): Promise<DailyWeatherLog | undefined> {
    const [log] = await db()
      .update(dailyWeatherLogs)
      .set({ ...updateLog, updatedAt: new Date() })
      .where(eq(dailyWeatherLogs.id, id))
      .returning();
    return log || undefined;
  }

  async deleteDailyWeatherLog(id: string): Promise<boolean> {
    const result = await db().delete(dailyWeatherLogs).where(eq(dailyWeatherLogs.id, id));
    return didAffectRows(result);
  }

  async getHomogeneousAreas(surveyId: string): Promise<HomogeneousArea[]> {
    return await db()
      .select()
      .from(homogeneousAreas)
      .where(eq(homogeneousAreas.surveyId, surveyId))
      .orderBy(desc(homogeneousAreas.createdAt));
  }

  async createHomogeneousArea(surveyId: string, data: { title?: string; description?: string | null }): Promise<HomogeneousArea> {
    const existingCount = await db()
      .select({ count: sql<number>`count(*)` })
      .from(homogeneousAreas)
      .where(eq(homogeneousAreas.surveyId, surveyId));
    const nextIndex = (existingCount[0]?.count ?? 0) + 1;
    const haId = `HA-${nextIndex}`;
    const [area] = await db()
      .insert(homogeneousAreas)
      .values({
        id: nanoid(),
        surveyId,
        haId,
        title: data.title && data.title.trim() ? data.title : haId,
        description: data.description ?? null,
      })
      .returning();
    return area;
  }

  async deleteHomogeneousArea(surveyId: string, id: string): Promise<boolean> {
    const result = await db()
      .delete(homogeneousAreas)
      .where(and(eq(homogeneousAreas.surveyId, surveyId), eq(homogeneousAreas.id, id)));
    return didAffectRows(result);
  }

  async getFunctionalAreas(surveyId: string): Promise<FunctionalArea[]> {
    return await db()
      .select()
      .from(functionalAreas)
      .where(eq(functionalAreas.surveyId, surveyId))
      .orderBy(desc(functionalAreas.createdAt));
  }

  async createFunctionalArea(surveyId: string, data: { 
    title: string; 
    description?: string | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    wallCount?: number | null;
    doorCount?: number | null;
    windowCount?: number | null;
    sqft?: number | null;
    wallSqft?: number | null;
    photoUrl?: string | null;
  }): Promise<FunctionalArea> {
    const [area] = await db()
      .insert(functionalAreas)
      .values({
        id: nanoid(),
        surveyId,
        title: data.title,
        description: data.description ?? null,
        length: data.length ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        wallCount: data.wallCount ?? null,
        doorCount: data.doorCount ?? null,
        windowCount: data.windowCount ?? null,
        sqft: data.sqft ?? null,
        wallSqft: data.wallSqft ?? null,
        photoUrl: data.photoUrl ?? null,
      })
      .returning();
    return area;
  }

  async updateFunctionalArea(surveyId: string, id: string, data: Partial<{
    title: string;
    description?: string | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    wallCount?: number | null;
    doorCount?: number | null;
    windowCount?: number | null;
    sqft?: number | null;
    wallSqft?: number | null;
    photoUrl?: string | null;
  }>): Promise<FunctionalArea | undefined> {
    const [updated] = await db()
      .update(functionalAreas)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(functionalAreas.surveyId, surveyId), eq(functionalAreas.id, id)))
      .returning();
    return updated || undefined;
  }

  async deleteFunctionalArea(surveyId: string, id: string): Promise<boolean> {
    const result = await db()
      .delete(functionalAreas)
      .where(and(eq(functionalAreas.surveyId, surveyId), eq(functionalAreas.id, id)));
    return didAffectRows(result);
  }

  // New features storage methods - In-memory implementations
  // Report Templates
  private reportTemplates: any[] = [];

  async getReportTemplates(): Promise<any[]> {
    return this.reportTemplates;
  }

  async createReportTemplate(templateData: any): Promise<any> {
    const template = { id: nanoid(), ...templateData, createdAt: new Date() };
    this.reportTemplates.push(template);
    return template;
  }

  async generateReport(templateId: string, surveyIds: string[]): Promise<string> {
    return `/reports/generated_${templateId}_${Date.now()}.pdf`;
  }

  // Clients
  // Note: legacy in-memory client portal stubs were removed. Use the D1-backed `clients` table instead.

  // Messages
  private messages: any[] = [];

  async getMessages(filter?: string): Promise<any[]> {
    let filtered = this.messages;
    if (filter === 'unread') filtered = filtered.filter(m => !m.isRead);
    if (filter === 'high_priority') filtered = filtered.filter(m => ['high', 'urgent'].includes(m.priority));
    
    return filtered.map(message => ({
      ...message,
      fromUser: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      toUser: message.toUserId ? { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' } : null,
      survey: message.surveyId ? { siteName: 'Sample Site' } : null
    }));
  }

  async createMessage(messageData: any): Promise<any> {
    const message = { 
      id: nanoid(), 
      ...messageData, 
      fromUserId: 'current-user', 
      createdAt: new Date() 
    };
    this.messages.push(message);
    return message;
  }

  async replyToMessage(messageId: string, content: string): Promise<any> {
    const originalMessage = this.messages.find(m => m.id === messageId);
    if (!originalMessage) throw new Error('Message not found');
    
    const reply = {
      id: nanoid(),
      fromUserId: 'current-user',
      toUserId: originalMessage.fromUserId,
      subject: `Re: ${originalMessage.subject}`,
      content,
      parentMessageId: messageId,
      createdAt: new Date()
    };
    this.messages.push(reply);
    return reply;
  }

  async markMessageAsRead(messageId: string): Promise<any> {
    const index = this.messages.findIndex(m => m.id === messageId);
    if (index === -1) throw new Error('Message not found');
    this.messages[index] = { ...this.messages[index], isRead: true, readAt: new Date() };
    return this.messages[index];
  }

  // Notifications
  private notifications: any[] = [
    {
      id: "notif-1",
      userId: 'current-user',
      title: 'Survey Report Due',
      content: 'The report for Midland Industrial Complex survey is due in 3 days.',
      type: 'due_date',
      priority: 'high',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: "notif-2",
      userId: 'current-user', 
      title: 'New Message',
      content: 'You have received a new message from John Doe regarding the asbestos survey.',
      type: 'message',
      priority: 'normal',
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: "notif-3",
      userId: 'current-user',
      title: 'Compliance Alert',
      content: 'EPA reporting deadline is approaching for the downtown office survey.',
      type: 'compliance_alert',
      priority: 'urgent',
      isRead: true,
      readAt: new Date(Date.now() - 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }
  ];

  async getNotifications(filter?: string): Promise<any[]> {
    let filtered = this.notifications;
    if (filter === 'unread') filtered = filtered.filter(n => !n.isRead);
    if (filter === 'high_priority') filtered = filtered.filter(n => ['high', 'urgent'].includes(n.priority));
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(notificationData: any): Promise<any> {
    const notification = { id: nanoid(), ...notificationData, createdAt: new Date() };
    this.notifications.push(notification);
    return notification;
  }

  async markNotificationAsRead(notificationId: string): Promise<any> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index === -1) throw new Error('Notification not found');
    this.notifications[index] = { ...this.notifications[index], isRead: true, readAt: new Date() };
    return this.notifications[index];
  }

  async markAllNotificationsAsRead(): Promise<void> {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true, readAt: new Date() }));
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index === -1) throw new Error('Notification not found');
    this.notifications.splice(index, 1);
  }

  // Chain of Custody
  private chainOfCustodyRecords: any[] = [];

  async getChainOfCustodyRecords(sampleId?: string): Promise<any[]> {
    let filtered = this.chainOfCustodyRecords;
    if (sampleId) filtered = filtered.filter(r => r.sampleId === sampleId);
    return filtered.sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime());
  }

  async createChainOfCustodyRecord(recordData: any): Promise<any> {
    const record = { 
      id: nanoid(), 
      ...recordData, 
      transferDate: new Date(),
      createdAt: new Date() 
    };
    this.chainOfCustodyRecords.push(record);
    return record;
  }

  // Compliance Rules and Tracking
  private complianceRules: any[] = [
    {
      id: "rule-1",
      name: 'EPA Asbestos Report Submission',
      description: 'Submit asbestos survey report to EPA within 30 days',
      regulatoryBody: 'EPA',
      ruleType: 'reporting',
      warningDays: 30,
      criticalDays: 7,
      autoCheck: true,
      isActive: true,
      createdAt: new Date()
    },
    {
      id: "rule-2",
      name: 'OSHA Air Monitoring Documentation',
      description: 'Document all air monitoring activities per OSHA requirements',
      regulatoryBody: 'OSHA',
      ruleType: 'documentation',
      warningDays: 15,
      criticalDays: 3,
      autoCheck: true,
      isActive: true,
      createdAt: new Date()
    }
  ];

  private complianceTracking: any[] = [];

  async getComplianceRules(): Promise<any[]> {
    return this.complianceRules;
  }

  async createComplianceRule(ruleData: any): Promise<any> {
    const rule = { id: nanoid(), ...ruleData, createdAt: new Date() };
    this.complianceRules.push(rule);
    return rule;
  }

  async getComplianceTracking(surveyId?: string): Promise<any[]> {
    let filtered = this.complianceTracking;
    if (surveyId) filtered = filtered.filter(t => t.surveyId === surveyId);
    
    // Create sample tracking data if empty
    if (this.complianceTracking.length === 0) {
      const surveys = await this.getSurveys();
      if (surveys.length > 0) {
        this.complianceTracking.push({
          id: nanoid(),
          surveyId: surveys[0].id,
          ruleId: this.complianceRules[0]?.id,
          status: 'warning',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          assignedTo: 'John Doe',
          lastChecked: new Date(),
          autoGenerated: true
        });
      }
    }
    
    return this.complianceTracking.map(item => ({
      ...item,
      rule: this.complianceRules.find(r => r.id === item.ruleId) || this.complianceRules[0],
      survey: { siteName: 'Sample Site', surveyType: 'Sample Type', surveyDate: new Date() }
    }));
  }

  async updateComplianceTracking(id: string, updates: any): Promise<any> {
    const index = this.complianceTracking.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Compliance tracking not found');
    this.complianceTracking[index] = { ...this.complianceTracking[index], ...updates };
    return this.complianceTracking[index];
  }

  // Collaboration Sessions
  private collaborationSessions: any[] = [];

  async getCollaborationSessions(surveyId: string): Promise<any[]> {
    return this.collaborationSessions.filter(s => s.surveyId === surveyId);
  }

  async createCollaborationSession(sessionData: any): Promise<any> {
    const session = { id: nanoid(), ...sessionData, createdAt: new Date() };
    this.collaborationSessions.push(session);
    return session;
  }

  // Notification Settings
  private notificationSettings: any[] = [
    {
      id: "notify-1",
      type: 'survey_update',
      label: 'Survey Updates',
      description: 'Get notified when survey status changes',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: false
    },
    {
      id: "notify-2",
      type: 'message',
      label: 'New Messages',
      description: 'Get notified about new messages',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: true
    },
    {
      id: "notify-3",
      type: 'compliance_alert',
      label: 'Compliance Alerts',
      description: 'Get notified about compliance deadlines',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: true
    },
    {
      id: "notify-4",
      type: 'due_date',
      label: 'Due Date Reminders',
      description: 'Get reminded about upcoming deadlines',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: false
    }
  ];

  async getNotificationSettings(): Promise<any[]> {
    return this.notificationSettings;
  }

  async updateNotificationSetting(id: string, updates: any): Promise<any> {
    const index = this.notificationSettings.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Notification setting not found');
    this.notificationSettings[index] = { ...this.notificationSettings[index], ...updates };
    return this.notificationSettings[index];
  }

  // Advanced Air Monitoring - Equipment Management
  private airMonitoringEquipment: any[] = [
    {
      id: "equip-1",
      name: 'GilAir Plus Personal Sampling Pump',
      model: 'GilAir Plus',
      serialNumber: 'GAP-2023-001',
      type: 'pump',
      status: 'available',
      lastCalibration: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      nextCalibration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Equipment Room A',
      specifications: {
        flowRateRange: '0.005 to 5.0 L/min',
        accuracy: '±2%',
        operatingTemp: '-10°C to +50°C'
      },
      maintenanceHistory: [
        {
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'calibration',
          description: 'Annual calibration check performed',
          technician: 'John Smith'
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: "equip-2",
      name: 'MiniRAE 3000+ VOC Monitor',
      model: 'MiniRAE 3000+',
      serialNumber: 'MR3-2023-005',
      type: 'detector',
      status: 'in_use',
      lastCalibration: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      nextCalibration: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: 'Sarah Johnson',
      location: 'Field Site Beta',
      specifications: {
        detectionLimit: '0.1 ppm',
        accuracy: '±3%',
        operatingTemp: '-20°C to +50°C'
      },
      maintenanceHistory: [
        {
          date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'maintenance',
          description: 'Sensor cleaning and bump test',
          technician: 'Mike Davis'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ];

  // Equipment management for advanced air monitoring (memory-based for now)
  async getAirMonitoringEquipmentList(): Promise<any[]> {
    return this.airMonitoringEquipment;
  }

  async createAirMonitoringEquipmentItem(equipmentData: any): Promise<any> {
    const equipment = { 
      id: nanoid(), 
      ...equipmentData, 
      createdAt: new Date().toISOString() 
    };
    this.airMonitoringEquipment.push(equipment);
    return equipment;
  }

  async updateAirMonitoringEquipmentItem(id: string, updates: any): Promise<any> {
    const index = this.airMonitoringEquipment.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Equipment not found');
    this.airMonitoringEquipment[index] = { 
      ...this.airMonitoringEquipment[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.airMonitoringEquipment[index];
  }

  // Quality Control Checks
  private qualityControlChecks: any[] = [
    {
      id: "qc-1",
      sampleId: 'AS-001-2025',
      checkType: 'flow_rate',
      result: 'pass',
      expectedValue: 2.0,
      actualValue: 1.98,
      deviation: -1.0,
      tolerance: 5.0,
      performedBy: 'John Smith',
      performedAt: new Date().toISOString(),
      autoGenerated: true
    },
    {
      id: "qc-2",
      sampleId: 'AS-002-2025',
      checkType: 'calibration',
      result: 'warning',
      expectedValue: 100.0,
      actualValue: 107.0,
      deviation: 7.0,
      tolerance: 5.0,
      performedBy: 'Auto System',
      performedAt: new Date().toISOString(),
      notes: 'Calibration drift detected, within acceptable range but recommend recalibration',
      autoGenerated: true
    }
  ];

  async getQualityControlChecks(): Promise<any[]> {
    return this.qualityControlChecks;
  }

  async createQualityControlCheck(checkData: any): Promise<any> {
    const check = { 
      id: nanoid(), 
      ...checkData, 
      performedAt: new Date().toISOString() 
    };
    this.qualityControlChecks.push(check);
    return check;
  }

  // PEL Alerts
  private pelAlerts: any[] = [
    {
      id: "pel-1",
      sampleId: 'AS-003-2025',
      analyte: 'Asbestos',
      measuredValue: 0.15,
      pelValue: 0.1,
      exceedanceLevel: 50,
      severity: 'critical',
      alertTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: "pel-2",
      sampleId: 'AS-004-2025',
      analyte: 'Lead',
      measuredValue: 0.065,
      pelValue: 0.05,
      exceedanceLevel: 30,
      severity: 'warning',
      alertTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      acknowledged: true,
      acknowledgedBy: 'Sarah Johnson',
      correctiveActions: 'Increased ventilation, additional sampling ordered'
    }
  ];

  async getPELAlerts(): Promise<any[]> {
    return this.pelAlerts.sort((a, b) => new Date(b.alertTime).getTime() - new Date(a.alertTime).getTime());
  }

  async acknowledgePELAlert(id: string, acknowledgedBy: string, correctiveActions?: string): Promise<any> {
    const index = this.pelAlerts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('PEL alert not found');
    
    this.pelAlerts[index] = {
      ...this.pelAlerts[index],
      acknowledged: true,
      acknowledgedBy,
      acknowledgedAt: new Date().toISOString(),
      correctiveActions
    };
    
    return this.pelAlerts[index];
  }

  // Air Samples with PEL Analysis
  async getAirSamplesWithPELAnalysis(): Promise<any[]> {
    const samples = await this.getAirSamples();
    return samples.map(sample => ({
      ...sample,
      results: [
        {
          analyte: sample.analyte,
          concentration: Math.random() * 0.2, // Mock concentration
          pelLimit: sample.analyte === 'Asbestos' ? 0.1 : 
                   sample.analyte === 'Lead' ? 0.05 : 0.25,
          unit: 'mg/m³'
        }
      ]
    }));
  }
}

export const storage = new DatabaseStorage();
