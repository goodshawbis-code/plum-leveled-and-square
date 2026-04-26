import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, max } from "drizzle-orm";
import { db, rfisTable } from "@workspace/db";
import {
  ListProjectRfisParams,
  CreateRfiParams,
  CreateRfiBody,
  GetRfiParams,
  UpdateRfiParams,
  UpdateRfiBody,
  DeleteRfiParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:id/rfis", async (req: Request, res: Response) => {
  const params = ListProjectRfisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  try {
    const rfis = await db
      .select()
      .from(rfisTable)
      .where(eq(rfisTable.projectId, params.data.id))
      .orderBy(desc(rfisTable.createdAt));
    res.json(rfis);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list RFIs");
    res.status(500).json({ error: "Failed to list RFIs" });
  }
});

router.post("/projects/:id/rfis", async (req: Request, res: Response) => {
  const params = CreateRfiParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const body = CreateRfiBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [maxResult] = await db
      .select({ maxNum: max(rfisTable.rfiNumber) })
      .from(rfisTable)
      .where(eq(rfisTable.projectId, params.data.id));
    const nextNumber = (maxResult?.maxNum ?? 0) + 1;

    const [rfi] = await db
      .insert(rfisTable)
      .values({
        projectId: params.data.id,
        segmentId: body.data.segmentId ?? null,
        rfiNumber: nextNumber,
        title: body.data.title,
        description: body.data.description,
        priority: body.data.priority ?? "medium",
        status: "open",
        submittedBy: body.data.submittedBy ?? "Foreman",
      })
      .returning();
    res.status(201).json(rfi);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create RFI");
    res.status(500).json({ error: "Failed to create RFI" });
  }
});

router.get("/rfis/:id", async (req: Request, res: Response) => {
  const params = GetRfiParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid RFI id" });
    return;
  }
  try {
    const [rfi] = await db.select().from(rfisTable).where(eq(rfisTable.id, params.data.id));
    if (!rfi) {
      res.status(404).json({ error: "RFI not found" });
      return;
    }
    res.json(rfi);
  } catch (error) {
    req.log.error({ err: error }, "Failed to get RFI");
    res.status(500).json({ error: "Failed to get RFI" });
  }
});

router.patch("/rfis/:id", async (req: Request, res: Response) => {
  const params = UpdateRfiParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid RFI id" });
    return;
  }
  const body = UpdateRfiBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const updates: Partial<typeof rfisTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.data.status !== undefined) updates.status = body.data.status;
    if (body.data.priority !== undefined) updates.priority = body.data.priority;
    if (body.data.response !== undefined) {
      updates.response = body.data.response;
      updates.respondedAt = new Date();
    }

    const [rfi] = await db
      .update(rfisTable)
      .set(updates)
      .where(eq(rfisTable.id, params.data.id))
      .returning();
    if (!rfi) {
      res.status(404).json({ error: "RFI not found" });
      return;
    }
    res.json(rfi);
  } catch (error) {
    req.log.error({ err: error }, "Failed to update RFI");
    res.status(500).json({ error: "Failed to update RFI" });
  }
});

router.delete("/rfis/:id", async (req: Request, res: Response) => {
  const params = DeleteRfiParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid RFI id" });
    return;
  }
  try {
    await db.delete(rfisTable).where(eq(rfisTable.id, params.data.id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete RFI");
    res.status(500).json({ error: "Failed to delete RFI" });
  }
});

export default router;
