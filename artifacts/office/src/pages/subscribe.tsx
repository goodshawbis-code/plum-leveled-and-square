import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import {
  Check,
  Star,
  Zap,
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserId } from "@/lib/userId";
import { useTrialStatus } from "@/lib/useTrialStatus";

const BASE = import.meta.env.BASE_URL;

interface Price {
  id: string;
  unitAmount: number;
  currency: string;
  recurring: { interval: string; interval_count?: number } | null;
  metadata: Record<string, string>;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: Price[];
}

async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(`${BASE}api/stripe/plans`);
  if (!res.ok) throw new Error("Failed to load plans");
  const json = await res.json();
  return json.data ?? [];
}

async function startCheckout(priceId: string, mode: "subscription" | "payment") {
  const res = await fetch(`${BASE}api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": getUserId(),
    },
    body: JSON.stringify({ priceId, mode }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Checkout failed");
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
}

const TIER_ORDER = ["founders", "monthly", "quarterly", "yearly"];
const TIER_ICONS: Record<string, typeof Star> = {
  founders: Star,
  monthly: Zap,
  quarterly: Calendar,
  yearly: Clock,
};
const TIER_COLOR: Record<string, string> = {
  founders: "amber",
  monthly: "blue",
  quarterly: "violet",
  yearly: "emerald",
};

const FEATURES = [
  "Unlimited blueprints & project segments",
  "Vendor bid comparison engine",
  "Field photo capture & completion tracking",
  "Offline-capable mobile field app",
  "CSV & print estimate export",
  "Founding Member community access",
];

export default function Subscribe() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const success = params.get("success") === "1";
  const canceled = params.get("canceled") === "1";

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["stripe-plans"],
    queryFn: fetchPlans,
  });
  const { data: trial } = useTrialStatus();

  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);

  const sortedPlans = [...plans].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a.metadata?.tier ?? "");
    const bi = TIER_ORDER.indexOf(b.metadata?.tier ?? "");
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  async function handleSubscribe(plan: Plan) {
    const price = plan.prices[0];
    if (!price) return;
    const mode =
      plan.metadata?.billing === "lifetime" ? "payment" : "subscription";
    setLoadingPrice(price.id);
    try {
      await startCheckout(price.id, mode);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingPrice(null);
    }
  }

  function formatPrice(plan: Plan) {
    const price = plan.prices[0];
    if (!price) return "—";
    const dollars = (price.unitAmount / 100).toFixed(0);
    if (!price.recurring) return `$${dollars} one-time`;
    const interval = price.recurring.interval;
    const count = price.recurring.interval_count ?? 1;
    if (count === 3 && interval === "month") return `$${dollars} / quarter`;
    return `$${dollars} / ${interval}`;
  }

  function getSavings(plan: Plan) {
    const tier = plan.metadata?.tier;
    if (tier === "quarterly") return "Save ~12%";
    if (tier === "yearly") return "Save ~24%";
    if (tier === "founders") return "Limited time";
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
        </Link>
      </div>

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-800 font-medium">
          Payment successful — welcome aboard! Your access is now active.
        </div>
      )}
      {canceled && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-5 py-4 text-amber-800">
          Checkout canceled. Your plan has not changed.
        </div>
      )}

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-stone-900">
          Choose your plan
        </h1>
        <p className="text-stone-500 max-w-xl mx-auto">
          plumb level and Squared — professional construction estimating for GCs
          and field crews.
        </p>
        {trial && !trial.hasSubscription && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-sm text-amber-800 mt-2">
            {trial.trialExpired ? (
              <>Your free trial has ended — subscribe to continue</>
            ) : (
              <>
                Free trial: {trial.daysRemaining}d remaining ·{" "}
                {trial.estimatesRemaining} estimate
                {trial.estimatesRemaining !== 1 ? "s" : ""} left
              </>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="text-center py-20 text-stone-500">
          <p className="text-lg font-medium">Plans loading…</p>
          <p className="text-sm mt-1">
            If this persists, the Stripe seed script may need to be run. Check
            the server logs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedPlans.map((plan) => {
            const tier = plan.metadata?.tier ?? "monthly";
            const color = TIER_COLOR[tier] ?? "blue";
            const Icon = TIER_ICONS[tier] ?? Zap;
            const savings = getSavings(plan);
            const isFounders = tier === "founders";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${isFounders ? "ring-2 ring-amber-400 shadow-amber-100 shadow-lg" : ""}`}
              >
                {isFounders && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-400 text-amber-900 text-xs font-bold px-3">
                      FOUNDING MEMBER
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-6">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                      color === "amber"
                        ? "bg-amber-100 text-amber-600"
                        : color === "blue"
                          ? "bg-blue-100 text-blue-600"
                          : color === "violet"
                            ? "bg-violet-100 text-violet-600"
                            : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-xs leading-snug">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <span className="text-2xl font-bold text-stone-900">
                      {formatPrice(plan)}
                    </span>
                    {savings && (
                      <span className="ml-2 text-xs font-semibold text-emerald-600">
                        {savings}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-stone-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full ${
                      isFounders
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : ""
                    }`}
                    variant={isFounders ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPrice === plan.prices[0]?.id}
                  >
                    {loadingPrice === plan.prices[0]?.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFounders ? (
                      "Get Lifetime Access"
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <div className="rounded-xl bg-stone-50 border border-stone-200 p-5">
        <h3 className="font-semibold text-stone-800 mb-3">
          Free trial includes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-stone-600">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 text-stone-400 shrink-0" />
            <span>Up to 7 days of full access</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 text-stone-400 shrink-0" />
            <span>Up to 3 estimates</span>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 mt-0.5 text-stone-400 shrink-0" />
            <span>No credit card required to start</span>
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-3">
          Trial ends at whichever limit is reached first — time or estimate
          count.
        </p>
      </div>
    </div>
  );
}
