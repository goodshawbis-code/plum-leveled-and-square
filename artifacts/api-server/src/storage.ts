import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export class Storage {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async getOrCreateUser(id: string) {
    const existing = await this.getUser(id);
    if (existing) return existing;
    const [created] = await db
      .insert(users)
      .values({ id, trialStartedAt: new Date(), trialEstimatesUsed: 0 })
      .returning();
    return created;
  }

  async incrementTrialEstimates(userId: string) {
    const [updated] = await db
      .update(users)
      .set({
        trialEstimatesUsed: sql`${users.trialEstimatesUsed} + 1`,
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserStripeInfo(
    userId: string,
    info: { stripeCustomerId?: string; stripeSubscriptionId?: string },
  ) {
    const [updated] = await db
      .update(users)
      .set(info)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`,
    );
    return result.rows[0] ?? null;
  }

  async listProductsWithPrices() {
    const result = await db.execute(sql`
      WITH paginated_products AS (
        SELECT id, name, description, metadata, active
        FROM stripe.products
        WHERE active = true
        ORDER BY created DESC
      )
      SELECT
        p.id            AS product_id,
        p.name          AS product_name,
        p.description   AS product_description,
        p.metadata      AS product_metadata,
        pr.id           AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active       AS price_active,
        pr.metadata     AS price_metadata
      FROM paginated_products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      ORDER BY p.name, pr.unit_amount
    `);
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`,
    );
    return result.rows[0] ?? null;
  }
}

export const storage = new Storage();
