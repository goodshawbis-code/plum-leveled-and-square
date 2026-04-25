import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, blueprintsTable, insertBlueprintSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/projects/:projectId/blueprints", async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  try {
    const blueprints = await db
      .select()
      .from(blueprintsTable)
      .where(eq(blueprintsTable.projectId, projectId))
      .orderBy(blueprintsTable.createdAt);
    res.json(blueprints);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list blueprints");
    res.status(500).json({ error: "Failed to list blueprints" });
  }
});

router.post("/projects/:projectId/blueprints", async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const parsed = insertBlueprintSchema.safeParse({ ...req.body, projectId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [blueprint] = await db.insert(blueprintsTable).values(parsed.data).returning();
    res.status(201).json(blueprint);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create blueprint");
    res.status(500).json({ error: "Failed to create blueprint" });
  }
});

router.get("/blueprints/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const [blueprint] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, id));
    if (!blueprint) {
      res.status(404).json({ error: "Blueprint not found" });
      return;
    }
    res.json(blueprint);
  } catch (error) {
    req.log.error({ err: error }, "Failed to get blueprint");
    res.status(500).json({ error: "Failed to get blueprint" });
  }
});

router.delete("/blueprints/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await db.delete(blueprintsTable).where(eq(blueprintsTable.id, id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete blueprint");
    res.status(500).json({ error: "Failed to delete blueprint" });
  }
});

export default router;
