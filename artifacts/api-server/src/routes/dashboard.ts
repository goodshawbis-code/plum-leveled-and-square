import { Router, type IRouter, type Request, type Response } from "express";
import { eq, count, sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  blueprintsTable,
  segmentsTable,
  vendorsTable,
  materialsTable,
  vendorBidsTable,
} from "@workspace/db";

const router: IRouter = Router();

/**
 * GET /dashboard
 *
 * Aggregate summary statistics for the dashboard view.
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const [[projectStats], [blueprintCount], [segmentCount], [vendorCount], [materialCount], [bidStats]] =
      await Promise.all([
        db
          .select({
            total: count(),
            active: sql<number>`count(*) filter (where ${projectsTable.status} = 'active')`,
            completed: sql<number>`count(*) filter (where ${projectsTable.status} = 'completed')`,
            archived: sql<number>`count(*) filter (where ${projectsTable.status} = 'archived')`,
          })
          .from(projectsTable),
        db.select({ total: count() }).from(blueprintsTable),
        db.select({ total: count() }).from(segmentsTable),
        db.select({ total: count() }).from(vendorsTable),
        db.select({ total: count() }).from(materialsTable),
        db
          .select({
            total: count(),
            selected: sql<number>`count(*) filter (where ${vendorBidsTable.isSelected} = true)`,
            totalValue: sql<number>`sum(${vendorBidsTable.unitPrice} * ${vendorBidsTable.quantity})`,
          })
          .from(vendorBidsTable),
      ]);

    res.json({
      projects: {
        total: projectStats?.total ?? 0,
        active: projectStats?.active ?? 0,
        completed: projectStats?.completed ?? 0,
        archived: projectStats?.archived ?? 0,
      },
      blueprints: blueprintCount?.total ?? 0,
      segments: segmentCount?.total ?? 0,
      vendors: vendorCount?.total ?? 0,
      materials: materialCount?.total ?? 0,
      bids: {
        total: bidStats?.total ?? 0,
        selected: bidStats?.selected ?? 0,
        totalSelectedValue: bidStats?.totalValue ?? 0,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to get dashboard");
    res.status(500).json({ error: "Failed to get dashboard" });
  }
});

export default router;
