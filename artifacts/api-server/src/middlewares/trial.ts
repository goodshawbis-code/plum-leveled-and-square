import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

const TRIAL_DAYS = 7;
const TRIAL_ESTIMATE_LIMIT = 3;

export function isTrialExpired(user: {
  trialStartedAt: Date;
  trialEstimatesUsed: number;
  stripeSubscriptionId: string | null;
}): boolean {
  if (user.stripeSubscriptionId) return false;
  const msElapsed = Date.now() - new Date(user.trialStartedAt).getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  return daysElapsed >= TRIAL_DAYS || user.trialEstimatesUsed >= TRIAL_ESTIMATE_LIMIT;
}

export function trialStatus(user: {
  trialStartedAt: Date;
  trialEstimatesUsed: number;
  stripeSubscriptionId: string | null;
}) {
  const hasSubscription = !!user.stripeSubscriptionId;
  const msElapsed = Date.now() - new Date(user.trialStartedAt).getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysElapsed);
  const estimatesRemaining = Math.max(
    0,
    TRIAL_ESTIMATE_LIMIT - user.trialEstimatesUsed,
  );
  const expired = isTrialExpired(user);

  return {
    hasSubscription,
    isOnTrial: !hasSubscription && !expired,
    trialExpired: !hasSubscription && expired,
    daysRemaining: Math.floor(daysRemaining),
    estimatesUsed: user.trialEstimatesUsed,
    estimatesRemaining,
    estimateLimit: TRIAL_ESTIMATE_LIMIT,
    trialDays: TRIAL_DAYS,
  };
}

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    return res.status(400).json({ error: "X-User-ID header is required" });
  }
  (req as any).appUser = await storage.getOrCreateUser(userId);
  next();
}

export async function requireActiveAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    return res.status(400).json({ error: "X-User-ID header is required" });
  }
  const user = await storage.getOrCreateUser(userId);
  (req as any).appUser = user;

  if (isTrialExpired(user)) {
    return res.status(402).json({
      error: "trial_expired",
      message: "Your free trial has ended. Please subscribe to continue.",
    });
  }
  next();
}
