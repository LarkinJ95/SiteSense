import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSurveySchema, insertObservationSchema } from "@shared/schema";
import type { Survey, Observation } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";

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
  
  // Calculate quantities by hazardous areas (HA)
  const hazardousAreas = observations.filter(obs => obs.riskLevel === "high" || obs.riskLevel === "medium");
  const totalHAQuantity = hazardousAreas.reduce((total, obs) => {
    const quantity = parseFloat(obs.quantity || "0");
    return total + (isNaN(quantity) ? 0 : quantity);
  }, 0);
  
  // Calculate quantities by sample
  const totalSampleQuantity = samplesCollected.reduce((total, obs) => {
    const quantity = parseFloat(obs.quantity || "0");
    return total + (isNaN(quantity) ? 0 : quantity);
  }, 0);
  
  // Group quantities by material type for detailed breakdown
  const quantityByMaterial = observations.reduce((acc, obs) => {
    const material = obs.materialType;
    const quantity = parseFloat(obs.quantity || "0");
    if (!isNaN(quantity) && quantity > 0) {
      if (!acc[material]) {
        acc[material] = { total: 0, hazardous: 0, sampled: 0 };
      }
      acc[material].total += quantity;
      if (obs.riskLevel === "high" || obs.riskLevel === "medium") {
        acc[material].hazardous += quantity;
      }
      if (obs.sampleCollected) {
        acc[material].sampled += quantity;
      }
    }
    return acc;
  }, {} as Record<string, { total: number, hazardous: number, sampled: number }>);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Survey Report - ${survey.siteName}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .site-photo { text-align: center; margin: 20px 0; }
        .site-photo img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .site-photo-caption { margin-top: 10px; font-style: italic; color: #666; }
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
        .quantity-section { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #ffc107; }
        .quantity-table { background: #fff; margin-top: 15px; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 0.9em; color: #666; }
        .print-button { 
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: #007bff; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 1000;
        }
        .print-button:hover { background: #0056b3; }
        @media print { 
            body { 
                margin: 0; 
                padding: 15px; 
                font-size: 12pt;
                line-height: 1.4;
            }
            .print-button { display: none !important; }
            .header { 
                page-break-inside: avoid;
                margin-bottom: 20px;
            }
            .section { 
                page-break-inside: avoid;
                margin-bottom: 15px;
            }
            .observation { 
                page-break-inside: avoid;
                margin-bottom: 10px;
            }
            .stats {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 10px !important;
            }
            .stat-card {
                background: #f8f9fa !important;
                border: 1px solid #ddd !important;
                padding: 10px !important;
            }
            .site-photo img {
                max-width: 50% !important;
                height: auto !important;
                float: right;
                margin: 0 0 10px 10px;
            }
            table {
                page-break-inside: auto;
                margin: 10px 0;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            thead {
                display: table-header-group;
            }
            .quantity-section {
                background: #f9f9f9 !important;
                border: 1px solid #ddd !important;
                page-break-inside: avoid;
            }
            .footer {
                page-break-before: auto;
                margin-top: 30px;
            }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()" title="Print Report">
        🖨️ Print Report
    </button>
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

    ${survey.sitePhotoUrl ? `
    <div class="site-photo">
        <img src="${survey.sitePhotoUrl}" alt="Site Photo - ${survey.siteName}" />
        <div class="site-photo-caption">Site Overview Photo</div>
    </div>
    ` : ''}

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

    <div class="quantity-section">
        <h3>📊 Quantity Analysis</h3>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${totalHAQuantity.toFixed(2)}</div>
                <div>Total Quantity in Hazardous Areas (HA)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalSampleQuantity.toFixed(2)}</div>
                <div>Total Quantity by Sample</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${hazardousAreas.length}</div>
                <div>Hazardous Areas Count</div>
            </div>
        </div>
        
        ${Object.keys(quantityByMaterial).length > 0 ? `
        <h4>Material Quantity Breakdown</h4>
        <table class="quantity-table">
            <thead>
                <tr>
                    <th>Material Type</th>
                    <th>Total Quantity</th>
                    <th>Hazardous Quantity</th>
                    <th>Sampled Quantity</th>
                    <th>% Hazardous</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(quantityByMaterial).map(([material, quantities]) => `
                <tr>
                    <td><strong>${material}</strong></td>
                    <td>${quantities.total.toFixed(2)} units</td>
                    <td>${quantities.hazardous.toFixed(2)} units</td>
                    <td>${quantities.sampled.toFixed(2)} units</td>
                    <td>${quantities.total > 0 ? ((quantities.hazardous / quantities.total) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p><em>No quantity data available for detailed breakdown.</em></p>'}
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
        <p><strong>Report Summary:</strong> This report was automatically generated by SiteSense on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.</p>
        <p><strong>Survey Coverage:</strong> Report contains ${observations.length} observation(s) conducted during the survey.</p>
        ${highRiskObservations.length > 0 ? `<p style="color: #dc3545;"><strong>⚠️ IMPORTANT:</strong> This survey identified ${highRiskObservations.length} high-risk area(s) requiring immediate attention and remediation.</p>` : ''}
        <p><strong>Inspector Certification:</strong> This report was prepared by ${survey.inspector} and reflects the conditions observed at the time of inspection.</p>
    </div>
    
    <script>
        // Add keyboard shortcut for printing (Ctrl+P or Cmd+P)
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
        });
        
        // Add print styles optimization
        window.addEventListener('beforeprint', function() {
            document.body.style.fontSize = '12pt';
        });
        
        window.addEventListener('afterprint', function() {
            document.body.style.fontSize = '';
        });
    </script>
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

  // Bulk operations for surveys
  app.post("/api/surveys/bulk", async (req, res) => {
    try {
      const { action, surveyIds } = req.body;
      
      if (!action || !Array.isArray(surveyIds) || surveyIds.length === 0) {
        return res.status(400).json({ error: "Invalid action or survey IDs" });
      }

      let result = {};
      
      if (action === "delete") {
        // Delete multiple surveys
        for (const surveyId of surveyIds) {
          await storage.deleteSurvey(surveyId);
        }
        result = { message: `${surveyIds.length} surveys deleted successfully` };
        
      } else if (action === "download") {
        // Generate reports for multiple surveys
        const reports = [];
        for (const surveyId of surveyIds) {
          const survey = await storage.getSurvey(surveyId);
          const observations = await storage.getObservations(surveyId);
          
          if (survey && observations) {
            const reportHtml = generateSurveyReport(survey, observations);
            reports.push({
              surveyId,
              siteName: survey.siteName,
              html: reportHtml
            });
          }
        }
        result = { reports, message: `${reports.length} reports generated successfully` };
        
      } else {
        return res.status(400).json({ error: "Unsupported bulk action" });
      }

      res.json(result);
      
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      res.status(500).json({ error: "Failed to perform bulk operation" });
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

  // Site photo upload
  app.post('/api/surveys/:surveyId/site-photo', upload.single('sitePhoto'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { surveyId } = req.params;
      console.log(`[${new Date().toLocaleTimeString()}] [express] Uploading site photo for survey ${surveyId}`);
      
      // Update survey with site photo URL
      const sitePhotoUrl = `/uploads/${req.file.filename}`;
      await storage.updateSurveySitePhoto(surveyId, sitePhotoUrl);
      
      res.json({ 
        success: true, 
        sitePhotoUrl,
        message: 'Site photo uploaded successfully' 
      });
    } catch (error) {
      next(error);
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

  // Template routes
  app.get("/api/survey-templates", async (req, res) => {
    try {
      // Mock template data for now since we have template routes issues
      const templates = [
        {
          id: "asbestos-standard",
          name: "Standard Asbestos Survey",
          description: "Comprehensive asbestos inspection with pre-configured checklist items for residential and commercial properties.",
          surveyType: "Asbestos",
          category: "asbestos",
          version: "2.1",
          estimatedDuration: 4,
          requiredCertifications: ["Asbestos Inspector License", "AHERA Certification"],
          safetyRequirements: ["N95 Respirator", "Tyvek Suit", "Safety Glasses", "Nitrile Gloves"],
          equipmentRequired: ["Sample Containers", "Labels", "Digital Camera", "Measuring Tape"],
          usageCount: 24,
          lastUsed: "2024-01-10T10:30:00Z",
          tags: ["residential", "commercial", "inspection"],
          isPublic: true,
          isActive: true,
          createdBy: "system",
          createdAt: "2023-12-01T00:00:00Z"
        },
        {
          id: "lead-paint-basic",
          name: "Basic Lead Paint Assessment",
          description: "Essential lead paint testing checklist for pre-1978 buildings with EPA compliance requirements.",
          surveyType: "Lead Paint",
          category: "lead",
          version: "1.5",
          estimatedDuration: 3,
          requiredCertifications: ["EPA RRP Certification", "Lead Inspector License"],
          safetyRequirements: ["Disposable Coveralls", "N100 Respirator", "Eye Protection"],
          equipmentRequired: ["XRF Analyzer", "Sample Bags", "Paint Scrapers", "Drop Cloths"],
          usageCount: 18,
          lastUsed: "2024-01-08T14:15:00Z",
          tags: ["lead", "pre-1978", "EPA"],
          isPublic: true,
          isActive: true,
          createdBy: "system",
          createdAt: "2023-11-15T00:00:00Z"
        },
        {
          id: "combo-asbestos-lead",
          name: "Combined Asbestos & Lead Survey",
          description: "Comprehensive hazmat survey covering both asbestos and lead paint with coordinated sampling procedures.",
          surveyType: "Asbestos + Lead",
          category: "environmental",
          version: "1.8",
          estimatedDuration: 6,
          requiredCertifications: ["Asbestos Inspector License", "Lead Inspector License", "AHERA Certification"],
          safetyRequirements: ["Full Face Respirator", "Tyvek Suit", "Nitrile Gloves", "Boot Covers"],
          equipmentRequired: ["Sample Containers", "XRF Analyzer", "Digital Camera", "Chain of Custody Forms"],
          usageCount: 12,
          lastUsed: "2024-01-05T09:45:00Z",
          tags: ["combination", "hazmat", "comprehensive"],
          isPublic: true,
          isActive: true,
          createdBy: "system",
          createdAt: "2023-10-20T00:00:00Z"
        },
        {
          id: "environmental-general",
          name: "General Environmental Assessment",
          description: "Multi-purpose environmental survey template suitable for various types of site assessments.",
          surveyType: "Environmental",
          category: "environmental",
          version: "1.2",
          estimatedDuration: 5,
          requiredCertifications: ["Environmental Professional Certification"],
          safetyRequirements: ["Safety Vest", "Hard Hat", "Steel-Toe Boots"],
          equipmentRequired: ["pH Meter", "Thermometer", "Sample Containers", "GPS Device"],
          usageCount: 8,
          lastUsed: "2024-01-03T11:20:00Z",
          tags: ["environmental", "general", "assessment"],
          isPublic: true,
          isActive: true,
          createdBy: "system",
          createdAt: "2023-12-10T00:00:00Z"
        }
      ];
      
      const { category, search, surveyType } = req.query;
      
      let filtered = templates.filter(t => t.isActive);
      
      if (category && category !== 'all') {
        filtered = filtered.filter(t => t.category === category);
      }
      
      if (surveyType) {
        filtered = filtered.filter(t => t.surveyType === surveyType);
      }
      
      if (search) {
        const query = search.toString().toLowerCase();
        filtered = filtered.filter(t => 
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching survey templates:", error);
      res.status(500).json({ error: "Failed to fetch survey templates" });
    }
  });

  app.post("/api/survey-templates", async (req, res) => {
    try {
      // Mock create template response
      const newTemplate = {
        id: `template-${Date.now()}`,
        ...req.body,
        usageCount: 0,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating survey template:", error);
      res.status(500).json({ error: "Failed to create survey template" });
    }
  });

  app.patch("/api/survey-templates/:id", async (req, res) => {
    try {
      // Mock update template response
      const updatedTemplate = {
        id: req.params.id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating survey template:", error);
      res.status(500).json({ error: "Failed to update survey template" });
    }
  });

  app.delete("/api/survey-templates/:id", async (req, res) => {
    try {
      // Mock delete template response
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting survey template:", error);
      res.status(500).json({ error: "Failed to delete survey template" });
    }
  });

  app.get("/api/survey-checklists/:surveyId/:templateId?", async (req, res) => {
    try {
      // Mock checklist data
      const checklists = [
        {
          id: "pre-survey-checklist",
          name: "Pre-Survey Preparation",
          category: "pre-survey",
          isRequired: true,
          order: 1,
          items: [
            {
              id: "item-1",
              text: "Verify site access permissions and keys",
              itemType: "checkbox",
              isRequired: true,
              order: 1
            },
            {
              id: "item-2", 
              text: "Review building plans and previous reports",
              itemType: "checkbox",
              isRequired: true,
              order: 2
            },
            {
              id: "item-3",
              text: "Calibrate equipment and check batteries",
              itemType: "checkbox",
              isRequired: true,
              order: 3
            }
          ]
        },
        {
          id: "safety-checklist",
          name: "Safety Requirements",
          category: "safety",
          isRequired: true,
          order: 2,
          items: [
            {
              id: "safety-1",
              text: "Personal protective equipment donned",
              itemType: "checkbox",
              isRequired: true,
              order: 1
            },
            {
              id: "safety-2",
              text: "Emergency contact information confirmed",
              itemType: "text_input",
              isRequired: true,
              order: 2
            }
          ]
        }
      ];
      
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching survey checklists:", error);
      res.status(500).json({ error: "Failed to fetch survey checklists" });
    }
  });

  app.get("/api/checklist-responses/:surveyId", async (req, res) => {
    try {
      // Mock responses - empty for now
      res.json([]);
    } catch (error) {
      console.error("Error fetching checklist responses:", error);
      res.status(500).json({ error: "Failed to fetch checklist responses" });
    }
  });

  app.post("/api/checklist-responses/:surveyId", async (req, res) => {
    try {
      // Mock save response
      const { itemId, response, isCompleted, notes } = req.body;
      res.json({
        id: `response-${Date.now()}`,
        itemId,
        response,
        isCompleted,
        notes,
        completedAt: isCompleted ? new Date().toISOString() : null
      });
    } catch (error) {
      console.error("Error saving checklist response:", error);
      res.status(500).json({ error: "Failed to save checklist response" });
    }
  });

  // Static file serving for uploads
  app.use('/uploads', async (req, res, next) => {
    const filename = req.path.substring(1); // Remove leading /
    try {
      const filePath = path.join('uploads', filename);
      await fs.access(filePath);
      res.sendFile(path.resolve(filePath));
    } catch {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Personnel routes
  app.get("/api/personnel", async (req, res) => {
    try {
      const personnel = await storage.getPersonnel();
      res.json(personnel);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personnel", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/personnel", async (req, res) => {
    try {
      const personnel = await storage.createPersonnelProfile(req.body);
      res.status(201).json(personnel);
    } catch (error) {
      res.status(400).json({ message: "Invalid personnel data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Air samples routes
  app.get("/api/air-samples", async (req, res) => {
    try {
      const samples = await storage.getAirSamples();
      res.json(samples);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch air samples", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/air-samples", async (req, res) => {
    try {
      const sample = await storage.createAirSample(req.body);
      res.status(201).json(sample);
    } catch (error) {
      res.status(400).json({ message: "Invalid air sample data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
