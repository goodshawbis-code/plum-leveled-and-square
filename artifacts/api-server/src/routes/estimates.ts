import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  blueprintsTable,
  segmentsTable,
  vendorBidsTable,
  vendorsTable,
  materialsTable,
  estimatesTable,
} from "@workspace/db";

const router: IRouter = Router();

/**
 * GET /projects/:id/estimate
 *
 * Compute a hard-bid estimate for a project by summing all selected
 * vendor bids across all segments of all blueprints in the project.
 * Returns an estimate record and per-segment line items.
 */
router.get("/projects/:id/estimate", async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);

  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const lineItems = await db
      .select({
        segmentId: segmentsTable.id,
        segmentLabel: segmentsTable.label,
        segmentType: segmentsTable.type,
        blueprintId: blueprintsTable.id,
        blueprintFileName: blueprintsTable.fileName,
        bidId: vendorBidsTable.id,
        vendorId: vendorsTable.id,
        vendorName: vendorsTable.name,
        materialId: materialsTable.id,
        materialName: materialsTable.name,
        materialUnit: materialsTable.unit,
        unitPrice: vendorBidsTable.unitPrice,
        quantity: vendorBidsTable.quantity,
        notes: vendorBidsTable.notes,
        lineTotal: sql<number>`${vendorBidsTable.unitPrice} * ${vendorBidsTable.quantity}`,
      })
      .from(vendorBidsTable)
      .innerJoin(segmentsTable, eq(vendorBidsTable.segmentId, segmentsTable.id))
      .innerJoin(blueprintsTable, eq(segmentsTable.blueprintId, blueprintsTable.id))
      .innerJoin(projectsTable, eq(blueprintsTable.projectId, projectsTable.id))
      .innerJoin(vendorsTable, eq(vendorBidsTable.vendorId, vendorsTable.id))
      .innerJoin(materialsTable, eq(vendorBidsTable.materialId, materialsTable.id))
      .where(and(eq(projectsTable.id, projectId), eq(vendorBidsTable.isSelected, true)));

    const totalCost = lineItems.reduce((sum: number, item) => sum + (Number(item.lineTotal) || 0), 0);

    const [estimate] = await db
      .insert(estimatesTable)
      .values({ projectId, totalCost, status: "draft" })
      .onConflictDoNothing()
      .returning();

    res.json({
      projectId,
      projectName: project.name,
      totalCost,
      lineItems,
      estimateId: estimate?.id ?? null,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to generate estimate");
    res.status(500).json({ error: "Failed to generate estimate" });
  }
});

export default router;
