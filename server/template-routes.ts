import { Request, Response } from "express";
import { getDb } from "./db";
import { surveyTemplates, checklistTemplates, checklistItems, observationTemplates, surveyInstances, checklistResponses } from "@shared/template-schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const db = () => getDb();

// Template schemas
const createSurveyTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  surveyType: z.string().min(1),
  category: z.string().default("general"),
  estimatedDuration: z.number().optional(),
  requiredCertifications: z.array(z.string()).default([]),
  safetyRequirements: z.array(z.string()).default([]),
  equipmentRequired: z.array(z.string()).default([]),
  createdBy: z.string(),
});

const createChecklistTemplateSchema = z.object({
  surveyTemplateId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["pre-survey", "during-survey", "post-survey", "safety", "equipment"]).default("pre-survey"),
  isRequired: z.boolean().default(false),
  order: z.number().default(0),
});

const createChecklistItemSchema = z.object({
  checklistTemplateId: z.string(),
  text: z.string().min(1),
  description: z.string().optional(),
  itemType: z.enum(["checkbox", "text_input", "number_input", "file_upload", "photo"]).default("checkbox"),
  isRequired: z.boolean().default(false),
  order: z.number().default(0),
  validationRules: z.string().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).default([]),
});

// Get all survey templates
export async function getSurveyTemplates(req: Request, res: Response) {
  try {
    const { category, search, surveyType } = req.query;

    let whereConditions = [eq(surveyTemplates.isActive, true)];

    if (category && category !== 'all') {
      whereConditions.push(eq(surveyTemplates.category, category as string));
    }

    if (surveyType) {
      whereConditions.push(eq(surveyTemplates.surveyType, surveyType as string));
    }

    if (search) {
      whereConditions.push(
        sql`${surveyTemplates.name} ILIKE ${`%${search}%`} OR ${surveyTemplates.description} ILIKE ${`%${search}%`}`
      );
    }

    const query = db().select().from(surveyTemplates).where(and(...whereConditions));

    const templates = await query.orderBy(desc(surveyTemplates.usageCount));

    res.json(templates);
  } catch (error) {
    console.error("Error fetching survey templates:", error);
    res.status(500).json({ error: "Failed to fetch survey templates" });
  }
}

// Get survey template by ID
export async function getSurveyTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const [template] = await db
      .select()
      .from(surveyTemplates)
      .where(eq(surveyTemplates.id, id));

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Get associated checklists and items
    const checklists = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.surveyTemplateId, id))
      .orderBy(checklistTemplates.order);

    const checklistsWithItems = await Promise.all(
      checklists.map(async (checklist) => {
        const items = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.checklistTemplateId, checklist.id))
          .orderBy(checklistItems.order);

        return {
          ...checklist,
          items,
        };
      })
    );

    res.json({
      ...template,
      checklists: checklistsWithItems,
    });
  } catch (error) {
    console.error("Error fetching survey template:", error);
    res.status(500).json({ error: "Failed to fetch survey template" });
  }
}

// Create survey template
export async function createSurveyTemplate(req: Request, res: Response) {
  try {
    const data = createSurveyTemplateSchema.parse(req.body);
    
    const [template] = await db
      .insert(surveyTemplates)
      .values(data)
      .returning();

    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating survey template:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create survey template" });
  }
}

// Update survey template
export async function updateSurveyTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = createSurveyTemplateSchema.partial().parse(req.body);
    
    const [template] = await db
      .update(surveyTemplates)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(surveyTemplates.id, id))
      .returning();

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(template);
  } catch (error) {
    console.error("Error updating survey template:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update survey template" });
  }
}

// Delete survey template
export async function deleteSurveyTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const [template] = await db
      .delete(surveyTemplates)
      .where(eq(surveyTemplates.id, id))
      .returning();

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting survey template:", error);
    res.status(500).json({ error: "Failed to delete survey template" });
  }
}

// Get checklists for a survey template
export async function getTemplateChecklists(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    
    const checklists = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.surveyTemplateId, templateId))
      .orderBy(checklistTemplates.order);

    const checklistsWithItems = await Promise.all(
      checklists.map(async (checklist) => {
        const items = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.checklistTemplateId, checklist.id))
          .orderBy(checklistItems.order);

        return {
          ...checklist,
          items,
        };
      })
    );

    res.json(checklistsWithItems);
  } catch (error) {
    console.error("Error fetching template checklists:", error);
    res.status(500).json({ error: "Failed to fetch template checklists" });
  }
}

// Get survey checklists (for a specific survey)
export async function getSurveyChecklists(req: Request, res: Response) {
  try {
    const { surveyId, templateId } = req.params;
    
    // Get template checklists
    let checklists;
    if (templateId) {
      checklists = await db
        .select()
        .from(checklistTemplates)
        .where(eq(checklistTemplates.surveyTemplateId, templateId))
        .orderBy(checklistTemplates.order);
    } else {
      // Get from survey instance if no templateId provided
      const [instance] = await db
        .select()
        .from(surveyInstances)
        .where(eq(surveyInstances.surveyId, surveyId));
        
      if (instance?.templateId) {
        checklists = await db
          .select()
          .from(checklistTemplates)
          .where(eq(checklistTemplates.surveyTemplateId, instance.templateId))
          .orderBy(checklistTemplates.order);
      } else {
        return res.json([]);
      }
    }

    const checklistsWithItems = await Promise.all(
      checklists.map(async (checklist) => {
        const items = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.checklistTemplateId, checklist.id))
          .orderBy(checklistItems.order);

        return {
          ...checklist,
          items,
        };
      })
    );

    res.json(checklistsWithItems);
  } catch (error) {
    console.error("Error fetching survey checklists:", error);
    res.status(500).json({ error: "Failed to fetch survey checklists" });
  }
}

// Get checklist responses for a survey
export async function getChecklistResponses(req: Request, res: Response) {
  try {
    const { surveyId } = req.params;
    
    const responses = await db
      .select()
      .from(checklistResponses)
      .where(eq(checklistResponses.surveyId, surveyId));

    res.json(responses);
  } catch (error) {
    console.error("Error fetching checklist responses:", error);
    res.status(500).json({ error: "Failed to fetch checklist responses" });
  }
}

// Save checklist response
export async function saveChecklistResponse(req: Request, res: Response) {
  try {
    const { surveyId } = req.params;
    const { itemId, response, isCompleted, notes } = req.body;
    
    // Check if response already exists
    const [existingResponse] = await db
      .select()
      .from(checklistResponses)
      .where(
        and(
          eq(checklistResponses.surveyId, surveyId),
          eq(checklistResponses.itemId, itemId)
        )
      );

    let result;
    if (existingResponse) {
      // Update existing response
      [result] = await db
        .update(checklistResponses)
        .set({
          response,
          isCompleted,
          notes,
          completedAt: isCompleted ? sql`now()` : null,
        })
        .where(eq(checklistResponses.id, existingResponse.id))
        .returning();
    } else {
      // Create new response
      [result] = await db
        .insert(checklistResponses)
        .values({
          surveyId,
          checklistTemplateId: "placeholder", // This should come from the request
          itemId,
          response,
          isCompleted,
          notes,
          completedBy: "current-user", // Would come from auth
          completedAt: isCompleted ? sql`now()` : null,
        })
        .returning();
    }

    res.json(result);
  } catch (error) {
    console.error("Error saving checklist response:", error);
    res.status(500).json({ error: "Failed to save checklist response" });
  }
}

// Increment template usage count
export async function incrementTemplateUsage(templateId: string) {
  try {
    await db
      .update(surveyTemplates)
      .set({ 
        usageCount: sql`${surveyTemplates.usageCount} + 1`,
        lastUsed: sql`now()`,
      })
      .where(eq(surveyTemplates.id, templateId));
  } catch (error) {
    console.error("Error incrementing template usage:", error);
  }
}
