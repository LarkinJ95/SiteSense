import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSurveySchema, insertObservationSchema } from "@shared/schema";
import type { Survey, Observation } from "@shared/schema";
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

// Report generation function
function generateSurveyReport(survey: Survey, observations: Observation[]): string {
  const highRiskObservations = observations.filter(obs => obs.riskLevel === "high");
  const mediumRiskObservations = observations.filter(obs => obs.riskLevel === "medium");
  const samplesCollected = observations.filter(obs => obs.sampleCollected);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Survey Report - ${survey.siteName}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .observation { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .risk-high { border-left: 4px solid #dc3545; background: #fff5f5; }
        .risk-medium { border-left: 4px solid #ffc107; background: #fffbf0; }
        .risk-low { border-left: 4px solid #28a745; background: #f8fff8; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f8f9fa; font-weight: bold; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 0.9em; color: #666; }
        @media print { body { margin: 0; padding: 15px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Site Survey Report</h1>
        <h2>${survey.siteName}</h2>
        <p><strong>Address:</strong> ${survey.address || 'Not specified'}</p>
        <p><strong>Survey Type:</strong> ${survey.surveyType}</p>
        <p><strong>Inspector:</strong> ${survey.inspector}</p>
        <p><strong>Survey Date:</strong> ${new Date(survey.surveyDate).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${survey.status}</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    <div class="section">
        <h3>Executive Summary</h3>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${observations.length}</div>
                <div>Total Observations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${highRiskObservations.length}</div>
                <div>High Risk Areas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${mediumRiskObservations.length}</div>
                <div>Medium Risk Areas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${samplesCollected.length}</div>
                <div>Samples Collected</div>
            </div>
        </div>
    </div>

    ${highRiskObservations.length > 0 ? `
    <div class="section">
        <h3>High Risk Observations</h3>
        ${highRiskObservations.map(obs => `
        <div class="observation risk-high">
            <h4>${obs.area}</h4>
            <p><strong>Material Type:</strong> ${obs.materialType}</p>
            <p><strong>Condition:</strong> ${obs.condition}</p>
            ${obs.quantity ? `<p><strong>Quantity:</strong> ${obs.quantity}</p>` : ''}
            ${obs.sampleCollected ? `<p><strong>Sample ID:</strong> ${obs.sampleId || 'Not specified'}</p>` : ''}
            ${obs.notes ? `<p><strong>Notes:</strong> ${obs.notes}</p>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h3>All Observations</h3>
        <table>
            <thead>
                <tr>
                    <th>Area</th>
                    <th>Material Type</th>
                    <th>Condition</th>
                    <th>Risk Level</th>
                    <th>Sample Collected</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${observations.map(obs => `
                <tr>
                    <td>${obs.area}</td>
                    <td>${obs.materialType}</td>
                    <td>${obs.condition}</td>
                    <td>${obs.riskLevel || 'Not assessed'}</td>
                    <td>${obs.sampleCollected ? 'Yes' : 'No'}</td>
                    <td>${obs.notes || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${samplesCollected.length > 0 ? `
    <div class="section">
        <h3>Sample Collection Summary</h3>
        <table>
            <thead>
                <tr>
                    <th>Sample ID</th>
                    <th>Area</th>
                    <th>Material Type</th>
                    <th>Collection Method</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${samplesCollected.map(obs => `
                <tr>
                    <td>${obs.sampleId || 'Not specified'}</td>
                    <td>${obs.area}</td>
                    <td>${obs.materialType}</td>
                    <td>${obs.collectionMethod || 'Not specified'}</td>
                    <td>${obs.sampleNotes || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${survey.notes ? `
    <div class="section">
        <h3>Survey Notes</h3>
        <p>${survey.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was automatically generated by SiteSurvey Pro.</p>
        <p>Report contains ${observations.length} observation(s) conducted during the survey.</p>
        ${highRiskObservations.length > 0 ? `<p><strong>IMPORTANT:</strong> This survey identified ${highRiskObservations.length} high-risk area(s) requiring immediate attention.</p>` : ''}
    </div>
</body>
</html>`;
}

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

  // Report generation route
  app.get("/api/surveys/:id/report", async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const observations = await storage.getObservations(req.params.id);
      const reportHtml = generateSurveyReport(survey, observations);
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${survey.siteName}_report.html"`);
      res.send(reportHtml);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report", error: error instanceof Error ? error.message : 'Unknown error' });
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
