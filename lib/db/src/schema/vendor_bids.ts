import { pgTable, serial, timestamp, integer, real, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { segmentsTable } from "./segments";
import { materialsTable } from "./materials";
import { vendorsTable } from "./vendors";

export const vendorBidsTable = pgTable("vendor_bids", {
  id: serial("id").primaryKey(),
  segmentId: integer("segment_id").notNull().references(() => segmentsTable.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materialsTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  unitPrice: real("unit_price").notNull().default(0),
  quantity: real("quantity").notNull().default(1),
  notes: text("notes").notNull().default(""),
  isSelected: boolean("is_selected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVendorBidSchema = createInsertSchema(vendorBidsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendorBid = z.infer<typeof insertVendorBidSchema>;
export type VendorBid = typeof vendorBidsTable.$inferSelect;
