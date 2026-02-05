import { 
  surveys, 
  observations, 
  observationPhotos,
  personnelProfiles,
  airMonitoringJobs,
  airSamples,
  airMonitoringEquipment,
  fieldToolsEquipment,
  userProfiles,
  dailyWeatherLogs,
  type Survey, 
  type InsertSurvey,
  type Observation,
  type InsertObservation,
  type ObservationPhoto,
  type InsertObservationPhoto,
  type PersonnelProfile,
  type InsertPersonnelProfile,
  type AirMonitoringJob,
  type InsertAirMonitoringJob,
  type AirSample,
  type InsertAirSample,
  type AirMonitoringEquipment,
  type InsertAirMonitoringEquipment,
  type FieldToolsEquipment,
  type InsertFieldToolsEquipment,
  type UserProfile,
  type InsertUserProfile,
  type DailyWeatherLog,
  type InsertDailyWeatherLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and } from "drizzle-orm";
import { nanoid } from "nanoid";

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
  createObservationPhoto(photo: InsertObservationPhoto): Promise<ObservationPhoto>;
  deleteObservationPhoto(id: string): Promise<boolean>;
  
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
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;

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

export interface HomogeneousArea {
  id: string;
  surveyId: string;
  title: string;
  description?: string | null;
  createdAt: Date;
}

export interface FunctionalArea {
  id: string;
  surveyId: string;
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
  createdAt: Date;
}

export class DatabaseStorage implements IStorage {
  private homogeneousAreas: HomogeneousArea[] = [];
  private functionalAreas: FunctionalArea[] = [];
  async getSurveys(): Promise<Survey[]> {
    return await db.select().from(surveys).orderBy(desc(surveys.updatedAt));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey || undefined;
  }

  async createSurvey(insertSurvey: InsertSurvey): Promise<Survey> {
    const [survey] = await db
      .insert(surveys)
      .values(insertSurvey)
      .returning();
    return survey;
  }

  async updateSurvey(id: string, updateSurvey: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const [survey] = await db
      .update(surveys)
      .set({ ...updateSurvey, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return survey || undefined;
  }

  async updateSurveySitePhoto(id: string, sitePhotoUrl: string): Promise<Survey | undefined> {
    const [survey] = await db
      .update(surveys)
      .set({ sitePhotoUrl, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return survey || undefined;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    const result = await db.delete(surveys).where(eq(surveys.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchSurveys(query: string): Promise<Survey[]> {
    return await db
      .select()
      .from(surveys)
      .where(
        or(
          ilike(surveys.siteName, `%${query}%`),
          ilike(surveys.address, `%${query}%`),
          ilike(surveys.jobNumber, `%${query}%`),
          ilike(surveys.inspector, `%${query}%`),
          ilike(surveys.surveyType, `%${query}%`)
        )
      )
      .orderBy(desc(surveys.updatedAt));
  }

  async getObservations(surveyId: string): Promise<Observation[]> {
    return await db
      .select()
      .from(observations)
      .where(eq(observations.surveyId, surveyId))
      .orderBy(desc(observations.createdAt));
  }

  async getObservation(id: string): Promise<Observation | undefined> {
    const [observation] = await db.select().from(observations).where(eq(observations.id, id));
    return observation || undefined;
  }

  async createObservation(insertObservation: InsertObservation): Promise<Observation> {
    const [observation] = await db
      .insert(observations)
      .values(insertObservation)
      .returning();
    return observation;
  }

  async updateObservation(id: string, updateObservation: Partial<InsertObservation>): Promise<Observation | undefined> {
    const [observation] = await db
      .update(observations)
      .set({ ...updateObservation, updatedAt: new Date() })
      .where(eq(observations.id, id))
      .returning();
    return observation || undefined;
  }

  async deleteObservation(id: string): Promise<boolean> {
    const result = await db.delete(observations).where(eq(observations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getObservationPhotos(observationId: string): Promise<ObservationPhoto[]> {
    return await db
      .select()
      .from(observationPhotos)
      .where(eq(observationPhotos.observationId, observationId));
  }

  async createObservationPhoto(insertPhoto: InsertObservationPhoto): Promise<ObservationPhoto> {
    const [photo] = await db
      .insert(observationPhotos)
      .values(insertPhoto)
      .returning();
    return photo;
  }

  async deleteObservationPhoto(id: string): Promise<boolean> {
    const result = await db.delete(observationPhotos).where(eq(observationPhotos.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSurveyStats(): Promise<{
    totalSurveys: number;
    pendingReviews: number;
    samplesCollected: number;
    activeSites: number;
  }> {
    const totalSurveys = await db.select().from(surveys);
    const pendingReviews = await db.select().from(surveys).where(eq(surveys.status, 'in-progress'));
    const allObservations = await db.select().from(observations);
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
    return await db.select().from(personnelProfiles).orderBy(desc(personnelProfiles.createdAt));
  }

  async getPersonnelProfile(id: string): Promise<PersonnelProfile | undefined> {
    const [profile] = await db.select().from(personnelProfiles).where(eq(personnelProfiles.id, id));
    return profile;
  }

  async createPersonnelProfile(profile: InsertPersonnelProfile): Promise<PersonnelProfile> {
    const [newProfile] = await db.insert(personnelProfiles).values(profile).returning();
    return newProfile;
  }

  async updatePersonnelProfile(id: string, profile: Partial<InsertPersonnelProfile>): Promise<PersonnelProfile | undefined> {
    const [updatedProfile] = await db
      .update(personnelProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(personnelProfiles.id, id))
      .returning();
    return updatedProfile;
  }

  async deletePersonnelProfile(id: string): Promise<boolean> {
    const result = await db.delete(personnelProfiles).where(eq(personnelProfiles.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Air monitoring job methods
  async getAirMonitoringJobs(): Promise<AirMonitoringJob[]> {
    return await db.select().from(airMonitoringJobs).orderBy(desc(airMonitoringJobs.createdAt));
  }

  async getAirMonitoringJobById(id: string): Promise<AirMonitoringJob> {
    const [job] = await db.select().from(airMonitoringJobs).where(eq(airMonitoringJobs.id, id));
    if (!job) throw new Error('Air monitoring job not found');
    return job;
  }

  async createAirMonitoringJob(job: InsertAirMonitoringJob): Promise<AirMonitoringJob> {
    const [newJob] = await db.insert(airMonitoringJobs).values(job).returning();
    return newJob;
  }

  async updateAirMonitoringJob(id: string, job: Partial<InsertAirMonitoringJob>): Promise<AirMonitoringJob | undefined> {
    const [updatedJob] = await db
      .update(airMonitoringJobs)
      .set({ ...job, updatedAt: new Date() })
      .where(eq(airMonitoringJobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteAirMonitoringJob(id: string): Promise<boolean> {
    const result = await db.delete(airMonitoringJobs).where(eq(airMonitoringJobs.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAirMonitoringJobSamples(jobId: string): Promise<AirSample[]> {
    return await db.select().from(airSamples).where(eq(airSamples.jobId, jobId)).orderBy(desc(airSamples.createdAt));
  }

  // Air sample methods
  async getAirSamples(): Promise<AirSample[]> {
    return await db.select().from(airSamples).orderBy(desc(airSamples.createdAt));
  }

  async getAirSample(id: string): Promise<AirSample | undefined> {
    const [sample] = await db.select().from(airSamples).where(eq(airSamples.id, id));
    return sample;
  }

  async createAirSample(sample: InsertAirSample): Promise<AirSample> {
    const [newSample] = await db.insert(airSamples).values(sample).returning();
    return newSample;
  }

  async updateAirSample(id: string, sample: Partial<InsertAirSample>): Promise<AirSample | undefined> {
    try {
      const [updatedSample] = await db.update(airSamples)
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
    const result = await db.delete(airSamples).where(eq(airSamples.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Air monitoring equipment methods
  async getAirMonitoringEquipment(): Promise<AirMonitoringEquipment[]> {
    return await db.select().from(airMonitoringEquipment).orderBy(desc(airMonitoringEquipment.createdAt));
  }

  async getAirMonitoringEquipmentItem(id: string): Promise<AirMonitoringEquipment | undefined> {
    const [equipment] = await db.select().from(airMonitoringEquipment).where(eq(airMonitoringEquipment.id, id));
    return equipment;
  }

  async createAirMonitoringEquipment(equipment: InsertAirMonitoringEquipment): Promise<AirMonitoringEquipment> {
    const [newEquipment] = await db.insert(airMonitoringEquipment).values(equipment).returning();
    return newEquipment;
  }

  async updateAirMonitoringEquipment(id: string, equipment: Partial<InsertAirMonitoringEquipment>): Promise<AirMonitoringEquipment | undefined> {
    const [updatedEquipment] = await db
      .update(airMonitoringEquipment)
      .set(equipment)
      .where(eq(airMonitoringEquipment.id, id))
      .returning();
    return updatedEquipment;
  }

  async deleteAirMonitoringEquipment(id: string): Promise<boolean> {
    const result = await db.delete(airMonitoringEquipment).where(eq(airMonitoringEquipment.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Field tools equipment methods
  async getFieldToolsEquipment(userId: string): Promise<FieldToolsEquipment[]> {
    return await db.select().from(fieldToolsEquipment).where(eq(fieldToolsEquipment.userId, userId));
  }

  async replaceFieldToolsEquipment(userId: string, items: InsertFieldToolsEquipment[]): Promise<FieldToolsEquipment[]> {
    await db.delete(fieldToolsEquipment).where(eq(fieldToolsEquipment.userId, userId));
    if (!items.length) return [];
    const payload = items.map((item) => ({
      ...item,
      userId,
    }));
    const inserted = await db.insert(fieldToolsEquipment).values(payload).returning();
    return inserted;
  }

  // User profile methods
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const existing = await this.getUserProfile(profile.userId);
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(userProfiles.userId, profile.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  // Daily Weather Log methods
  async getDailyWeatherLogs(jobId: string): Promise<DailyWeatherLog[]> {
    return await db
      .select()
      .from(dailyWeatherLogs)
      .where(eq(dailyWeatherLogs.jobId, jobId))
      .orderBy(desc(dailyWeatherLogs.logDate));
  }

  async createDailyWeatherLog(insertLog: InsertDailyWeatherLog): Promise<DailyWeatherLog> {
    const [log] = await db
      .insert(dailyWeatherLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async updateDailyWeatherLog(id: string, updateLog: Partial<InsertDailyWeatherLog>): Promise<DailyWeatherLog | undefined> {
    const [log] = await db
      .update(dailyWeatherLogs)
      .set({ ...updateLog, updatedAt: new Date() })
      .where(eq(dailyWeatherLogs.id, id))
      .returning();
    return log || undefined;
  }

  async deleteDailyWeatherLog(id: string): Promise<boolean> {
    const result = await db.delete(dailyWeatherLogs).where(eq(dailyWeatherLogs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getHomogeneousAreas(surveyId: string): Promise<HomogeneousArea[]> {
    return this.homogeneousAreas.filter(area => area.surveyId === surveyId);
  }

  async createHomogeneousArea(surveyId: string, data: { title?: string; description?: string | null }): Promise<HomogeneousArea> {
    const existing = this.homogeneousAreas.filter(area => area.surveyId === surveyId);
    const nextIndex = existing.length + 1;
    const autoTitle = `HA-${String(nextIndex).padStart(2, "0")}`;
    const area: HomogeneousArea = {
      id: nanoid(),
      surveyId,
      title: data.title && data.title.trim() ? data.title : autoTitle,
      description: data.description ?? null,
      createdAt: new Date(),
    };
    this.homogeneousAreas.push(area);
    return area;
  }

  async deleteHomogeneousArea(surveyId: string, id: string): Promise<boolean> {
    const index = this.homogeneousAreas.findIndex(area => area.surveyId === surveyId && area.id === id);
    if (index === -1) return false;
    this.homogeneousAreas.splice(index, 1);
    return true;
  }

  async getFunctionalAreas(surveyId: string): Promise<FunctionalArea[]> {
    return this.functionalAreas.filter(area => area.surveyId === surveyId);
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
    const area: FunctionalArea = {
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
      createdAt: new Date(),
    };
    this.functionalAreas.push(area);
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
    const index = this.functionalAreas.findIndex(area => area.surveyId === surveyId && area.id === id);
    if (index === -1) return undefined;
    const updated: FunctionalArea = {
      ...this.functionalAreas[index],
      ...data,
    };
    this.functionalAreas[index] = updated;
    return updated;
  }

  async deleteFunctionalArea(surveyId: string, id: string): Promise<boolean> {
    const index = this.functionalAreas.findIndex(area => area.surveyId === surveyId && area.id === id);
    if (index === -1) return false;
    this.functionalAreas.splice(index, 1);
    return true;
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
  private clients: any[] = [];

  async getClients(): Promise<any[]> {
    return this.clients.map(client => ({
      ...client,
      surveyCount: Math.floor(Math.random() * 10) + 1,
      activeProjects: Math.floor(Math.random() * 3)
    }));
  }

  async createClient(clientData: any): Promise<any> {
    const client = { id: nanoid(), ...clientData, createdAt: new Date() };
    this.clients.push(client);
    return client;
  }

  async updateClient(id: string, updates: any): Promise<any> {
    const index = this.clients.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Client not found');
    this.clients[index] = { ...this.clients[index], ...updates, updatedAt: new Date() };
    return this.clients[index];
  }

  async getClientSurveys(clientId: string): Promise<any[]> {
    const allSurveys = await this.getSurveys();
    return allSurveys.filter(survey => survey.clientName).map(survey => ({
      ...survey,
      clientAccess: true
    }));
  }

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
      id: nanoid(),
      userId: 'current-user',
      title: 'Survey Report Due',
      content: 'The report for Midland Industrial Complex survey is due in 3 days.',
      type: 'due_date',
      priority: 'high',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: nanoid(),
      userId: 'current-user', 
      title: 'New Message',
      content: 'You have received a new message from John Doe regarding the asbestos survey.',
      type: 'message',
      priority: 'normal',
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: nanoid(),
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
      id: nanoid(),
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
      id: nanoid(),
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
      id: nanoid(),
      type: 'survey_update',
      label: 'Survey Updates',
      description: 'Get notified when survey status changes',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: false
    },
    {
      id: nanoid(),
      type: 'message',
      label: 'New Messages',
      description: 'Get notified about new messages',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: true
    },
    {
      id: nanoid(),
      type: 'compliance_alert',
      label: 'Compliance Alerts',
      description: 'Get notified about compliance deadlines',
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: true
    },
    {
      id: nanoid(),
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
      id: nanoid(),
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
      id: nanoid(),
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
      id: nanoid(),
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
      id: nanoid(),
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
      id: nanoid(),
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
      id: nanoid(),
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
