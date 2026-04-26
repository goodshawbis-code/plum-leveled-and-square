import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, siteCommentsTable } from "@workspace/db";
import {
  ListProjectCommentsParams,
  CreateCommentParams,
  CreateCommentBody,
  DeleteCommentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:id/comments", async (req: Request, res: Response) => {
  const params = ListProjectCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  try {
    const comments = await db
      .select()
      .from(siteCommentsTable)
      .where(eq(siteCommentsTable.projectId, params.data.id))
      .orderBy(desc(siteCommentsTable.createdAt));
    res.json(comments);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list comments");
    res.status(500).json({ error: "Failed to list comments" });
  }
});

router.post("/projects/:id/comments", async (req: Request, res: Response) => {
  const params = CreateCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const body = CreateCommentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [comment] = await db
      .insert(siteCommentsTable)
      .values({
        projectId: params.data.id,
        content: body.data.content,
        authorName: body.data.authorName ?? "Foreman",
        pinType: body.data.pinType ?? "none",
        segmentId: body.data.segmentId ?? null,
        blueprintId: body.data.blueprintId ?? null,
        blueprintX: body.data.blueprintX ?? null,
        blueprintY: body.data.blueprintY ?? null,
        locationLat: body.data.locationLat ?? null,
        locationLng: body.data.locationLng ?? null,
        locationLabel: body.data.locationLabel ?? null,
      })
      .returning();
    res.status(201).json(comment);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create comment");
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.delete("/comments/:id", async (req: Request, res: Response) => {
  const params = DeleteCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }
  try {
    await db.delete(siteCommentsTable).where(eq(siteCommentsTable.id, params.data.id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete comment");
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
