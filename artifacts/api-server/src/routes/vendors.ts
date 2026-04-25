import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";
import { CreateVendorBody, UpdateVendorBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vendors", async (req: Request, res: Response) => {
  try {
    const vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.name);
    res.json(vendors);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list vendors");
    res.status(500).json({ error: "Failed to list vendors" });
  }
});

router.post("/vendors", async (req: Request, res: Response) => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [vendor] = await db.insert(vendorsTable).values(parsed.data).returning();
    res.status(201).json(vendor);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create vendor");
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

router.get("/vendors/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id));
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    res.json(vendor);
  } catch (error) {
    req.log.error({ err: error }, "Failed to get vendor");
    res.status(500).json({ error: "Failed to get vendor" });
  }
});

router.patch("/vendors/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [vendor] = await db
      .update(vendorsTable)
      .set(parsed.data)
      .where(eq(vendorsTable.id, id))
      .returning();
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    res.json(vendor);
  } catch (error) {
    req.log.error({ err: error }, "Failed to update vendor");
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await db.delete(vendorsTable).where(eq(vendorsTable.id, id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete vendor");
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

export default router;
