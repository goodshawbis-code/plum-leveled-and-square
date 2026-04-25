import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, materialsTable, insertMaterialSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/materials", async (req: Request, res: Response) => {
  try {
    const materials = await db.select().from(materialsTable).orderBy(materialsTable.name);
    res.json(materials);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list materials");
    res.status(500).json({ error: "Failed to list materials" });
  }
});

router.post("/materials", async (req: Request, res: Response) => {
  const parsed = insertMaterialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [material] = await db.insert(materialsTable).values(parsed.data).returning();
    res.status(201).json(material);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create material");
    res.status(500).json({ error: "Failed to create material" });
  }
});

router.get("/materials/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const [material] = await db.select().from(materialsTable).where(eq(materialsTable.id, id));
    if (!material) {
      res.status(404).json({ error: "Material not found" });
      return;
    }
    res.json(material);
  } catch (error) {
    req.log.error({ err: error }, "Failed to get material");
    res.status(500).json({ error: "Failed to get material" });
  }
});

router.patch("/materials/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = insertMaterialSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [material] = await db
      .update(materialsTable)
      .set(parsed.data)
      .where(eq(materialsTable.id, id))
      .returning();
    if (!material) {
      res.status(404).json({ error: "Material not found" });
      return;
    }
    res.json(material);
  } catch (error) {
    req.log.error({ err: error }, "Failed to update material");
    res.status(500).json({ error: "Failed to update material" });
  }
});

router.delete("/materials/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await db.delete(materialsTable).where(eq(materialsTable.id, id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete material");
    res.status(500).json({ error: "Failed to delete material" });
  }
});

export default router;
