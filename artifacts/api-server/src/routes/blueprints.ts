import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, blueprintsTable } from "@workspace/db";
import { objectStorageClient } from "../lib/objectStorage";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR is not set");
  return dir;
}

async function uploadBlueprintToStorage(
  buffer: Buffer,
  originalName: string,
  contentType: string,
): Promise<string> {
  const privateDir = getPrivateObjectDir();
  const objectId = randomUUID();
  const fullPath = `${privateDir}/blueprints/${objectId}/${encodeURIComponent(originalName)}`;

  const parts = fullPath.replace(/^\//, "").split("/");
  const bucketName = parts[0];
  const objectName = parts.slice(1).join("/");

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });

  return `/storage/objects/blueprints/${objectId}/${encodeURIComponent(originalName)}`;
}

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

router.post(
  "/projects/:projectId/blueprints",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);

    if (!req.file) {
      res.status(400).json({ error: "A file field is required (multipart/form-data)" });
      return;
    }

    const fileName = req.file.originalname;
    const contentType = req.file.mimetype;
    const pageCount = req.body.pageCount != null ? Number(req.body.pageCount) : 1;

    try {
      const fileUrl = await uploadBlueprintToStorage(req.file.buffer, fileName, contentType);

      const [blueprint] = await db
        .insert(blueprintsTable)
        .values({ projectId, fileUrl, fileName, pageCount })
        .returning();

      res.status(201).json(blueprint);
    } catch (error) {
      req.log.error({ err: error }, "Failed to create blueprint");
      res.status(500).json({ error: "Failed to create blueprint" });
    }
  },
);

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
