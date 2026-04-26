import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const safetyTopicsTable = pgTable("safety_topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  weekOf: text("week_of").notNull(),
  createdBy: text("created_by").notNull().default("Admin"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const safetyTopicAcknowledgmentsTable = pgTable("safety_topic_acknowledgments", {
  id: serial("id").primaryKey(),
  safetyTopicId: integer("safety_topic_id").notNull().references(() => safetyTopicsTable.id, { onDelete: "cascade" }),
  foremanName: text("foreman_name").notNull(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  discussedAt: timestamp("discussed_at").notNull().defaultNow(),
});

export const dailyJhaCheckinsTable = pgTable("daily_jha_checkins", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  foremanName: text("foreman_name").notNull(),
  checkDate: text("check_date").notNull(),
  scaffoldingStable: boolean("scaffolding_stable").notNull().default(false),
  ppeVerified: boolean("ppe_verified").notNull().default(false),
  trenchSafe: boolean("trench_safe").notNull().default(false),
  hazardsReviewed: boolean("hazards_reviewed").notNull().default(false),
  firstAidAccessible: boolean("first_aid_accessible").notNull().default(false),
  emergencyContactsPosted: boolean("emergency_contacts_posted").notNull().default(false),
  notes: text("notes"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});
