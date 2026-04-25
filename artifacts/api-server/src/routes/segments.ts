import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, segmentsTable } from "@workspace/db";
import {
  CreateSegmentBody,
  UpdateSegmentBody,
  ListSegmentsParams,
  CreateSegmentParams,
  GetSegmentParams,
  UpdateSegmentParams,
  DeleteSegmentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/blueprints/:blueprintId/segments", async (req: Request, res: Response) => {
  const params = ListSegmentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid blueprint id" });
    return;
  }
  try {
    const segments = await db
      .select()
      .from(segmentsTable)
      .where(eq(segmentsTable.blueprintId, params.data.blueprintId))
      .orderBy(segmentsTable.createdAt);
    res.json(segments);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list segments");
    res.status(500).json({ error: "Failed to list segments" });
  }
});

router.post("/blueprints/:blueprintId/segments", async (req: Request, res: Response) => {
  const params = CreateSegmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid blueprint id" });
    return;
  }
  const body = CreateSegmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [segment] = await db
      .insert(segmentsTable)
      .values({ ...body.data, blueprintId: params.data.blueprintId })
      .returning();
    res.status(201).json(segment);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create segment");
    res.status(500).json({ error: "Failed to create segment" });
  }
});

router.get("/segments/:id", async (req: Request, res: Response) => {
  const params = GetSegmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid segment id" });
    return;
  }
  try {
    const [segment] = await db.select().from(segmentsTable).where(eq(segmentsTable.id, params.data.id));
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
  const params = UpdateSegmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid segment id" });
    return;
  }
  const body = UpdateSegmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [segment] = await db
      .update(segmentsTable)
      .set(body.data)
      .where(eq(segmentsTable.id, params.data.id))
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
  const params = DeleteSegmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid segment id" });
    return;
  }
  try {
    await db.delete(segmentsTable).where(eq(segmentsTable.id, params.data.id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete segment");
    res.status(500).json({ error: "Failed to delete segment" });
  }
});

export default router;
