import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, segmentsTable, insertSegmentSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/blueprints/:blueprintId/segments", async (req: Request, res: Response) => {
  const blueprintId = Number(req.params.blueprintId);
  try {
    const segments = await db
      .select()
      .from(segmentsTable)
      .where(eq(segmentsTable.blueprintId, blueprintId))
      .orderBy(segmentsTable.createdAt);
    res.json(segments);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list segments");
    res.status(500).json({ error: "Failed to list segments" });
  }
});

router.post("/blueprints/:blueprintId/segments", async (req: Request, res: Response) => {
  const blueprintId = Number(req.params.blueprintId);
  const parsed = insertSegmentSchema.safeParse({ ...req.body, blueprintId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [segment] = await db.insert(segmentsTable).values(parsed.data).returning();
    res.status(201).json(segment);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create segment");
    res.status(500).json({ error: "Failed to create segment" });
  }
});

router.get("/segments/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const [segment] = await db.select().from(segmentsTable).where(eq(segmentsTable.id, id));
    if (!segment) {
      res.status(404).json({ error: "Segment not found" });
      return;
    }
    res.json(segment);
  } catch (error) {
    req.log.error({ err: error }, "Failed to get segment");
    res.status(500).json({ error: "Failed to get segment" });
  }
});

router.patch("/segments/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = insertSegmentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [segment] = await db
      .update(segmentsTable)
      .set(parsed.data)
      .where(eq(segmentsTable.id, id))
      .returning();
    if (!segment) {
      res.status(404).json({ error: "Segment not found" });
      return;
    }
    res.json(segment);
  } catch (error) {
    req.log.error({ err: error }, "Failed to update segment");
    res.status(500).json({ error: "Failed to update segment" });
  }
});

router.delete("/segments/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await db.delete(segmentsTable).where(eq(segmentsTable.id, id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete segment");
    res.status(500).json({ error: "Failed to delete segment" });
  }
});

export default router;
