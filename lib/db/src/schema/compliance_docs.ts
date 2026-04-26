import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const complianceDocsTable = pgTable("compliance_docs", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull().default("application/pdf"),
  originalName: text("original_name"),
  uploadedBy: text("uploaded_by").notNull().default("Admin"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: text("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
