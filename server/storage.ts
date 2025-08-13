import { 
  surveys, 
  observations, 
  observationPhotos,
  type Survey, 
  type InsertSurvey,
  type Observation,
  type InsertObservation,
  type ObservationPhoto,
  type InsertObservationPhoto
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and } from "drizzle-orm";

export interface IStorage {
  // Survey methods
  getSurveys(): Promise<Survey[]>;
  getSurvey(id: string): Promise<Survey | undefined>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  updateSurvey(id: string, survey: Partial<InsertSurvey>): Promise<Survey | undefined>;
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
}

export const storage = new DatabaseStorage();
