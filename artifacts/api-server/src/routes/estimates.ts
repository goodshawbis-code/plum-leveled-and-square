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
} from "@workspace/db";

const router: IRouter = Router();

/**
 * GET /projects/:id/estimate
 *
 * Compute a hard-bid estimate for a project by summing all selected vendor bids.
 * Returns ProjectEstimate with EstimateLineItem[] matching the OpenAPI schema.
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

    const rows = await db
      .select({
        segmentId: segmentsTable.id,
        segmentLabel: segmentsTable.label,
        vendorName: vendorsTable.name,
        materialName: materialsTable.name,
        materialSpec: materialsTable.spec,
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

    const lineItems = rows.map((r) => ({
      segmentId: r.segmentId,
      segmentLabel: r.segmentLabel,
      materialName: r.materialName,
      materialSpec: r.materialSpec,
      vendorName: r.vendorName,
      unitPrice: r.unitPrice,
      quantity: r.quantity,
      unit: r.materialUnit,
      lineTotal: Number(r.lineTotal) || 0,
      notes: r.notes,
    }));

    const totalCost = lineItems.reduce((sum: number, item) => sum + item.lineTotal, 0);

    res.json({
      projectId,
      projectName: project.name,
      totalCost,
      lineItems,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to generate estimate");
    res.status(500).json({ error: "Failed to generate estimate" });
  }
});

export default router;
