import { 
  surveys, 
  observations, 
  observationPhotos,
  personnelProfiles,
  airMonitoringJobs,
  airSamples,
  airMonitoringEquipment,
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
  type DailyWeatherLog,
  type InsertDailyWeatherLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
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

  async getAirMonitoringJob(id: string): Promise<AirMonitoringJob | undefined> {
    const [job] = await db.select().from(airMonitoringJobs).where(eq(airMonitoringJobs.id, id));
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
    const [updatedSample] = await db
      .update(airSamples)
      .set({ ...sample, updatedAt: new Date() })
      .where(eq(airSamples.id, id))
      .returning();
    return updatedSample;
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
}

export const storage = new DatabaseStorage();
