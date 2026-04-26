import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const tempLicensesTable = pgTable("temp_licenses", {
  id: serial("id").primaryKey(),
  token: text("token").unique().notNull(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  granteeName: text("grantee_name").notNull(),
  granteeEmail: text("grantee_email").notNull(),
  createdBy: text("created_by").notNull().default("admin"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  warningSentAt: timestamp("warning_sent_at", { withTimezone: true }),
  inviteSentAt: timestamp("invite_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
