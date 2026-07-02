import Stripe from "stripe";

function getStripeCredentials(): { secretKey: string; publishableKey: string } {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is required. Set it in your Render environment.",
    );
  }

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? "";

  return { secretKey, publishableKey };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = getStripeCredentials();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = getStripeCredentials();
  return publishableKey;
}
