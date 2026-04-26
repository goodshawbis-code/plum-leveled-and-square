import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, safetyTopicsTable, safetyTopicAcknowledgmentsTable, dailyJhaCheckinsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const CreateTopicBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  weekOf: z.string().min(1),
  createdBy: z.string().optional().default("Admin"),
  isPublished: z.boolean().optional().default(false),
});

const UpdateTopicBody = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  weekOf: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const AcknowledgeBody = z.object({
  foremanName: z.string().min(1),
  projectId: z.coerce.number().optional(),
  notes: z.string().optional(),
});

const JhaBody = z.object({
  foremanName: z.string().min(1),
  projectId: z.coerce.number().optional(),
  checkDate: z.string().min(1),
  scaffoldingStable: z.boolean(),
  ppeVerified: z.boolean(),
  trenchSafe: z.boolean(),
  hazardsReviewed: z.boolean(),
  firstAidAccessible: z.boolean(),
  emergencyContactsPosted: z.boolean(),
  notes: z.string().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.get("/safety-topics", async (req: Request, res: Response) => {
  try {
    const topics = await db
      .select()
      .from(safetyTopicsTable)
      .orderBy(desc(safetyTopicsTable.createdAt));
    res.json(topics);
  } catch (err) {
    req.log.error({ err }, "Failed to list safety topics");
    res.status(500).json({ error: "Failed to list safety topics" });
  }
});

router.get("/safety-topics/current", async (req: Request, res: Response) => {
  try {
    const [topic] = await db
      .select()
      .from(safetyTopicsTable)
      .where(eq(safetyTopicsTable.isPublished, true))
      .orderBy(desc(safetyTopicsTable.weekOf))
      .limit(1);
    res.json(topic ?? null);
  } catch (err) {
    req.log.error({ err }, "Failed to get current safety topic");
    res.status(500).json({ error: "Failed to get current safety topic" });
  }
});

router.post("/safety-topics", async (req: Request, res: Response) => {
  const body = CreateTopicBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [topic] = await db
      .insert(safetyTopicsTable)
      .values({
        title: body.data.title,
        content: body.data.content,
        weekOf: body.data.weekOf,
        createdBy: body.data.createdBy,
        isPublished: body.data.isPublished,
      })
      .returning();
    res.status(201).json(topic);
  } catch (err) {
    req.log.error({ err }, "Failed to create safety topic");
    res.status(500).json({ error: "Failed to create safety topic" });
  }
});

router.patch("/safety-topics/:id", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = UpdateTopicBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [topic] = await db
      .update(safetyTopicsTable)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(safetyTopicsTable.id, params.data.id))
      .returning();
    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }
    res.json(topic);
  } catch (err) {
    req.log.error({ err }, "Failed to update safety topic");
    res.status(500).json({ error: "Failed to update safety topic" });
  }
});

router.delete("/safety-topics/:id", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(safetyTopicsTable).where(eq(safetyTopicsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete safety topic");
    res.status(500).json({ error: "Failed to delete safety topic" });
  }
});

router.post("/safety-topics/:id/acknowledge", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = AcknowledgeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [topic] = await db
      .select()
      .from(safetyTopicsTable)
      .where(eq(safetyTopicsTable.id, params.data.id));
    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }
    const [ack] = await db
      .insert(safetyTopicAcknowledgmentsTable)
      .values({
        safetyTopicId: params.data.id,
        foremanName: body.data.foremanName,
        projectId: body.data.projectId ?? null,
        notes: body.data.notes ?? null,
      })
      .returning();
    res.status(201).json(ack);
  } catch (err) {
    req.log.error({ err }, "Failed to acknowledge safety topic");
    res.status(500).json({ error: "Failed to acknowledge" });
  }
});

router.get("/safety-topics/:id/acknowledgments", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const acks = await db
      .select()
      .from(safetyTopicAcknowledgmentsTable)
      .where(eq(safetyTopicAcknowledgmentsTable.safetyTopicId, params.data.id))
      .orderBy(desc(safetyTopicAcknowledgmentsTable.discussedAt));
    res.json(acks);
  } catch (err) {
    req.log.error({ err }, "Failed to list acknowledgments" );
    res.status(500).json({ error: "Failed to list acknowledgments" });
  }
});

router.post("/jha-checkins", async (req: Request, res: Response) => {
  const body = JhaBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [checkin] = await db
      .insert(dailyJhaCheckinsTable)
      .values({
        foremanName: body.data.foremanName,
        projectId: body.data.projectId ?? null,
        checkDate: body.data.checkDate,
        scaffoldingStable: body.data.scaffoldingStable,
        ppeVerified: body.data.ppeVerified,
        trenchSafe: body.data.trenchSafe,
        hazardsReviewed: body.data.hazardsReviewed,
        firstAidAccessible: body.data.firstAidAccessible,
        emergencyContactsPosted: body.data.emergencyContactsPosted,
        notes: body.data.notes ?? null,
      })
      .returning();
    res.status(201).json(checkin);
  } catch (err) {
    req.log.error({ err }, "Failed to submit JHA checkin");
    res.status(500).json({ error: "Failed to submit JHA checkin" });
  }
});

router.get("/jha-checkins", async (req: Request, res: Response) => {
  try {
    const checkins = await db
      .select()
      .from(dailyJhaCheckinsTable)
      .orderBy(desc(dailyJhaCheckinsTable.completedAt))
      .limit(100);
    res.json(checkins);
  } catch (err) {
    req.log.error({ err }, "Failed to list JHA checkins");
    res.status(500).json({ error: "Failed to list JHA checkins" });
  }
});

export default router;
