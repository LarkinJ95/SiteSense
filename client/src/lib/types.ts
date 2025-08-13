import type { Survey as BaseSurvey, Observation as BaseObservation, ObservationPhoto } from '@shared/schema';

export type Survey = BaseSurvey;
export type Observation = BaseObservation;
export { ObservationPhoto };

export interface SurveyWithObservations extends Survey {
  observations?: Observation[];
}

export interface ObservationWithPhotos extends Observation {
  photos?: ObservationPhoto[];
}

export interface SurveyStats {
  totalSurveys: number;
  pendingReviews: number;
  samplesCollected: number;
  activeSites: number;
}

export interface CreateSurveyFormData {
  siteName: string;
  address?: string;
  surveyType: string;
  surveyDate: string;
  inspector: string;
  notes?: string;
  enableGPS?: boolean;
  useTemplate?: boolean;
  requirePhotos?: boolean;
}

export interface CreateObservationFormData {
  area: string;
  homogeneousArea?: string;
  materialType: string;
  condition: string;
  quantity?: string;
  riskLevel?: string;
  sampleCollected?: boolean;
  sampleId?: string;
  collectionMethod?: string;
  sampleNotes?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
}
