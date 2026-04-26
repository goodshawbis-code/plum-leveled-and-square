import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { segmentsTable } from "./segments";

export const rfisTable = pgTable("rfis", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  segmentId: integer("segment_id").references(() => segmentsTable.id, { onDelete: "set null" }),
  rfiNumber: integer("rfi_number").notNull().default(1),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  submittedBy: text("submitted_by").notNull().default("Foreman"),
  response: text("response"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
