import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { eq, desc, and, or, gt } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import { z } from "zod";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const storageService = new ObjectStorageService();

const SAFETY_KEYWORDS = [
  "safety", "accident", "hazard", "injury", "injured", "incident",
  "emergency", "hurt", "fire", "fall", "fell", "electric", "shock",
  "bleed", "bleeding", "unconscious", "911", "ambulance", "danger",
];

function hasSafetyKeyword(message: string): boolean {
  const lower = message.toLowerCase();
  return SAFETY_KEYWORDS.some((kw) => lower.includes(kw));
}

const MessageBody = z.object({
  senderName: z.string().min(1),
  message: z.string().min(1),
  projectId: z.coerce.number().optional(),
  projectName: z.string().optional(),
});

router.get("/chat-messages", async (req: Request, res: Response) => {
  try {
    const { projectId, since } = req.query as Record<string, string>;
    const conditions = [];
    if (projectId) conditions.push(eq(chatMessagesTable.projectId, Number(projectId)));
    const rows = await db
      .select()
      .from(chatMessagesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(chatMessagesTable.createdAt)
      .limit(200);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.get("/chat-messages/projects", async (req: Request, res: Response) => {
  try {
    const rows = await db
      .selectDistinct({
        projectId: chatMessagesTable.projectId,
        projectName: chatMessagesTable.projectName,
      })
      .from(chatMessagesTable)
      .orderBy(chatMessagesTable.projectName);
    res.json(rows.filter((r) => r.projectId !== null));
  } catch {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post(
  "/chat-messages",
  upload.single("photo"),
  async (req: Request, res: Response) => {
    try {
      const body = MessageBody.parse(req.body);
      let photoUrl: string | null = null;

      if (req.file) {
        const result = await storageService.uploadPublicObject(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
        );
        photoUrl = result.fileUrl;
      }

      const isSafety = hasSafetyKeyword(body.message);

      const [msg] = await db
        .insert(chatMessagesTable)
        .values({
          projectId: body.projectId ?? null,
          projectName: body.projectName ?? null,
          senderName: body.senderName,
          message: body.message,
          photoUrl,
          isSystemReply: false,
          safetyFlag: isSafety,
        })
        .returning();

      if (isSafety) {
        await db.insert(chatMessagesTable).values({
          projectId: body.projectId ?? null,
          projectName: body.projectName ?? null,
          senderName: "Safety Bot",
          message:
            "⚠️ SAFETY ALERT: A safety-related keyword was detected in this message. " +
            "Please stop work immediately if there is an active hazard. " +
            "Complete the Daily JHA Checklist in the Safety Hub and notify your supervisor. " +
            "In case of emergency, call 911.",
          photoUrl: null,
          isSystemReply: true,
          safetyFlag: true,
        });
      }

      res.status(201).json(msg);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: "Failed to send message" });
    }
  },
);

router.delete("/chat-messages/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
