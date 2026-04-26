import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { segmentsTable } from "./segments";
import { blueprintsTable } from "./blueprints";

export const siteCommentsTable = pgTable("site_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  segmentId: integer("segment_id").references(() => segmentsTable.id, { onDelete: "set null" }),
  blueprintId: integer("blueprint_id").references(() => blueprintsTable.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull().default("Foreman"),
  content: text("content").notNull(),
  pinType: text("pin_type").notNull().default("none"),
  blueprintX: real("blueprint_x"),
  blueprintY: real("blueprint_y"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  locationLabel: text("location_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
