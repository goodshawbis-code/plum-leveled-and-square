import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import multer from "multer";
import { db, segmentsTable, segmentPhotosTable } from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage";
import { pgConstraintMessage } from "../lib/dbError";
import {
  CreateSegmentBody,
  UpdateSegmentBody,
  UpdateSegmentFieldBody,
  UpdateSegmentFieldParams,
  ListSegmentsParams,
  CreateSegmentParams,
  GetSegmentParams,
  UpdateSegmentParams,
  DeleteSegmentParams,
  ListSegmentPhotosParams,
  UploadSegmentPhotoParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const storageService = new ObjectStorageService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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
    const constraint = pgConstraintMessage(error);
    if (constraint) {
      res.status(400).json({ error: constraint });
      return;
    }
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

router.patch("/segments/:id/field", async (req: Request, res: Response) => {
  const params = UpdateSegmentFieldParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid segment id" });
    return;
  }
  const body = UpdateSegmentFieldBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [segment] = await db
      .update(segmentsTable)
      .set({
        fieldNotes: body.data.fieldNotes ?? null,
        completedAt: body.data.completedAt ? new Date(body.data.completedAt) : null,
      })
      .where(eq(segmentsTable.id, params.data.id))
      .returning();
    if (!segment) {
      res.status(404).json({ error: "Segment not found" });
      return;
    }
    res.json(segment);
  } catch (error) {
    req.log.error({ err: error }, "Failed to update segment field data");
    res.status(500).json({ error: "Failed to update segment field data" });
  }
});

router.get("/segments/:segmentId/photos", async (req: Request, res: Response) => {
  const params = ListSegmentPhotosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid segment id" });
    return;
  }
  try {
    const photos = await db
      .select()
      .from(segmentPhotosTable)
      .where(eq(segmentPhotosTable.segmentId, params.data.segmentId))
      .orderBy(segmentPhotosTable.createdAt);
    res.json(photos);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list segment photos");
    res.status(500).json({ error: "Failed to list segment photos" });
  }
});

router.post(
  "/segments/:segmentId/photos",
  upload.single("photo"),
  async (req: Request, res: Response) => {
    const params = UploadSegmentPhotoParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid segment id" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "A photo file is required (multipart/form-data)" });
      return;
    }
    try {
      const ext = req.file.originalname.split(".").pop() ?? "jpg";
      const fileName = `segment-${params.data.segmentId}-${Date.now()}.${ext}`;
      const { fileUrl } = await storageService.uploadPublicObject(req.file.buffer, fileName, req.file.mimetype);
      const caption = typeof req.body.caption === "string" ? req.body.caption : null;
      const [photo] = await db
        .insert(segmentPhotosTable)
        .values({ segmentId: params.data.segmentId, fileUrl, caption })
        .returning();
      res.status(201).json(photo);
    } catch (error) {
      req.log.error({ err: error }, "Failed to upload segment photo");
      res.status(500).json({ error: "Failed to upload segment photo" });
    }
  },
);

export default router;
