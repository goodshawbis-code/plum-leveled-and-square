import { Link } from "wouter";
import { AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/lib/useTrialStatus";

export function TrialBanner() {
  const { data: trial } = useTrialStatus();

  if (!trial || trial.hasSubscription) return null;

  if (trial.trialExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            Your free trial has ended. Subscribe to keep creating estimates.
          </span>
        </div>
        <Link href="/subscribe">
          <Button
            size="sm"
            className="bg-white text-red-700 hover:bg-red-50 shrink-0"
          >
            Subscribe now
          </Button>
        </Link>
      </div>
    );
  }

  const lowEstimates = trial.estimatesRemaining <= 1;
  const lowTime = trial.daysRemaining <= 1;
  const isUrgent = lowEstimates || lowTime;

  if (!isUrgent) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 shrink-0" />
        <span>
          Free trial:{" "}
          <strong>
            {trial.daysRemaining}d remaining · {trial.estimatesRemaining}{" "}
            estimate{trial.estimatesRemaining !== 1 ? "s" : ""} left
          </strong>
        </span>
      </div>
      <Link href="/subscribe">
        <Button
          size="sm"
          className="bg-white text-amber-700 hover:bg-amber-50 shrink-0"
        >
          View plans
        </Button>
      </Link>
    </div>
  );
}
