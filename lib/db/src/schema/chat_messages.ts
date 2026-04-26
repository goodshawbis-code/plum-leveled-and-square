import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  projectName: text("project_name"),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  photoUrl: text("photo_url"),
  isSystemReply: boolean("is_system_reply").notNull().default(false),
  safetyFlag: boolean("safety_flag").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
