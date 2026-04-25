import { getUncachableStripeClient } from "./stripeClient";

const PLANS = [
  {
    name: "Founders Lifetime",
    description:
      "Lifetime access for founding members — pay once, use forever. Limited time offer.",
    metadata: { tier: "founders", billing: "lifetime" },
    price: {
      unitAmount: 34900,
      currency: "usd",
      mode: "payment" as const,
    },
  },
  {
    name: "Monthly",
    description: "Full access billed monthly. Cancel any time.",
    metadata: { tier: "monthly", billing: "monthly" },
    price: {
      unitAmount: 4900,
      currency: "usd",
      recurring: { interval: "month" as const },
    },
  },
  {
    name: "Quarterly",
    description: "Full access billed every 3 months — save ~12% vs monthly.",
    metadata: { tier: "quarterly", billing: "quarterly" },
    price: {
      unitAmount: 12900,
      currency: "usd",
      recurring: { interval: "month" as const, interval_count: 3 },
    },
  },
  {
    name: "Yearly",
    description: "Full access billed annually — save ~24% vs monthly.",
    metadata: { tier: "yearly", billing: "yearly" },
    price: {
      unitAmount: 44900,
      currency: "usd",
      recurring: { interval: "year" as const },
    },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding Stripe products for plumb level and Squared...\n");

  for (const plan of PLANS) {
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`  [skip] "${plan.name}" already exists`);
      continue;
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    const priceData: any = {
      product: product.id,
      unit_amount: plan.price.unitAmount,
      currency: plan.price.currency,
    };
    if (plan.price.recurring) {
      priceData.recurring = plan.price.recurring;
    }

    const price = await stripe.prices.create(priceData);

    const billing = plan.price.recurring
      ? `$${(plan.price.unitAmount / 100).toFixed(2)} recurring`
      : `$${(plan.price.unitAmount / 100).toFixed(2)} one-time`;
    console.log(
      `  [ok]   "${plan.name}" — ${billing} (product: ${product.id}, price: ${price.id})`,
    );
  }

  console.log("\nDone. Webhooks will sync data to your database shortly.");
}

seedProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
