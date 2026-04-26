import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { eq, desc } from "drizzle-orm";
import { db, complianceDocsTable } from "@workspace/db";
import { z } from "zod";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const storageService = new ObjectStorageService();

export const COMPLIANCE_CATEGORIES = [
  { id: "coi", label: "Certificate of Insurance (COI)", icon: "shield" },
  { id: "workers_comp", label: "Worker's Compensation", icon: "heart" },
  { id: "wa_license", label: "Washington Business License", icon: "file-text" },
  { id: "or_license", label: "Oregon Business License", icon: "file-text" },
  { id: "right_to_work", label: "Right to Work Authorization", icon: "check-circle" },
  { id: "other", label: "Other Documents", icon: "folder" },
] as const;

const UpdateDocBody = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().optional().nullable(),
});

router.get("/compliance-docs", async (req: Request, res: Response) => {
  try {
    const docs = await db
      .select()
      .from(complianceDocsTable)
      .orderBy(desc(complianceDocsTable.createdAt));
    res.json(docs);
  } catch {
    res.status(500).json({ error: "Failed to fetch compliance docs" });
  }
});

router.get("/compliance-docs/active", async (req: Request, res: Response) => {
  try {
    const docs = await db
      .select()
      .from(complianceDocsTable)
      .where(eq(complianceDocsTable.isActive, true))
      .orderBy(desc(complianceDocsTable.createdAt));
    res.json(docs);
  } catch {
    res.status(500).json({ error: "Failed to fetch compliance docs" });
  }
});

router.post(
  "/compliance-docs",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "A file is required (multipart/form-data)" });
    }
    const { category, title, description, expiresAt, uploadedBy } = req.body;
    if (!category || !title) {
      return res.status(400).json({ error: "category and title are required" });
    }
    try {
      const { fileUrl } = await storageService.uploadPublicObject(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
      const [doc] = await db
        .insert(complianceDocsTable)
        .values({
          category,
          title,
          description: description ?? null,
          fileUrl,
          fileType: req.file.mimetype,
          originalName: req.file.originalname,
          uploadedBy: uploadedBy ?? "Admin",
          isActive: true,
          expiresAt: expiresAt ?? null,
        })
        .returning();
      res.status(201).json(doc);
    } catch (err) {
      res.status(500).json({ error: "Failed to upload document" });
    }
  },
);

router.patch("/compliance-docs/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateDocBody.parse(req.body);
    const [updated] = await db
      .update(complianceDocsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(complianceDocsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Document not found" });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to update document" });
  }
});

router.delete("/compliance-docs/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(complianceDocsTable).where(eq(complianceDocsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
