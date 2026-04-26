import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const helpArticlesTable = pgTable("help_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("General"),
  roleAccess: text("role_access").notNull().default("all"),
  slug: text("slug").unique(),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
