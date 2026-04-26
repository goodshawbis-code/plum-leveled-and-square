import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, blueprintsTable } from "@workspace/db";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ObjectStorageService } from "../lib/objectStorage";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const storageService = new ObjectStorageService();

const AnalyzePageBody = z.object({
  pageImageBase64: z.string().min(1),
  mimeType: z.string().default("image/png"),
  pageNumber: z.number().int().min(1).default(1),
  scaleBarInfo: z.string().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const ANALYSIS_SYSTEM_PROMPT = `You are an expert construction estimator specializing in masonry work. You analyze architectural and structural blueprints to identify masonry materials, estimate quantities, and calculate costs.

When analyzing a blueprint page, you must:
1. IGNORE all border lines, title block frames, north arrows, revision clouds, and standard drawing border elements
2. IGNORE legend boxes, material key boxes, and annotation callout boxes that don't represent actual construction
3. FOCUS ONLY on the actual drawn building elements within the drawing field
4. Identify masonry materials by their standard symbols, hatching patterns, and labels:
   - Culture Stone / Manufactured Stone Veneer: irregular rubble-like pattern or labeled "CULTURE STONE", "MFD STONE", "STONE VENEER"
   - CMU Block (Concrete Masonry Unit): rectangular grid pattern labeled "CMU", "CONC. BLOCK", "8" CMU" etc.
   - Brick: small rectangular coursed pattern labeled "BRICK", "BRK", "FACE BRICK"
   - Concrete Footing: labeled "CONC FTG", "FTG", typically at foundation level
   - Reinforcing/Rebar: shown as dots in section or labeled "#4 @ 16" OC"
   - Grout Fill: shown as filled CMU cells, labeled "FULL GROUT" or "SOLID GROUT"
5. Estimate areas in square feet or linear feet based on visible dimensions, scale bars, or relative proportions
6. Determine if this page actually contains masonry construction work

Return your analysis as valid JSON only (no markdown, no code blocks) in this exact structure:
{
  "pageType": "masonry_plan" | "floor_plan" | "elevation" | "section" | "detail" | "foundation_plan" | "title_sheet" | "general_notes" | "other",
  "hasMasonryWork": true | false,
  "masonryConfidence": "high" | "medium" | "low",
  "drawingScale": "1/4\" = 1'-0\"" | "1/8\" = 1'-0\"" | "estimated" | "unknown",
  "borderDetected": true | false,
  "actualDrawingArea": "percentage of page that is actual drawing vs borders/title block (e.g. '85%')",
  "materials": [
    {
      "type": "culture_stone" | "cmu_standard" | "cmu_splitface" | "brick_standard" | "brick_splitface" | "concrete_footing" | "grout_fill" | "rebar" | "mortar" | "other",
      "label": "human-readable label like 'Culture Stone Veneer'",
      "description": "where on the drawing and how identified",
      "estimatedQuantity": 0,
      "unit": "SF" | "LF" | "CY" | "EA",
      "unitCostLow": 0,
      "unitCostHigh": 0,
      "totalCostLow": 0,
      "totalCostHigh": 0,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "summary": "one sentence summary of what masonry work this page covers",
  "estimatorNotes": ["array of important notes for the estimator"],
  "grandTotalLow": 0,
  "grandTotalHigh": 0
}`;

const PORTLAND_UNIT_COSTS: Record<string, { low: number; high: number; unit: string }> = {
  culture_stone: { low: 18, high: 22, unit: "SF" },
  cmu_standard: { low: 14, high: 20, unit: "SF" },
  cmu_splitface: { low: 18, high: 26, unit: "SF" },
  brick_standard: { low: 18.50, high: 26, unit: "SF" },
  brick_splitface: { low: 24, high: 36, unit: "SF" },
  concrete_footing: { low: 30, high: 46, unit: "LF" },
  grout_fill: { low: 3.50, high: 5.50, unit: "SF" },
  rebar: { low: 2.25, high: 3.75, unit: "SF" },
  mortar: { low: 1.75, high: 2.75, unit: "SF" },
  other: { low: 10, high: 25, unit: "SF" },
};

router.post("/blueprints/:id/analyze", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid blueprint id" });
    return;
  }

  const body = AnalyzePageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { pageImageBase64, mimeType, pageNumber, scaleBarInfo } = body.data;

  try {
    const [blueprint] = await db
      .select()
      .from(blueprintsTable)
      .where(eq(blueprintsTable.id, params.data.id));

    if (!blueprint) {
      res.status(404).json({ error: "Blueprint not found" });
      return;
    }

    const userMessage = `Analyze this blueprint page (page ${pageNumber} of the uploaded drawings${scaleBarInfo ? `, scale: ${scaleBarInfo}` : ""}).

Identify all masonry materials visible in the actual drawing area (not the border or title block). Use Portland/Beaverton/Hillsboro Oregon market rates for cost estimates.

IMPORTANT: Culture stone/manufactured stone veneer is $15/SF material cost, installed total $18-22/SF. Apply this rate whenever you detect culture stone.

Return only the JSON structure as specified.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${pageImageBase64}`,
                detail: "high",
              },
            },
            { type: "text", text: userMessage },
          ],
        },
      ],
    });

    const rawText = response.choices[0]?.message?.content ?? "{}";

    let analysisResult: Record<string, unknown>;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
    } catch {
      logger.warn({ rawText }, "Failed to parse AI analysis JSON, returning raw");
      analysisResult = { raw: rawText, parseError: true };
    }

    if (Array.isArray(analysisResult.materials)) {
      for (const mat of analysisResult.materials as any[]) {
        const rates = PORTLAND_UNIT_COSTS[mat.type] ?? PORTLAND_UNIT_COSTS.other;
        if (mat.estimatedQuantity > 0) {
          if (!mat.unitCostLow || mat.unitCostLow === 0) mat.unitCostLow = rates.low;
          if (!mat.unitCostHigh || mat.unitCostHigh === 0) mat.unitCostHigh = rates.high;
          mat.totalCostLow = mat.estimatedQuantity * mat.unitCostLow;
          mat.totalCostHigh = mat.estimatedQuantity * mat.unitCostHigh;
        }
      }

      const materials = analysisResult.materials as any[];
      analysisResult.grandTotalLow = materials.reduce((s: number, m: any) => s + (m.totalCostLow || 0), 0);
      analysisResult.grandTotalHigh = materials.reduce((s: number, m: any) => s + (m.totalCostHigh || 0), 0);
    }

    res.json({
      blueprintId: blueprint.id,
      blueprintName: blueprint.fileName,
      pageNumber,
      analysis: analysisResult,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze blueprint");
    res.status(500).json({ error: "Failed to analyze blueprint — AI service error" });
  }
});

export default router;
