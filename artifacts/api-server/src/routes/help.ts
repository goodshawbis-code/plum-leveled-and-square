import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and, ilike } from "drizzle-orm";
import { db, helpArticlesTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const CATEGORIES = ["Estimating", "Safety", "Admin", "Client Access", "General"] as const;
const ROLES = ["all", "gc", "foreman"] as const;

const ArticleBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(CATEGORIES).default("General"),
  roleAccess: z.enum(ROLES).default("all"),
  slug: z.string().optional().nullable(),
  isPublished: z.boolean().optional().default(false),
});

const UpdateArticleBody = ArticleBody.partial();

router.get("/help-articles", async (req: Request, res: Response) => {
  try {
    const { category, role, published, q } = req.query as Record<string, string>;
    const conditions = [];
    if (category) conditions.push(eq(helpArticlesTable.category, category));
    if (role) conditions.push(eq(helpArticlesTable.roleAccess, role));
    if (published === "true") conditions.push(eq(helpArticlesTable.isPublished, true));
    const articles = await db
      .select()
      .from(helpArticlesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(helpArticlesTable.updatedAt));
    const filtered = q
      ? articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q.toLowerCase()) ||
            a.content.toLowerCase().includes(q.toLowerCase())
        )
      : articles;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch help articles" });
  }
});

router.get("/help-articles/slug/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const [article] = await db
      .select()
      .from(helpArticlesTable)
      .where(and(eq(helpArticlesTable.slug, slug), eq(helpArticlesTable.isPublished, true)));
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

router.get("/help-articles/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [article] = await db
      .select()
      .from(helpArticlesTable)
      .where(eq(helpArticlesTable.id, id));
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

router.post("/help-articles", async (req: Request, res: Response) => {
  try {
    const body = ArticleBody.parse(req.body);
    const [article] = await db
      .insert(helpArticlesTable)
      .values({
        title: body.title,
        content: body.content,
        category: body.category,
        roleAccess: body.roleAccess,
        slug: body.slug ?? null,
        isPublished: body.isPublished,
      })
      .returning();
    res.status(201).json(article);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to create article" });
  }
});

router.patch("/help-articles/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateArticleBody.parse(req.body);
    const [updated] = await db
      .update(helpArticlesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(helpArticlesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Article not found" });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to update article" });
  }
});

router.delete("/help-articles/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(helpArticlesTable).where(eq(helpArticlesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete article" });
  }
});

export default router;
