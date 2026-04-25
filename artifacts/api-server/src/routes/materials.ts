import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, materialsTable } from "@workspace/db";
import {
  CreateMaterialBody,
  UpdateMaterialBody,
  GetMaterialParams,
  UpdateMaterialParams,
  DeleteMaterialParams,
} from "@workspace/api-zod";

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
  const parsed = CreateMaterialBody.safeParse(req.body);
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
  const params = GetMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid material id" });
    return;
  }
  try {
    const [material] = await db.select().from(materialsTable).where(eq(materialsTable.id, params.data.id));
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
  const params = UpdateMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid material id" });
    return;
  }
  const body = UpdateMaterialBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [material] = await db
      .update(materialsTable)
      .set(body.data)
      .where(eq(materialsTable.id, params.data.id))
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
  const params = DeleteMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid material id" });
    return;
  }
  try {
    await db.delete(materialsTable).where(eq(materialsTable.id, params.data.id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete material");
    res.status(500).json({ error: "Failed to delete material" });
  }
});

export default router;
