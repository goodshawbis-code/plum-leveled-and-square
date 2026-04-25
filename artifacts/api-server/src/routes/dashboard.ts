import { Router, type IRouter, type Request, type Response } from "express";
import { eq, count, sql, desc, inArray } from "drizzle-orm";
import {
  db,
  projectsTable,
  blueprintsTable,
  segmentsTable,
  vendorBidsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const [[totals], [globalBidTotals], recentProjectRows] = await Promise.all([
      db
        .select({
          totalProjects: count(),
          activeProjects: sql<number>`count(*) filter (where ${projectsTable.status} = 'active')`,
        })
        .from(projectsTable),

      db
        .select({
          total: sql<number>`coalesce(sum(${vendorBidsTable.unitPrice} * ${vendorBidsTable.quantity}) filter (where ${vendorBidsTable.isSelected} = true), 0)`,
        })
        .from(vendorBidsTable),

      db
        .select({
          id: projectsTable.id,
          name: projectsTable.name,
          address: projectsTable.address,
          status: projectsTable.status,
          createdAt: projectsTable.createdAt,
        })
        .from(projectsTable)
        .orderBy(desc(projectsTable.createdAt))
        .limit(10),
    ]);

    const projectIds = recentProjectRows.map((p) => p.id);

    const [blueprintCounts, segmentCounts, bidTotals] = await Promise.all([
      projectIds.length > 0
        ? db
            .select({
              projectId: blueprintsTable.projectId,
              cnt: count(),
            })
            .from(blueprintsTable)
            .where(inArray(blueprintsTable.projectId, projectIds))
            .groupBy(blueprintsTable.projectId)
        : [],

      projectIds.length > 0
        ? db
            .select({
              projectId: blueprintsTable.projectId,
              cnt: count(),
            })
            .from(segmentsTable)
            .innerJoin(blueprintsTable, eq(segmentsTable.blueprintId, blueprintsTable.id))
            .where(inArray(blueprintsTable.projectId, projectIds))
            .groupBy(blueprintsTable.projectId)
        : [],

      projectIds.length > 0
        ? db
            .select({
              projectId: blueprintsTable.projectId,
              total: sql<number>`coalesce(sum(${vendorBidsTable.unitPrice} * ${vendorBidsTable.quantity}) filter (where ${vendorBidsTable.isSelected} = true), 0)`,
            })
            .from(vendorBidsTable)
            .innerJoin(segmentsTable, eq(vendorBidsTable.segmentId, segmentsTable.id))
            .innerJoin(blueprintsTable, eq(segmentsTable.blueprintId, blueprintsTable.id))
            .where(inArray(blueprintsTable.projectId, projectIds))
            .groupBy(blueprintsTable.projectId)
        : [],
    ]);

    const bpMap = new Map(blueprintCounts.map((r) => [r.projectId, Number(r.cnt)]));
    const segMap = new Map(segmentCounts.map((r) => [r.projectId, Number(r.cnt)]));
    const bidMap = new Map(bidTotals.map((r) => [r.projectId, Number(r.total) || 0]));

    const recentProjects = recentProjectRows.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      status: p.status,
      blueprintCount: bpMap.get(p.id) ?? 0,
      segmentCount: segMap.get(p.id) ?? 0,
      estimatedTotal: bidMap.get(p.id) ?? 0,
      createdAt: p.createdAt,
    }));

    const totalEstimatedValue = Number(globalBidTotals?.total ?? 0);

    res.json({
      totalProjects: Number(totals?.totalProjects ?? 0),
      activeProjects: Number(totals?.activeProjects ?? 0),
      totalEstimatedValue,
      recentProjects,
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to get dashboard");
    res.status(500).json({ error: "Failed to get dashboard" });
  }
});

export default router;
