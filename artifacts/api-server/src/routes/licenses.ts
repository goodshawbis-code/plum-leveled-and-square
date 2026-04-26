import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tempLicensesTable, projectsTable } from "@workspace/db";
import { z } from "zod";
import crypto from "crypto";
import { sendLicenseInviteEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

const CreateLicenseBody = z.object({
  projectId: z.number().int().positive(),
  granteeName: z.string().min(1),
  granteeEmail: z.string().email(),
  expiresAt: z.string().datetime(),
  sendInviteEmail: z.boolean().optional().default(true),
});

const UpdateLicenseBody = z.object({
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  granteeName: z.string().min(1).optional(),
  granteeEmail: z.string().email().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const TokenParam = z.object({ token: z.string().min(1) });

router.get("/admin/licenses", async (req: Request, res: Response) => {
  try {
    const licenses = await db
      .select({
        id: tempLicensesTable.id,
        token: tempLicensesTable.token,
        projectId: tempLicensesTable.projectId,
        projectName: projectsTable.name,
        granteeName: tempLicensesTable.granteeName,
        granteeEmail: tempLicensesTable.granteeEmail,
        createdBy: tempLicensesTable.createdBy,
        expiresAt: tempLicensesTable.expiresAt,
        isActive: tempLicensesTable.isActive,
        warningSentAt: tempLicensesTable.warningSentAt,
        inviteSentAt: tempLicensesTable.inviteSentAt,
        createdAt: tempLicensesTable.createdAt,
        updatedAt: tempLicensesTable.updatedAt,
      })
      .from(tempLicensesTable)
      .leftJoin(projectsTable, eq(tempLicensesTable.projectId, projectsTable.id))
      .orderBy(desc(tempLicensesTable.createdAt));
    res.json(licenses);
  } catch (err) {
    req.log.error({ err }, "Failed to list licenses");
    res.status(500).json({ error: "Failed to list licenses" });
  }
});

router.post("/admin/licenses", async (req: Request, res: Response) => {
  const body = CreateLicenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const [project] = await db
      .select({ name: projectsTable.name })
      .from(projectsTable)
      .where(eq(projectsTable.id, body.data.projectId));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const token = generateToken();

    const [license] = await db
      .insert(tempLicensesTable)
      .values({
        token,
        projectId: body.data.projectId,
        granteeName: body.data.granteeName,
        granteeEmail: body.data.granteeEmail,
        expiresAt: new Date(body.data.expiresAt),
        createdBy: (req.headers["x-user-id"] as string) ?? "admin",
      })
      .returning();

    if (body.data.sendInviteEmail) {
      const domains = process.env.REPLIT_DOMAINS?.split(",") ?? [];
      const appUrl = domains[0]
        ? `https://${domains[0]}`
        : `http://localhost:${process.env.PORT}`;

      const sent = await sendLicenseInviteEmail({
        to: license.granteeEmail,
        granteeName: license.granteeName,
        projectName: project.name,
        accessToken: token,
        expiresAt: license.expiresAt,
        appUrl,
      });

      if (sent) {
        await db
          .update(tempLicensesTable)
          .set({ inviteSentAt: new Date() })
          .where(eq(tempLicensesTable.id, license.id));
        license.inviteSentAt = new Date();
      }
    }

    res.status(201).json({ ...license, projectName: project.name });
  } catch (err) {
    req.log.error({ err }, "Failed to create license");
    res.status(500).json({ error: "Failed to create license" });
  }
});

router.patch("/admin/licenses/:id", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid license id" });
    return;
  }
  const body = UpdateLicenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.isActive !== undefined) updates.isActive = body.data.isActive;
    if (body.data.expiresAt !== undefined) updates.expiresAt = new Date(body.data.expiresAt);
    if (body.data.granteeName !== undefined) updates.granteeName = body.data.granteeName;
    if (body.data.granteeEmail !== undefined) updates.granteeEmail = body.data.granteeEmail;

    const [license] = await db
      .update(tempLicensesTable)
      .set(updates)
      .where(eq(tempLicensesTable.id, params.data.id))
      .returning();

    if (!license) {
      res.status(404).json({ error: "License not found" });
      return;
    }
    res.json(license);
  } catch (err) {
    req.log.error({ err }, "Failed to update license");
    res.status(500).json({ error: "Failed to update license" });
  }
});

router.delete("/admin/licenses/:id", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid license id" });
    return;
  }
  try {
    await db.delete(tempLicensesTable).where(eq(tempLicensesTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete license");
    res.status(500).json({ error: "Failed to delete license" });
  }
});

router.get("/licenses/verify/:token", async (req: Request, res: Response) => {
  const params = TokenParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  try {
    const [license] = await db
      .select({
        id: tempLicensesTable.id,
        projectId: tempLicensesTable.projectId,
        projectName: projectsTable.name,
        granteeName: tempLicensesTable.granteeName,
        granteeEmail: tempLicensesTable.granteeEmail,
        expiresAt: tempLicensesTable.expiresAt,
        isActive: tempLicensesTable.isActive,
      })
      .from(tempLicensesTable)
      .leftJoin(projectsTable, eq(tempLicensesTable.projectId, projectsTable.id))
      .where(eq(tempLicensesTable.token, params.data.token));

    if (!license) {
      res.status(404).json({ error: "License not found", valid: false });
      return;
    }

    const now = new Date();
    if (!license.isActive || license.expiresAt < now) {
      res.status(403).json({
        error: "License expired or revoked",
        valid: false,
        expired: license.expiresAt < now,
        revoked: !license.isActive,
        expiresAt: license.expiresAt,
      });
      return;
    }

    res.json({
      valid: true,
      projectId: license.projectId,
      projectName: license.projectName,
      granteeName: license.granteeName,
      expiresAt: license.expiresAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to verify license");
    res.status(500).json({ error: "Failed to verify license" });
  }
});

router.post("/admin/licenses/:id/resend-invite", async (req: Request, res: Response) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid license id" });
    return;
  }

  try {
    const [license] = await db
      .select({
        id: tempLicensesTable.id,
        token: tempLicensesTable.token,
        granteeName: tempLicensesTable.granteeName,
        granteeEmail: tempLicensesTable.granteeEmail,
        expiresAt: tempLicensesTable.expiresAt,
        projectId: tempLicensesTable.projectId,
        isActive: tempLicensesTable.isActive,
      })
      .from(tempLicensesTable)
      .where(eq(tempLicensesTable.id, params.data.id));

    if (!license) {
      res.status(404).json({ error: "License not found" });
      return;
    }

    const [project] = await db
      .select({ name: projectsTable.name })
      .from(projectsTable)
      .where(eq(projectsTable.id, license.projectId));

    const domains = process.env.REPLIT_DOMAINS?.split(",") ?? [];
    const appUrl = domains[0]
      ? `https://${domains[0]}`
      : `http://localhost:${process.env.PORT}`;

    const sent = await sendLicenseInviteEmail({
      to: license.granteeEmail,
      granteeName: license.granteeName,
      projectName: project?.name ?? "Your Project",
      accessToken: license.token,
      expiresAt: license.expiresAt,
      appUrl,
    });

    if (sent) {
      await db
        .update(tempLicensesTable)
        .set({ inviteSentAt: new Date(), updatedAt: new Date() })
        .where(eq(tempLicensesTable.id, license.id));
    }

    res.json({ sent });
  } catch (err) {
    req.log.error({ err }, "Failed to resend invite");
    res.status(500).json({ error: "Failed to resend invite" });
  }
});

export default router;
