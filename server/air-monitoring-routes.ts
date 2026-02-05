import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { insertPersonnelProfileSchema, insertAirSampleSchema, insertAirMonitoringEquipmentSchema } from '@shared/schema';
import { ZodError } from 'zod';

const router = Router();

// Personnel routes
router.get('/personnel', async (req: Request, res: Response) => {
  try {
    const personnel = await storage.getPersonnel();
    res.json(personnel);
  } catch (error) {
    console.error('Error getting personnel:', error);
    res.status(500).json({ error: 'Failed to get personnel' });
  }
});

router.get('/personnel/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const personnel = await storage.getPersonnelProfile(id);
    if (!personnel) {
      return res.status(404).json({ error: 'Personnel not found' });
    }
    res.json(personnel);
  } catch (error) {
    console.error('Error getting personnel profile:', error);
    res.status(500).json({ error: 'Failed to get personnel profile' });
  }
});

router.post('/personnel', async (req: Request, res: Response) => {
  try {
    const validatedData = insertPersonnelProfileSchema.parse(req.body);
    const personnel = await storage.createPersonnelProfile(validatedData);
    res.status(201).json(personnel);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating personnel:', error);
    res.status(500).json({ error: 'Failed to create personnel' });
  }
});

router.put('/personnel/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = insertPersonnelProfileSchema.partial().parse(req.body);
    const personnel = await storage.updatePersonnelProfile(id, validatedData);
    if (!personnel) {
      return res.status(404).json({ error: 'Personnel not found' });
    }
    res.json(personnel);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error updating personnel:', error);
    res.status(500).json({ error: 'Failed to update personnel' });
  }
});

router.delete('/personnel/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deletePersonnelProfile(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Personnel not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting personnel:', error);
    res.status(500).json({ error: 'Failed to delete personnel' });
  }
});

// Air samples routes
router.get('/air-samples', async (req: Request, res: Response) => {
  try {
    const samples = await storage.getAirSamples();
    res.json(samples);
  } catch (error) {
    console.error('Error getting air samples:', error);
    res.status(500).json({ error: 'Failed to get air samples' });
  }
});

router.get('/air-samples/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sample = await storage.getAirSample(id);
    if (!sample) {
      return res.status(404).json({ error: 'Air sample not found' });
    }
    res.json(sample);
  } catch (error) {
    console.error('Error getting air sample:', error);
    res.status(500).json({ error: 'Failed to get air sample' });
  }
});

router.post('/air-samples', async (req: Request, res: Response) => {
  try {
    const validatedData = insertAirSampleSchema.parse(req.body);
    const sample = await storage.createAirSample(validatedData);
    res.status(201).json(sample);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating air sample:', error);
    res.status(500).json({ error: 'Failed to create air sample' });
  }
});

router.put('/air-samples/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = insertAirSampleSchema.partial().parse(req.body);
    console.log('Updating air sample with ID:', id, 'Data:', validatedData);
    const sample = await storage.updateAirSample(id, validatedData);
    if (!sample) {
      return res.status(404).json({ error: 'Air sample not found' });
    }
    res.json(sample);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error updating air sample:', error);
    res.status(500).json({ 
      error: 'Failed to update air sample', 
      details: error instanceof Error ? error.message : 'Unknown error',
      sampleId: req.params.id
    });
  }
});

router.delete('/air-samples/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await storage.deleteAirSample(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting air sample:', error);
    res.status(500).json({ error: 'Failed to delete air sample' });
  }
});

// Air monitoring equipment routes
router.get('/equipment', async (req: Request, res: Response) => {
  try {
    const equipment = await storage.getAirMonitoringEquipment();
    res.json(equipment);
  } catch (error) {
    console.error('Error getting equipment:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

router.get('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipment = await storage.getAirMonitoringEquipmentItem(id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    console.error('Error getting equipment:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

router.post('/equipment', async (req: Request, res: Response) => {
  try {
    const validatedData = insertAirMonitoringEquipmentSchema.parse(req.body);
    const equipment = await storage.createAirMonitoringEquipment(validatedData);
    res.status(201).json(equipment);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating equipment:', error);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

router.put('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = insertAirMonitoringEquipmentSchema.partial().parse(req.body);
    const equipment = await storage.updateAirMonitoringEquipment(id, validatedData);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error updating equipment:', error);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

router.delete('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteAirMonitoringEquipment(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

// Daily Weather Log routes
router.get('/jobs/:jobId/weather-logs', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const logs = await storage.getDailyWeatherLogs(jobId);
    res.json(logs);
  } catch (error) {
    console.error('Error getting weather logs:', error);
    res.status(500).json({ error: 'Failed to get weather logs' });
  }
});

router.post('/jobs/:jobId/weather-logs', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const logData = { ...req.body, jobId };
    const log = await storage.createDailyWeatherLog(logData);
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating weather log:', error);
    res.status(500).json({ error: 'Failed to create weather log' });
  }
});

router.put('/weather-logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const log = await storage.updateDailyWeatherLog(id, req.body);
    if (!log) {
      return res.status(404).json({ error: 'Weather log not found' });
    }
    res.json(log);
  } catch (error) {
    console.error('Error updating weather log:', error);
    res.status(500).json({ error: 'Failed to update weather log' });
  }
});

router.delete('/weather-logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteDailyWeatherLog(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Weather log not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting weather log:', error);
    res.status(500).json({ error: 'Failed to delete weather log' });
  }
});

export default router;