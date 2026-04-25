import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  vendorBidsTable,
  vendorsTable,
  materialsTable,
  insertVendorBidSchema,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/segments/:segmentId/bids", async (req: Request, res: Response) => {
  const segmentId = Number(req.params.segmentId);
  try {
    const bids = await db
      .select({
        id: vendorBidsTable.id,
        segmentId: vendorBidsTable.segmentId,
        materialId: vendorBidsTable.materialId,
        vendorId: vendorBidsTable.vendorId,
        unitPrice: vendorBidsTable.unitPrice,
        quantity: vendorBidsTable.quantity,
        notes: vendorBidsTable.notes,
        isSelected: vendorBidsTable.isSelected,
        createdAt: vendorBidsTable.createdAt,
        updatedAt: vendorBidsTable.updatedAt,
        vendorName: vendorsTable.name,
        vendorEmail: vendorsTable.email,
        materialName: materialsTable.name,
        materialUnit: materialsTable.unit,
      })
      .from(vendorBidsTable)
      .leftJoin(vendorsTable, eq(vendorBidsTable.vendorId, vendorsTable.id))
      .leftJoin(materialsTable, eq(vendorBidsTable.materialId, materialsTable.id))
      .where(eq(vendorBidsTable.segmentId, segmentId))
      .orderBy(vendorBidsTable.createdAt);
    res.json(bids);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list bids");
    res.status(500).json({ error: "Failed to list bids" });
  }
});

router.post("/segments/:segmentId/bids", async (req: Request, res: Response) => {
  const segmentId = Number(req.params.segmentId);
  const parsed = insertVendorBidSchema.safeParse({ ...req.body, segmentId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [bid] = await db.insert(vendorBidsTable).values(parsed.data).returning();
    res.status(201).json(bid);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create bid");
    res.status(500).json({ error: "Failed to create bid" });
  }
});

router.patch("/bids/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = insertVendorBidSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [bid] = await db
      .update(vendorBidsTable)
      .set(parsed.data)
      .where(eq(vendorBidsTable.id, id))
      .returning();
    if (!bid) {
      res.status(404).json({ error: "Bid not found" });
      return;
    }
    res.json(bid);
  } catch (error) {
    req.log.error({ err: error }, "Failed to update bid");
    res.status(500).json({ error: "Failed to update bid" });
  }
});

router.delete("/bids/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await db.delete(vendorBidsTable).where(eq(vendorBidsTable.id, id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete bid");
    res.status(500).json({ error: "Failed to delete bid" });
  }
});

export default router;
