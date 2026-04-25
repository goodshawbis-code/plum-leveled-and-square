import { Router, type IRouter } from "express";
import { storage } from "../storage";
import { stripeService } from "../stripeService";
import { requireUser, trialStatus, isTrialExpired } from "../middlewares/trial";
import { getStripePublishableKey } from "../stripeClient";

const router: IRouter = Router();

router.get("/stripe/config", async (_req, res) => {
  const publishableKey = await getStripePublishableKey();
  res.json({ publishableKey });
});

router.get("/stripe/plans", async (_req, res) => {
  try {
    const rows = await storage.listProductsWithPrices();

    const productsMap = new Map<string, any>();
    for (const row of rows) {
      if (!productsMap.has(row.product_id as string)) {
        productsMap.set(row.product_id as string, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata ?? {},
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id as string).prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
          metadata: row.price_metadata ?? {},
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stripe/trial", requireUser, async (req: any, res) => {
  const status = trialStatus(req.appUser);
  res.json(status);
});

router.post("/stripe/checkout", requireUser, async (req: any, res) => {
  try {
    const { priceId, mode } = req.body as {
      priceId: string;
      mode?: "subscription" | "payment";
    };
    if (!priceId) return res.status(400).json({ error: "priceId is required" });

    let customerId = req.appUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(
        req.appUser.email ?? `user-${req.appUser.id}@plumb-level.app`,
        req.appUser.id,
      );
      await storage.updateUserStripeInfo(req.appUser.id, {
        stripeCustomerId: customer.id,
      });
      customerId = customer.id;
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const successUrl = `${host}/subscribe?success=1`;
    const cancelUrl = `${host}/subscribe?canceled=1`;

    let session;
    if (mode === "payment") {
      session = await stripeService.createOneTimeCheckoutSession(
        customerId,
        priceId,
        successUrl,
        cancelUrl,
      );
    } else {
      session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        successUrl,
        cancelUrl,
      );
    }

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/stripe/portal", requireUser, async (req: any, res) => {
  try {
    const customerId = req.appUser.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ error: "No Stripe customer found" });
    }
    const host = `${req.protocol}://${req.get("host")}`;
    const session = await stripeService.createPortalSession(
      customerId,
      `${host}/subscribe`,
    );
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stripe/subscription", requireUser, async (req: any, res) => {
  try {
    const user = req.appUser;
    if (!user.stripeSubscriptionId) {
      return res.json({ subscription: null, trialStatus: trialStatus(user) });
    }
    const subscription = await storage.getSubscription(
      user.stripeSubscriptionId,
    );
    res.json({ subscription, trialStatus: trialStatus(user) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
