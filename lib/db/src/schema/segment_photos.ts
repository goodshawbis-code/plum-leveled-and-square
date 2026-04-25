import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { segmentsTable } from "./segments";

export const segmentPhotosTable = pgTable("segment_photos", {
  id: serial("id").primaryKey(),
  segmentId: integer("segment_id").notNull().references(() => segmentsTable.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSegmentPhotoSchema = createInsertSchema(segmentPhotosTable).omit({ id: true, createdAt: true });
export type InsertSegmentPhoto = z.infer<typeof insertSegmentPhotoSchema>;
export type SegmentPhoto = typeof segmentPhotosTable.$inferSelect;
