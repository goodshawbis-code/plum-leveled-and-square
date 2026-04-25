import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (req: Request, res: Response) => {
  try {
    const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
    res.json(projects);
  } catch (error) {
    req.log.error({ err: error }, "Failed to list projects");
    res.status(500).json({ error: "Failed to list projects" });
  }
});

router.post("/projects", async (req: Request, res: Response) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [project] = await db.insert(projectsTable).values(parsed.data).returning();
    res.status(201).json(project);
  } catch (error) {
    req.log.error({ err: error }, "Failed to create project");
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/projects/:id", async (req: Request, res: Response) => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error) {
    req.log.error({ err: error }, "Failed to get project");
    res.status(500).json({ error: "Failed to get project" });
  }
});

router.patch("/projects/:id", async (req: Request, res: Response) => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const body = UpdateProjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [project] = await db
      .update(projectsTable)
      .set(body.data)
      .where(eq(projectsTable.id, params.data.id))
      .returning();
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error) {
    req.log.error({ err: error }, "Failed to update project");
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req: Request, res: Response) => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  try {
    await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete project");
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
