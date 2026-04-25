import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  trialStartedAt: timestamp("trial_started_at").defaultNow().notNull(),
  trialEstimatesUsed: integer("trial_estimates_used").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
