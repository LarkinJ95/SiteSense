import { useState, useEffect } from 'react';

export interface OfflineData {
  surveys: any[];
  observations: any[];
  photos: any[];
  lastSync: Date | null;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData>(() => {
    const stored = localStorage.getItem('offline-survey-data');
    return stored ? JSON.parse(stored) : {
      surveys: [],
      observations: [],
      photos: [],
      lastSync: null
    };
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const storeOfflineData = (data: Partial<OfflineData>) => {
    const newData = { ...offlineData, ...data };
    setOfflineData(newData);
    localStorage.setItem('offline-survey-data', JSON.stringify(newData));
  };

  const addOfflineSurvey = (survey: any) => {
    storeOfflineData({
      surveys: [...offlineData.surveys, { ...survey, _offline: true, _timestamp: Date.now() }]
    });
  };

  const addOfflineObservation = (observation: any) => {
    storeOfflineData({
      observations: [...offlineData.observations, { ...observation, _offline: true, _timestamp: Date.now() }]
    });
  };

  const addOfflinePhoto = (photo: any) => {
    storeOfflineData({
      photos: [...offlineData.photos, { ...photo, _offline: true, _timestamp: Date.now() }]
    });
  };

  const syncOfflineData = async () => {
    if (!isOnline) return;

    try {
      // Sync surveys first
      for (const survey of offlineData.surveys) {
        if (survey._offline) {
          const { _offline, _timestamp, ...surveyData } = survey;
          const response = await fetch('/api/surveys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(surveyData)
          });
          if (response.ok) {
            // Remove from offline storage
            storeOfflineData({
              surveys: offlineData.surveys.filter(s => s._timestamp !== _timestamp)
            });
          }
        }
      }

      // Sync observations
      for (const observation of offlineData.observations) {
        if (observation._offline) {
          const { _offline, _timestamp, ...observationData } = observation;
          const response = await fetch('/api/observations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(observationData)
          });
          if (response.ok) {
            storeOfflineData({
              observations: offlineData.observations.filter(o => o._timestamp !== _timestamp)
            });
          }
        }
      }

      storeOfflineData({ lastSync: new Date() });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const clearOfflineData = () => {
    const emptyData = {
      surveys: [],
      observations: [],
      photos: [],
      lastSync: null
    };
    setOfflineData(emptyData);
    localStorage.removeItem('offline-survey-data');
  };

  return {
    isOnline,
    offlineData,
    addOfflineSurvey,
    addOfflineObservation,
    addOfflinePhoto,
    syncOfflineData,
    clearOfflineData,
    pendingCount: offlineData.surveys.length + offlineData.observations.length + offlineData.photos.length
  };
}