import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";

/** Bind the pre-start disclosure to the exact private form without exposing its contents. */
export function preparationKey(form: {
  id: string;
  status: string;
  calibrated?: boolean;
  definition: unknown;
}): string {
  return createHash("sha256")
    .update(JSON.stringify([form.id, form.status, form.calibrated === true, form.definition]))
    .digest("hex");
}

export function preparationMinutes(definition: unknown, targeted: boolean): number | null {
  // A full-form estimate cannot stand in for a filtered supporting check.
  if (targeted || !definition || typeof definition !== "object") return null;
  const value = (definition as { estimatedMinutes?: unknown }).estimatedMinutes;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
