import { useQuery } from "@tanstack/react-query";
import { getUserId } from "./userId";

const BASE = import.meta.env.BASE_URL;

export interface TrialStatus {
  hasSubscription: boolean;
  isOnTrial: boolean;
  trialExpired: boolean;
  daysRemaining: number;
  estimatesUsed: number;
  estimatesRemaining: number;
  estimateLimit: number;
  trialDays: number;
}

async function fetchTrialStatus(): Promise<TrialStatus> {
  const res = await fetch(`${BASE}api/stripe/trial`, {
    headers: { "X-User-ID": getUserId() },
  });
  if (!res.ok) throw new Error("Failed to fetch trial status");
  return res.json();
}

export function useTrialStatus() {
  return useQuery<TrialStatus>({
    queryKey: ["trialStatus"],
    queryFn: fetchTrialStatus,
    staleTime: 30_000,
  });
}
