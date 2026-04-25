import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, vendorBidsTable, vendorsTable, materialsTable } from "@workspace/db";
import { CreateBidBody, UpdateBidBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/segments/:segmentId/bids", async (req: Request, res: Response) => {
  const segmentId = Number(req.params.segmentId);
  try {
    const rows = await db
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
        materialName: materialsTable.name,
        materialType: materialsTable.type,
        materialSpec: materialsTable.spec,
        materialDescription: materialsTable.description,
        materialPictureUrl: materialsTable.pictureUrl,
        materialUnit: materialsTable.unit,
        materialCreatedAt: materialsTable.createdAt,
        materialUpdatedAt: materialsTable.updatedAt,
        vendorName: vendorsTable.name,
        vendorContactName: vendorsTable.contactName,
        vendorPhone: vendorsTable.phone,
        vendorEmail: vendorsTable.email,
        vendorWebsite: vendorsTable.website,
        vendorCreatedAt: vendorsTable.createdAt,
        vendorUpdatedAt: vendorsTable.updatedAt,
      })
      .from(vendorBidsTable)
      .innerJoin(vendorsTable, eq(vendorBidsTable.vendorId, vendorsTable.id))
      .innerJoin(materialsTable, eq(vendorBidsTable.materialId, materialsTable.id))
      .where(eq(vendorBidsTable.segmentId, segmentId))
      .orderBy(vendorBidsTable.createdAt);

    const bids = rows.map((r) => ({
      id: r.id,
      segmentId: r.segmentId,
      materialId: r.materialId,
      vendorId: r.vendorId,
      unitPrice: r.unitPrice,
      quantity: r.quantity,
      notes: r.notes,
      isSelected: r.isSelected,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      material: {
        id: r.materialId,
        name: r.materialName,
        type: r.materialType,
        spec: r.materialSpec,
        description: r.materialDescription,
        pictureUrl: r.materialPictureUrl,
        unit: r.materialUnit,
        createdAt: r.materialCreatedAt,
        updatedAt: r.materialUpdatedAt,
      },
      vendor: {
        id: r.vendorId,
        name: r.vendorName,
        contactName: r.vendorContactName,
        phone: r.vendorPhone,
        email: r.vendorEmail,
        website: r.vendorWebsite,
        createdAt: r.vendorCreatedAt,
        updatedAt: r.vendorUpdatedAt,
      },
    }));

    res.json(bids);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list bids");
    res.status(500).json({ error: "Failed to list bids" });
  }
});

router.post("/segments/:segmentId/bids", async (req: Request, res: Response) => {
  const segmentId = Number(req.params.segmentId);
  const parsed = CreateBidBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [bid] = await db.insert(vendorBidsTable).values({ ...parsed.data, segmentId }).returning();
    res.status(201).json(bid);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create bid");
    res.status(500).json({ error: "Failed to create bid" });
  }
});

router.patch("/bids/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = UpdateBidBody.safeParse(req.body);
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
