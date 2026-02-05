import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSurveySchema, insertObservationSchema, insertAirMonitoringJobSchema, insertDailyWeatherLogSchema, insertPersonnelProfileSchema, insertFieldToolsEquipmentSchema, insertUserProfileSchema } from "@shared/schema";
import type { Survey, Observation, ObservationPhoto, AirMonitoringJob, AirSample, DailyWeatherLog } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import { getUserDisplayName } from "./auth";

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
function generateSurveyReport(
  survey: Survey,
  observations: Observation[],
  photosByObservation: Array<{ observation: Observation; photos: Array<ObservationPhoto & { dataUrl?: string }> }>,
  homogeneousAreas: Array<{ title: string; description?: string | null }>,
  functionalAreas: Array<{ title: string; description?: string | null }>,
  baseUrl?: string,
  sitePhotoDataUrl?: string | null
): string {
  const materialTypeLabels: Record<string, string> = {
    "ceiling-tiles": "Ceiling Tiles",
    "floor-tiles-9x9": '9"x9" Floor Tiles',
    "floor-tiles-12x12": '12"x12" Floor Tiles',
    "pipe-insulation": "Pipe Insulation",
    "duct-insulation": "Duct Insulation",
    "boiler-insulation": "Boiler Insulation",
    "drywall": "Drywall/Joint Compound",
    "paint": "Paint/Coatings",
    "roofing": "Roofing Material",
    "siding": "Siding Material",
    "window-glazing": "Window Glazing",
    "plaster": "Plaster",
    "masonry": "Masonry/Mortar",
    "vinyl-tiles": "Vinyl Floor Tiles",
    "carpet-mastic": "Carpet Mastic",
    "electrical-materials": "Electrical Materials",
    "other": "Other",
  };
  const formatMaterialType = (value: string) =>
    materialTypeLabels[value] ||
    value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const formatNumber = (value: number) => {
    if (Number.isInteger(value)) return value.toString();
    return parseFloat(value.toFixed(6)).toString();
  };
  const formatStatus = (value: string | null | undefined) => {
    const raw = value || "";
    return raw
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };
  const formatSurveyType = (value: string | null | undefined) => {
    const raw = value || "";
    if (!raw) return "";
    return raw
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(", ");
  };
  const formatDateLong = (value: string | Date) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const toSentenceCaseIfOneWord = (value: string | null | undefined) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!/^[A-Za-z]+$/.test(trimmed)) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };
  const parseQuantity = (rawQuantity: string | null) => {
    if (!rawQuantity) return null;
    const raw = rawQuantity.trim();
    const match = raw.match(/^(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const amount = parseFloat(match[1]);
    if (Number.isNaN(amount)) return null;
    const rawUnit = raw.slice(match[0].length).trim();
    let unit = rawUnit;
    if (/^(sq\s*ft|sqft|sf)$/i.test(rawUnit)) unit = "SqFt";
    if (/^(lf|linear\s*ft|linear\s*feet)$/i.test(rawUnit)) unit = "LF";
    return { amount, unit };
  };
  const addByUnit = (totals: Record<string, number>, unit: string, amount: number) => {
    const key = unit || "";
    totals[key] = (totals[key] || 0) + amount;
  };
  const formatByUnit = (totals: Record<string, number>) => {
    const entries = Object.entries(totals);
    if (!entries.length) return "0";
    return entries
      .map(([unit, amount]) => `${formatNumber(amount)}${unit ? ` ${unit}` : ""}`)
      .join(" + ");
  };

  const highRiskObservations = observations.filter(obs => obs.riskLevel === "high");
  const mediumRiskObservations = observations.filter(obs => obs.riskLevel === "medium");
  const samplesCollected = observations.filter(obs => obs.sampleCollected);
  
  // Calculate quantities by hazardous areas (HA)
  const hazardousAreas = observations.filter(obs => obs.riskLevel === "high" || obs.riskLevel === "medium");
  const totalHAByUnit = hazardousAreas.reduce((totals, obs) => {
    const parsed = parseQuantity(obs.quantity);
    if (parsed && parsed.amount > 0) {
      addByUnit(totals, parsed.unit, parsed.amount);
    }
    return totals;
  }, {} as Record<string, number>);
  
  // Calculate quantities by sample
  const totalSampleByUnit = samplesCollected.reduce((totals, obs) => {
    const parsed = parseQuantity(obs.quantity);
    if (parsed && parsed.amount > 0) {
      addByUnit(totals, parsed.unit, parsed.amount);
    }
    return totals;
  }, {} as Record<string, number>);
  
  // Group quantities by material type for detailed breakdown
  const quantityByMaterial = observations.reduce((acc, obs) => {
    const material = obs.materialType;
    const parsed = parseQuantity(obs.quantity);
    if (parsed && parsed.amount > 0) {
      if (!acc[material]) {
        acc[material] = { total: {}, hazardous: {}, sampled: {} };
      }
      addByUnit(acc[material].total, parsed.unit, parsed.amount);
      if (obs.riskLevel === "high" || obs.riskLevel === "medium") {
        addByUnit(acc[material].hazardous, parsed.unit, parsed.amount);
      }
      if (obs.sampleCollected) {
        addByUnit(acc[material].sampled, parsed.unit, parsed.amount);
      }
    }
    return acc;
  }, {} as Record<string, { total: Record<string, number>, hazardous: Record<string, number>, sampled: Record<string, number> }>);
  
  const sitePhotoSrc = sitePhotoDataUrl || (survey.sitePhotoUrl
    ? (survey.sitePhotoUrl.startsWith("http://") || survey.sitePhotoUrl.startsWith("https://")
      ? survey.sitePhotoUrl
      : baseUrl
        ? `${baseUrl}${survey.sitePhotoUrl.startsWith("/") ? survey.sitePhotoUrl : `/${survey.sitePhotoUrl}`}`
        : survey.sitePhotoUrl)
    : null);

  const photoRows = photosByObservation
    .filter(entry => entry.photos.length > 0)
    .map(entry => {
      const photoCells = entry.photos.map(photo => {
        const photoSrc = photo.dataUrl || (baseUrl
          ? `${baseUrl}/uploads/${photo.filename}`
          : `/uploads/${photo.filename}`);
        return `<img src="${photoSrc}" alt="${photo.originalName}" class="photo-thumb" />`;
      }).join("");
      return `
        <tr>
          <td>${toSentenceCaseIfOneWord(entry.observation.area)}</td>
          <td>${formatMaterialType(entry.observation.materialType)}</td>
          <td>${toSentenceCaseIfOneWord(entry.observation.condition)}</td>
          <td class="photo-cell">${photoCells || "-"}</td>
        </tr>
      `;
    })
    .join("");

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
        .page-break { page-break-before: always; }
        .photo-table img { width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; margin: 4px; }
        .photo-cell { display: flex; flex-wrap: wrap; gap: 6px; }
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
        <p><strong>Survey Type:</strong> ${formatSurveyType(survey.surveyType)}</p>
        <p><strong>Inspector:</strong> ${survey.inspector}</p>
        <p><strong>Survey Date:</strong> ${formatDateLong(survey.surveyDate)}</p>
        <p><strong>Status:</strong> ${formatStatus(survey.status)}</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    ${sitePhotoSrc ? `
    <div class="site-photo">
        <img src="${sitePhotoSrc}" alt="Site Photo - ${survey.siteName}" />
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

    <div class="section">
        <h3>Homogeneous Areas</h3>
        ${homogeneousAreas.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Homogeneous Area</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                ${homogeneousAreas.map(area => `
                <tr>
                    <td>${area.title}</td>
                    <td>${area.description || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p><em>No homogeneous areas defined for this survey.</em></p>'}
    </div>

    <div class="quantity-section">
        <h3>📊 Quantity Analysis</h3>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${formatByUnit(totalHAByUnit)}</div>
                <div>Total Quantity in Hazardous Areas (HA)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formatByUnit(totalSampleByUnit)}</div>
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
                </tr>
            </thead>
            <tbody>
                ${Object.entries(quantityByMaterial).map(([material, quantities]) => `
                <tr>
                    <td><strong>${formatMaterialType(material)}</strong></td>
                    <td>${formatByUnit(quantities.total)}</td>
                    <td>${formatByUnit(quantities.hazardous)}</td>
                    <td>${formatByUnit(quantities.sampled)}</td>
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
          <h4>${toSentenceCaseIfOneWord(obs.area)}</h4>
            <p><strong>Material Type:</strong> ${formatMaterialType(obs.materialType)}</p>
            <p><strong>Condition:</strong> ${toSentenceCaseIfOneWord(obs.condition)}</p>
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
                    <td>${toSentenceCaseIfOneWord(obs.area)}</td>
                    <td>${formatMaterialType(obs.materialType)}</td>
                    <td>${toSentenceCaseIfOneWord(obs.condition)}</td>
                    <td>${toSentenceCaseIfOneWord(obs.riskLevel || 'Not assessed')}</td>
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
                    <td>${toSentenceCaseIfOneWord(obs.area)}</td>
                    <td>${formatMaterialType(obs.materialType)}</td>
                    <td>${toSentenceCaseIfOneWord(obs.collectionMethod || 'Not specified')}</td>
                    <td>${obs.sampleNotes || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="section page-break">
        <h3>Observation Photos</h3>
        ${photoRows ? `
        <table class="photo-table">
            <thead>
                <tr>
                    <th>Functional Area</th>
                    <th>Material Type</th>
                    <th>Condition</th>
                    <th>Photos</th>
                </tr>
            </thead>
            <tbody>
                ${photoRows}
            </tbody>
        </table>
        ` : '<p><em>No observation photos uploaded.</em></p>'}
    </div>

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

async function toImageDataUrl(filename: string, originalName?: string | null) {
  try {
    const safeName = path.basename(filename);
    const filePath = path.join('uploads', safeName);
    const buffer = await fs.readFile(filePath);
    const ext = (originalName ? path.extname(originalName) : path.extname(safeName)).toLowerCase();
    const mime =
      ext === ".png" ? "image/png" :
      ext === ".gif" ? "image/gif" :
      ext === ".webp" ? "image/webp" :
      "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

const parsePreferences = (raw?: string | null) => {
  if (!raw) {
    return {
      emailNotifications: true,
      smsNotifications: false,
      weeklyReports: true,
      darkMode: false,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      emailNotifications: parsed.emailNotifications ?? true,
      smsNotifications: parsed.smsNotifications ?? false,
      weeklyReports: parsed.weeklyReports ?? true,
      darkMode: parsed.darkMode ?? false,
    };
  } catch {
    return {
      emailNotifications: true,
      smsNotifications: false,
      weeklyReports: true,
      darkMode: false,
    };
  }
};

const getAuthUserId = (req: any) => req.user?.sub || req.user?.email || "local-user";

function generateAirMonitoringReport(
  job: AirMonitoringJob,
  samples: AirSample[],
  weatherLogs: DailyWeatherLog[]
): string {
  const formatDate = (value?: string | Date | null) =>
    value ? new Date(value).toLocaleDateString("en-US") : "";
  const formatDateTime = (value?: string | Date | null) =>
    value ? new Date(value).toLocaleString("en-US") : "";
  const formatNumber = (value?: number | null) => {
    if (value === null || value === undefined) return "";
    if (Number.isInteger(value)) return value.toString();
    return parseFloat(value.toFixed(6)).toString();
  };

  const sampleRows = samples.map(sample => `
      <tr>
        <td>${sample.sampleType || ""}</td>
        <td>${sample.analyte || ""}</td>
        <td>${sample.location || ""}</td>
        <td>${sample.collectedBy || ""}</td>
        <td>${sample.monitorWornBy || ""}</td>
        <td>${formatDateTime(sample.startTime)}</td>
        <td>${formatDateTime(sample.endTime)}</td>
        <td>${formatNumber(sample.samplingDuration)}${sample.samplingDuration ? " min" : ""}</td>
        <td>${formatNumber(sample.flowRate)}${sample.flowRate ? " L/min" : ""}</td>
        <td>${sample.result ?? ""} ${sample.resultUnit || ""}</td>
        <td>${sample.fieldNotes || ""}</td>
      </tr>
  `).join("");

  const weatherRows = weatherLogs.map(log => `
      <tr>
        <td>${formatDate(log.date)}</td>
        <td>${log.time || ""}</td>
        <td>${log.weatherConditions || ""}</td>
        <td>${log.temperature ?? ""}</td>
        <td>${log.humidity ?? ""}</td>
        <td>${log.barometricPressure ?? ""}</td>
        <td>${log.windSpeed ?? ""} ${log.windDirection || ""}</td>
        <td>${log.notes || ""}</td>
      </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Air Monitoring Report - ${job.jobName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .section { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: bold; }
    .stat { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .stat-card { background: #f8f9fa; padding: 12px; border-radius: 8px; text-align: center; }
    .stat-number { font-size: 1.5em; font-weight: bold; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Air Monitoring Report</h1>
    <h2>${job.jobName} (Job #${job.jobNumber})</h2>
    <p><strong>Site:</strong> ${job.siteName}</p>
    <p><strong>Address:</strong> ${job.address}${job.city ? `, ${job.city}` : ""}${job.state ? `, ${job.state}` : ""} ${job.zipCode || ""}</p>
    <p><strong>Status:</strong> ${job.status}</p>
    <p><strong>Start Date:</strong> ${formatDate(job.startDate)}</p>
    <p><strong>End Date:</strong> ${formatDate(job.endDate)}</p>
    <p><strong>Report Generated:</strong> ${new Date().toLocaleString("en-US")}</p>
  </div>

  <div class="section">
    <h3>Job Summary</h3>
    <div class="stat">
      <div class="stat-card">
        <div class="stat-number">${samples.length}</div>
        <div>Samples Collected</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${weatherLogs.length}</div>
        <div>Weather Logs</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Air Samples</h3>
    ${samples.length ? `
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Analyte</th>
            <th>Location</th>
            <th>Collected By</th>
            <th>Monitor Worn By</th>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
            <th>Flow Rate</th>
            <th>Result</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${sampleRows}
        </tbody>
      </table>
    ` : '<p><em>No air samples recorded.</em></p>'}
  </div>

  <div class="section">
    <h3>Weather Logs</h3>
    ${weatherLogs.length ? `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Conditions</th>
            <th>Temp</th>
            <th>Humidity</th>
            <th>Pressure</th>
            <th>Wind</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${weatherRows}
        </tbody>
      </table>
    ` : '<p><em>No weather logs recorded.</em></p>'}
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
      const inspectorName = getUserDisplayName(req.user);
      const validatedData = insertSurveySchema.parse({
        ...req.body,
        inspector: inspectorName || req.body?.inspector,
      });
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
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        for (const surveyId of surveyIds) {
          const survey = await storage.getSurvey(surveyId);
          const observations = await storage.getObservations(surveyId);
          const homogeneousAreas = await storage.getHomogeneousAreas(surveyId);
          const functionalAreas = await storage.getFunctionalAreas(surveyId);

          if (survey && observations) {
            const photosByObservation = await Promise.all(
              observations.map(async (observation) => {
                const photos = await storage.getObservationPhotos(observation.id);
                const photosWithData = await Promise.all(
                  photos.map(async (photo) => ({
                    ...photo,
                    dataUrl: await toImageDataUrl(photo.filename, photo.originalName),
                  }))
                );
                return { observation, photos: photosWithData };
              })
            );
            const sitePhotoDataUrl = survey.sitePhotoUrl
              ? await toImageDataUrl(path.basename(survey.sitePhotoUrl))
              : null;
            const reportHtml = generateSurveyReport(
              survey,
              observations,
              photosByObservation,
              homogeneousAreas,
              functionalAreas,
              baseUrl,
              sitePhotoDataUrl
            );
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
      const homogeneousAreas = await storage.getHomogeneousAreas(req.params.id);
      const functionalAreas = await storage.getFunctionalAreas(req.params.id);
      const photosByObservation = await Promise.all(
        observations.map(async (observation) => {
          const photos = await storage.getObservationPhotos(observation.id);
          const photosWithData = await Promise.all(
            photos.map(async (photo) => ({
              ...photo,
              dataUrl: await toImageDataUrl(photo.filename, photo.originalName),
            }))
          );
          return { observation, photos: photosWithData };
        })
      );
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const sitePhotoDataUrl = survey.sitePhotoUrl
        ? await toImageDataUrl(path.basename(survey.sitePhotoUrl))
        : null;
      const reportHtml = generateSurveyReport(
        survey,
        observations,
        photosByObservation,
        homogeneousAreas,
        functionalAreas,
        baseUrl,
        sitePhotoDataUrl
      );
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${survey.siteName}_report.html"`);
      res.send(reportHtml);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Homogeneous and functional area routes
  app.get("/api/surveys/:surveyId/homogeneous-areas", async (req, res) => {
    try {
      const areas = await storage.getHomogeneousAreas(req.params.surveyId);
      res.json(areas);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch homogeneous areas", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/surveys/:surveyId/homogeneous-areas", async (req, res) => {
    try {
      const { title, description } = req.body || {};
      const area = await storage.createHomogeneousArea(req.params.surveyId, { title, description });
      res.status(201).json(area);
    } catch (error) {
      res.status(400).json({ message: "Failed to create homogeneous area", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/surveys/:surveyId/homogeneous-areas/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHomogeneousArea(req.params.surveyId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Homogeneous area not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete homogeneous area", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/surveys/:surveyId/functional-areas", async (req, res) => {
    try {
      const areas = await storage.getFunctionalAreas(req.params.surveyId);
      res.json(areas);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch functional areas", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/surveys/:surveyId/functional-areas", async (req, res) => {
    try {
      const {
        title,
        description,
        length,
        width,
        height,
        wallCount,
        doorCount,
        windowCount,
      } = req.body || {};

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      const numLength = length !== undefined && length !== null ? Number(length) : null;
      const numWidth = width !== undefined && width !== null ? Number(width) : null;
      const numHeight = height !== undefined && height !== null ? Number(height) : null;
      const numWalls = wallCount !== undefined && wallCount !== null ? Number(wallCount) : null;

      const sqft = numLength && numWidth ? numLength * numWidth : null;
      const wallSqft = numWidth && numHeight && numWalls ? numWidth * numHeight * numWalls : null;

      const area = await storage.createFunctionalArea(req.params.surveyId, {
        title,
        description,
        length: Number.isFinite(numLength) ? numLength : null,
        width: Number.isFinite(numWidth) ? numWidth : null,
        height: Number.isFinite(numHeight) ? numHeight : null,
        wallCount: Number.isFinite(numWalls) ? numWalls : null,
        doorCount: doorCount !== undefined && doorCount !== null ? Number(doorCount) : null,
        windowCount: windowCount !== undefined && windowCount !== null ? Number(windowCount) : null,
        sqft: Number.isFinite(sqft as number) ? (sqft as number) : null,
        wallSqft: Number.isFinite(wallSqft as number) ? (wallSqft as number) : null,
      });
      res.status(201).json(area);
    } catch (error) {
      res.status(400).json({ message: "Failed to create functional area", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/surveys/:surveyId/functional-areas/:id", async (req, res) => {
    try {
      const {
        title,
        description,
        length,
        width,
        height,
        wallCount,
        doorCount,
        windowCount,
        photoUrl,
      } = req.body || {};

      const numLength = length !== undefined && length !== null ? Number(length) : null;
      const numWidth = width !== undefined && width !== null ? Number(width) : null;
      const numHeight = height !== undefined && height !== null ? Number(height) : null;
      const numWalls = wallCount !== undefined && wallCount !== null ? Number(wallCount) : null;

      const sqft = numLength && numWidth ? numLength * numWidth : null;
      const wallSqft = numWidth && numHeight && numWalls ? numWidth * numHeight * numWalls : null;

      const updated = await storage.updateFunctionalArea(req.params.surveyId, req.params.id, {
        title,
        description,
        length: Number.isFinite(numLength) ? numLength : null,
        width: Number.isFinite(numWidth) ? numWidth : null,
        height: Number.isFinite(numHeight) ? numHeight : null,
        wallCount: Number.isFinite(numWalls) ? numWalls : null,
        doorCount: doorCount !== undefined && doorCount !== null ? Number(doorCount) : null,
        windowCount: windowCount !== undefined && windowCount !== null ? Number(windowCount) : null,
        sqft: Number.isFinite(sqft as number) ? (sqft as number) : null,
        wallSqft: Number.isFinite(wallSqft as number) ? (wallSqft as number) : null,
        photoUrl,
      });

      if (!updated) {
        return res.status(404).json({ message: "Functional area not found" });
      }

      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update functional area", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/surveys/:surveyId/functional-areas/:id/photo", upload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      const photoUrl = `/uploads/${req.file.filename}`;
      const areas = await storage.getFunctionalAreas(req.params.surveyId);
      const area = areas.find(item => item.id === req.params.id);
      if (!area) {
        return res.status(404).json({ message: "Functional area not found" });
      }
      area.photoUrl = photoUrl;
      res.json({ photoUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload functional area photo", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/surveys/:surveyId/functional-areas/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFunctionalArea(req.params.surveyId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Functional area not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete functional area", error: error instanceof Error ? error.message : "Unknown error" });
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

  // Field tools equipment routes
  app.get("/api/field-tools/equipment", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const equipment = await storage.getFieldToolsEquipment(userId);
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch equipment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/field-tools/equipment", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const items = Array.isArray(req.body) ? req.body : req.body?.items;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid equipment payload" });
      }
      const validated = items.map((item) => insertFieldToolsEquipmentSchema.parse(item));
      const saved = await storage.replaceFieldToolsEquipment(userId, validated);
      res.json(saved);
    } catch (error) {
      res.status(400).json({ message: "Invalid equipment data", error: error instanceof Error ? error.message : "Unknown error" });
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
      const normalized = {
        ...req.body,
        employeeId: req.body.employeeId || undefined,
        jobTitle: req.body.jobTitle || undefined,
        department: req.body.department || undefined,
        company: req.body.company || undefined,
        email: req.body.email || undefined,
        phone: req.body.phone || undefined,
        notes: req.body.notes || undefined,
        lastMedicalDate: req.body.lastMedicalDate || undefined,
        stateAccreditationNumber: req.body.stateAccreditationNumber || undefined,
        certifications: Array.isArray(req.body.certifications)
          ? req.body.certifications.filter(Boolean)
          : typeof req.body.certifications === "string"
            ? req.body.certifications.split(",").map((item: string) => item.trim()).filter(Boolean)
            : [],
      };
      const validated = insertPersonnelProfileSchema.parse(normalized);
      const personnel = await storage.createPersonnelProfile(validated);
      res.status(201).json(personnel);
    } catch (error) {
      res.status(400).json({ message: "Invalid personnel data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Air monitoring jobs routes
  app.get("/api/air-monitoring-jobs", async (req, res) => {
    try {
      const jobs = await storage.getAirMonitoringJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch air monitoring jobs", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/air-monitoring-jobs", async (req, res) => {
    try {
      const validatedData = insertAirMonitoringJobSchema.parse(req.body);
      const job = await storage.createAirMonitoringJob(validatedData);
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ message: "Invalid air monitoring job data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put("/api/air-monitoring-jobs/:id", async (req, res) => {
    try {
      const validatedData = insertAirMonitoringJobSchema.partial().parse(req.body);
      const job = await storage.updateAirMonitoringJob(req.params.id, validatedData);
      if (!job) {
        return res.status(404).json({ message: "Air monitoring job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(400).json({ message: "Invalid air monitoring job data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/air-monitoring-jobs/:id/samples", async (req, res) => {
    try {
      const samples = await storage.getAirMonitoringJobSamples(req.params.id);
      res.json(samples);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job samples", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Daily weather log routes
  app.get("/api/air-monitoring/jobs/:jobId/weather-logs", async (req, res) => {
    try {
      const logs = await storage.getDailyWeatherLogs(req.params.jobId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weather logs", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/air-monitoring/jobs/:jobId/weather-logs", async (req, res) => {
    try {
      const validated = insertDailyWeatherLogSchema.parse({
        ...req.body,
        jobId: req.params.jobId,
      });
      const log = await storage.createDailyWeatherLog(validated);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid weather log data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/air-monitoring/weather-logs/:id", async (req, res) => {
    try {
      const validated = insertDailyWeatherLogSchema.partial().parse(req.body);
      const updated = await storage.updateDailyWeatherLog(req.params.id, validated);
      if (!updated) {
        return res.status(404).json({ message: "Weather log not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Invalid weather log data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/air-monitoring/weather-logs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDailyWeatherLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Weather log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete weather log", error: error instanceof Error ? error.message : "Unknown error" });
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

  app.put("/api/air-samples/:id", async (req, res) => {
    try {
      const sample = await storage.updateAirSample(req.params.id, req.body);
      res.json(sample);
    } catch (error) {
      res.status(400).json({ message: "Invalid air sample data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/air-samples/:id", async (req, res) => {
    try {
      await storage.deleteAirSample(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete air sample", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/air-samples/:id/lab-report", upload.single("labReport"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const updated = await storage.updateAirSample(req.params.id, {
        labReportFilename: req.file.filename,
        labReportUploadedAt: new Date(),
      });
      if (!updated) {
        return res.status(404).json({ message: "Air sample not found" });
      }
      res.json({ labReportFilename: updated.labReportFilename });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload lab report", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Advanced Air Monitoring API Routes
  app.get("/api/air-monitoring/equipment", async (req, res) => {
    try {
      const equipment = await storage.getAirMonitoringEquipment();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  app.post("/api/air-monitoring/equipment", async (req, res) => {
    try {
      const equipment = await storage.createAirMonitoringEquipment(req.body);
      res.status(201).json(equipment);
    } catch (error) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ error: "Failed to create equipment" });
    }
  });

  app.put("/api/air-monitoring/equipment/:id", async (req, res) => {
    try {
      const equipment = await storage.updateAirMonitoringEquipment(req.params.id, req.body);
      res.json(equipment);
    } catch (error) {
      console.error("Error updating equipment:", error);
      res.status(500).json({ error: "Failed to update equipment" });
    }
  });

  app.get("/api/air-monitoring/quality-control", async (req, res) => {
    try {
      const checks = await storage.getQualityControlChecks();
      res.json(checks);
    } catch (error) {
      console.error("Error fetching quality control checks:", error);
      res.status(500).json({ error: "Failed to fetch quality control checks" });
    }
  });

  app.post("/api/air-monitoring/quality-control", async (req, res) => {
    try {
      const check = await storage.createQualityControlCheck(req.body);
      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating quality control check:", error);
      res.status(500).json({ error: "Failed to create quality control check" });
    }
  });

  app.get("/api/air-monitoring/pel-alerts", async (req, res) => {
    try {
      const alerts = await storage.getPELAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching PEL alerts:", error);
      res.status(500).json({ error: "Failed to fetch PEL alerts" });
    }
  });

  app.put("/api/air-monitoring/pel-alerts/:id/acknowledge", async (req, res) => {
    try {
      const { id } = req.params;
      const { correctiveActions } = req.body;
      const alert = await storage.acknowledgePELAlert(id, 'Current User', correctiveActions);
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging PEL alert:", error);
      res.status(500).json({ error: "Failed to acknowledge PEL alert" });
    }
  });

  app.get("/api/air-samples/pel-analysis", async (req, res) => {
    try {
      const samples = await storage.getAirSamplesWithPELAnalysis();
      res.json(samples);
    } catch (error) {
      console.error("Error fetching air samples with PEL analysis:", error);
      res.status(500).json({ error: "Failed to fetch air samples with PEL analysis" });
    }
  });

  app.get("/api/air-monitoring-jobs/:id/report", async (req, res) => {
    try {
      const jobId = req.params.id;
      const job = await storage.getAirMonitoringJobById(jobId);
      const samples = await storage.getAirMonitoringJobSamples(jobId);
      const weatherLogs = await storage.getDailyWeatherLogs(jobId);

      const reportHtml = generateAirMonitoringReport(job, samples, weatherLogs);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${job.jobNumber}_Air_Monitoring_Report.html"`);
      res.send(reportHtml);
      
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });


  // Mock system stats for admin dashboard
  const mockSystemStats = {
    totalUsers: 25,
    activeUsers: 18,
    totalSurveys: 150,
    totalAirSamples: 89,
    databaseSize: "2.4 GB",
    systemUptime: "15 days, 8 hours",
    lastBackup: "2025-01-13T02:00:00Z"
  };

  // Mock users data for admin dashboard
  const mockUsers = [
    {
      id: "user-1",
      firstName: "John",
      lastName: "Inspector",
      email: "john.inspector@company.com",
      role: "admin",
      status: "active",
      organization: "Environmental Solutions Inc.",
      jobTitle: "Senior Environmental Consultant",
      lastLogin: "2025-01-13T14:30:00Z",
      createdAt: "2024-01-15T10:00:00Z"
    },
    {
      id: "user-2", 
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@company.com",
      role: "manager",
      status: "active",
      organization: "Environmental Solutions Inc.",
      jobTitle: "Project Manager",
      lastLogin: "2025-01-13T09:15:00Z",
      createdAt: "2024-02-20T14:00:00Z"
    },
    {
      id: "user-3",
      firstName: "Mike",
      lastName: "Chen",
      email: "mike.chen@company.com", 
      role: "user",
      status: "active",
      organization: "Environmental Solutions Inc.",
      jobTitle: "Field Technician",
      lastLogin: "2025-01-12T16:45:00Z",
      createdAt: "2024-03-10T11:30:00Z"
    }
  ];

  // User Profile Routes (DB-backed)
  app.get("/api/user/profile", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const profile = await storage.getUserProfile(userId);
    if (profile) {
      return res.json({
        ...profile,
        id: userId,
        preferences: parsePreferences(profile.preferences),
      });
    }

    const firstName = typeof req.user?.given_name === "string" ? req.user.given_name : "";
    const lastName = typeof req.user?.family_name === "string" ? req.user.family_name : "";
    const email = typeof req.user?.email === "string" ? req.user.email : undefined;

    const created = await storage.upsertUserProfile({
      userId,
      firstName,
      lastName,
      email,
      role: "user",
      status: "active",
      preferences: JSON.stringify(parsePreferences(null)),
    });

    res.json({
      ...created,
      id: userId,
      preferences: parsePreferences(created.preferences),
    });
  });

  app.put("/api/user/profile", async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const existing = await storage.getUserProfile(userId);
    const mergedPreferences = {
      ...parsePreferences(existing?.preferences),
      ...(req.body?.preferences || {}),
    };

    const payload = insertUserProfileSchema.partial().parse({
      userId,
      ...req.body,
      preferences: JSON.stringify(mergedPreferences),
    });

    const updated = await storage.upsertUserProfile(payload);
    res.json({
      ...updated,
      id: userId,
      preferences: parsePreferences(updated.preferences),
    });
  });

  app.post("/api/user/avatar", upload.single("avatar"), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const existing = await storage.getUserProfile(userId);
    const updated = await storage.upsertUserProfile({
      userId,
      avatar: avatarUrl,
      preferences: existing?.preferences || JSON.stringify(parsePreferences(null)),
      email: existing?.email,
      firstName: existing?.firstName,
      lastName: existing?.lastName,
      phone: existing?.phone,
      organization: existing?.organization,
      jobTitle: existing?.jobTitle,
      department: existing?.department,
      address: existing?.address,
      role: existing?.role,
      status: existing?.status,
    });
    res.json({ avatar: updated.avatar });
  });

  app.post("/api/user/change-password", (req, res) => {
    res.json({ success: true, message: "Password updated successfully" });
  });

  app.delete("/api/user/account", (req, res) => {
    res.json({ success: true, message: "Account deleted successfully" });
  });

  // Authentication Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    if (email === "admin@sitesense.com" && password === "admin123") {
      res.json({
        token: "mock-jwt-token",
        user: {
          id: "user-1",
          email: email,
          role: "admin",
          firstName: "John",
          lastName: "Inspector"
        }
      });
    } else if (email && password) {
      res.json({
        token: "mock-jwt-token",
        user: {
          id: "user-2", 
          email: email,
          role: "user",
          firstName: "Demo",
          lastName: "User"
        }
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { firstName, lastName, email, password, organization, jobTitle, role } = req.body;
    
    const newUser = {
      id: `user-${Date.now()}`,
      firstName,
      lastName, 
      email,
      organization,
      jobTitle,
      role: role || "user",
      status: "active",
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      message: "Account created successfully",
      user: newUser
    });
  });

  app.get("/api/me", (req, res) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({
      id: user.sub,
      email: user.email,
      name: getUserDisplayName(user),
      user,
    });
  });

  // Admin Routes
  app.get("/api/admin/stats", (req, res) => {
    res.json(mockSystemStats);
  });

  app.get("/api/admin/users", (req, res) => {
    res.json(mockUsers);
  });

  app.post("/api/admin/users", (req, res) => {
    const { firstName, lastName, email, password, organization, jobTitle, role, status } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }
    
    const newUser = {
      id: `user-${Date.now()}`,
      firstName,
      lastName,
      email,
      organization,
      jobTitle,
      role: role || "user",
      status: status || "active",
      lastLogin: null,
      createdAt: new Date().toISOString()
    };
    
    // In real app, save to database with hashed password
    mockUsers.push(newUser);
    
    res.status(201).json(newUser);
  });

  app.put("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, organization, jobTitle, role, status } = req.body;
    
    const userIndex = mockUsers.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update user data
    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      firstName,
      lastName,
      email,
      organization,
      jobTitle,
      role,
      status
    };
    
    res.json(mockUsers[userIndex]);
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    const userIndex = mockUsers.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }
    
    mockUsers.splice(userIndex, 1);
    res.json({ success: true, message: "User deleted successfully" });
  });

  // White-label brand settings
  let brandSettings = {
    appName: "SiteSense",
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    accentColor: "#10b981",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    footerText: "© 2025 SiteSense. Professional site survey management.",
    welcomeMessage: "Welcome to your environmental survey management platform",
    contactEmail: "support@sitesense.com",
    enableCustomBranding: true,
    showPoweredBy: true,
  };

  app.get("/api/admin/brand-settings", (req, res) => {
    res.json(brandSettings);
  });

  app.put("/api/admin/brand-settings", (req, res) => {
    brandSettings = { ...brandSettings, ...req.body };
    res.json(brandSettings);
  });

  // Data management endpoints
  app.get("/api/admin/data-management", (req, res) => {
    res.json({
      totalSurveys: surveys.length,
      totalUsers: mockUsers.length,
      totalAirSamples: airSamples.length,
      totalObservations: observations.length,
      databaseSize: "45.2 MB",
      lastBackup: "2025-01-12T10:30:00Z",
      autoBackupEnabled: true,
      retentionPeriod: 365
    });
  });

  app.post("/api/admin/backup", (req, res) => {
    // Simulate backup process
    setTimeout(() => {
      res.json({ 
        success: true, 
        backupId: `backup-${Date.now()}`,
        message: "Backup created successfully" 
      });
    }, 2000);
  });

  app.post("/api/admin/export-all", (req, res) => {
    // Simulate export process
    res.json({ 
      success: true, 
      exportId: `export-${Date.now()}`,
      message: "Export initiated. Download link will be sent via email." 
    });
  });

  app.post("/api/admin/purge-data", (req, res) => {
    const { olderThan } = req.body;
    // Simulate data purging based on age
    res.json({ 
      success: true, 
      deletedRecords: Math.floor(Math.random() * 100),
      message: `Data older than ${olderThan} days has been purged.` 
    });
  });

  // Object storage endpoints for logo uploads
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/admin/users/:id", (req, res) => {
    const userId = req.params.id;
    const updatedUser = { ...req.body, id: userId };
    res.json(updatedUser);
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    const userId = req.params.id;
    res.json({ success: true, message: `User ${userId} deleted successfully` });
  });

  app.post("/api/admin/export", (req, res) => {
    res.json({ success: true, message: "Export initiated successfully" });
  });

  // Custom Report Builder Routes
  app.get("/api/report-templates", async (req, res) => {
    try {
      const templates = await storage.getReportTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report templates" });
    }
  });

  app.post("/api/report-templates", async (req, res) => {
    try {
      const template = await storage.createReportTemplate(req.body);
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Failed to create report template" });
    }
  });

  app.post("/api/report-templates/:id/generate", async (req, res) => {
    try {
      const { id } = req.params;
      const { surveyIds } = req.body;
      const reportUrl = await storage.generateReport(id, surveyIds);
      res.json({ downloadUrl: reportUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Client Portal Routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const client = await storage.createClient(req.body);
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.updateClient(id, req.body);
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.get("/api/clients/:id/surveys", async (req, res) => {
    try {
      const { id } = req.params;
      const surveys = await storage.getClientSurveys(id);
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client surveys" });
    }
  });

  // Internal Messaging Routes
  app.get("/api/messages", async (req, res) => {
    try {
      const { filter } = req.query;
      const messages = await storage.getMessages(filter as string);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const message = await storage.createMessage(req.body);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/messages/:id/reply", async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const reply = await storage.replyToMessage(id, content);
      res.json(reply);
    } catch (error) {
      res.status(400).json({ message: "Failed to send reply" });
    }
  });

  app.put("/api/messages/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const message = await storage.markMessageAsRead(id);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to mark message as read" });
    }
  });

  // Notification System Routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const { filter } = req.query;
      const notifications = await storage.getNotifications(filter as string);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const notification = await storage.createNotification(req.body);
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: "Failed to create notification" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/mark-all-read", async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete notification" });
    }
  });

  // Chain of Custody Routes
  app.get("/api/chain-of-custody", async (req, res) => {
    try {
      const { sampleId } = req.query;
      const records = await storage.getChainOfCustodyRecords(sampleId as string);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chain of custody records" });
    }
  });

  app.post("/api/chain-of-custody", async (req, res) => {
    try {
      const record = await storage.createChainOfCustodyRecord(req.body);
      res.json(record);
    } catch (error) {
      res.status(400).json({ message: "Failed to create chain of custody record" });
    }
  });

  // Compliance Tracking Routes
  app.get("/api/compliance-rules", async (req, res) => {
    try {
      const rules = await storage.getComplianceRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch compliance rules" });
    }
  });

  app.post("/api/compliance-rules", async (req, res) => {
    try {
      const rule = await storage.createComplianceRule(req.body);
      res.json(rule);
    } catch (error) {
      res.status(400).json({ message: "Failed to create compliance rule" });
    }
  });

  app.get("/api/compliance-tracking", async (req, res) => {
    try {
      const { surveyId } = req.query;
      const tracking = await storage.getComplianceTracking(surveyId as string);
      res.json(tracking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch compliance tracking" });
    }
  });

  app.put("/api/compliance-tracking/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const tracking = await storage.updateComplianceTracking(id, req.body);
      res.json(tracking);
    } catch (error) {
      res.status(400).json({ message: "Failed to update compliance tracking" });
    }
  });

  // Collaboration Routes
  app.get("/api/collaboration/sessions/:surveyId", async (req, res) => {
    try {
      const { surveyId } = req.params;
      const sessions = await storage.getCollaborationSessions(surveyId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaboration sessions" });
    }
  });

  app.post("/api/collaboration/sessions", async (req, res) => {
    try {
      const session = await storage.createCollaborationSession(req.body);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Failed to create collaboration session" });
    }
  });

  // Settings Routes
  app.get("/api/settings/notifications", async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.put("/api/settings/notifications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const setting = await storage.updateNotificationSetting(id, req.body);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Failed to update notification setting" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
