import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSurveySchema, insertObservationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Survey routes
  app.get("/api/surveys", async (req, res) => {
    try {
      const { search } = req.query;
      let surveys;
      
      if (search && typeof search === 'string') {
        surveys = await storage.searchSurveys(search);
      } else {
        surveys = await storage.getSurveys();
      }
      
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch surveys", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/surveys/:id", async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch survey", error: error.message });
    }
  });

  app.post("/api/surveys", async (req, res) => {
    try {
      const validatedData = insertSurveySchema.parse(req.body);
      const survey = await storage.createSurvey(validatedData);
      res.status(201).json(survey);
    } catch (error) {
      res.status(400).json({ 
        message: "Invalid survey data", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/surveys/:id", async (req, res) => {
    try {
      const validatedData = insertSurveySchema.partial().parse(req.body);
      const survey = await storage.updateSurvey(req.params.id, validatedData);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      res.status(400).json({ message: "Invalid survey data", error: error.message });
    }
  });

  app.delete("/api/surveys/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSurvey(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete survey", error: error.message });
    }
  });

  // Observation routes
  app.get("/api/surveys/:surveyId/observations", async (req, res) => {
    try {
      const observations = await storage.getObservations(req.params.surveyId);
      res.json(observations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch observations", error: error.message });
    }
  });

  app.get("/api/observations/:id", async (req, res) => {
    try {
      const observation = await storage.getObservation(req.params.id);
      if (!observation) {
        return res.status(404).json({ message: "Observation not found" });
      }
      res.json(observation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch observation", error: error.message });
    }
  });

  app.post("/api/observations", async (req, res) => {
    try {
      const validatedData = insertObservationSchema.parse(req.body);
      const observation = await storage.createObservation(validatedData);
      res.status(201).json(observation);
    } catch (error) {
      res.status(400).json({ 
        message: "Invalid observation data", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/observations/:id", async (req, res) => {
    try {
      const validatedData = insertObservationSchema.partial().parse(req.body);
      const observation = await storage.updateObservation(req.params.id, validatedData);
      if (!observation) {
        return res.status(404).json({ message: "Observation not found" });
      }
      res.json(observation);
    } catch (error) {
      res.status(400).json({ message: "Invalid observation data", error: error.message });
    }
  });

  app.delete("/api/observations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteObservation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Observation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete observation", error: error.message });
    }
  });

  // Photo upload routes
  app.post("/api/observations/:observationId/photos", upload.array('photos', 10), async (req, res) => {
    try {
      const { observationId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedPhotos = [];
      
      for (const file of files) {
        const photo = await storage.createObservationPhoto({
          observationId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });
        uploadedPhotos.push(photo);
      }

      res.status(201).json(uploadedPhotos);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload photos", error: error.message });
    }
  });

  app.get("/api/observations/:observationId/photos", async (req, res) => {
    try {
      const photos = await storage.getObservationPhotos(req.params.observationId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photos", error: error.message });
    }
  });

  app.get("/api/photos/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join('uploads', filename);
      
      try {
        await fs.access(filePath);
        res.sendFile(path.resolve(filePath));
      } catch {
        res.status(404).json({ message: "Photo not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to serve photo", error: error.message });
    }
  });

  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteObservationPhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete photo", error: error.message });
    }
  });

  // Stats route
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getSurveyStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
