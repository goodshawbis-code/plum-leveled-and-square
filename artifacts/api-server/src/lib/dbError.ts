export function pgConstraintMessage(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;
  const code = (e["cause"] as Record<string, unknown> | undefined)?.["code"] ?? e["code"];
  if (code === "23503") return "Referenced resource does not exist";
  if (code === "23502") return "A required field is missing";
  if (code === "23505") return "A record with this value already exists";
  return null;
}
