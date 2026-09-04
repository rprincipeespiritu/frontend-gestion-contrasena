export type PlanId = "free" | "trial" | "premium";

export type PlanStatus = {
  plan: PlanId;
  label: string;
  premium: boolean;
  trialDays: number;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  canStartTrial: boolean;
  checkoutEnabled: boolean;
  portalEnabled: boolean;
  limits: {
    items: number | null;
    masks: number;
  };
};

export const FREE_PLAN: PlanStatus = {
  plan: "free",
  label: "Plan gratuito",
  premium: false,
  trialDays: 14,
  trialEndsAt: null,
  planExpiresAt: null,
  canStartTrial: true,
  checkoutEnabled: false,
  portalEnabled: false,
  limits: { items: 50, masks: 1 },
};

export function formatPlanDate(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}
