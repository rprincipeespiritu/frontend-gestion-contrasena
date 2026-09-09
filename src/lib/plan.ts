export type PlanId = "free" | "trial" | "premium";

/** Duración del plan de prueba. Debe coincidir con TRIAL_DAYS del backend. */
export const TRIAL_DAYS = 30;

export type PlanStatus = {
  plan: PlanId;
  label: string;
  premium: boolean;
  trialDays: number;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  priceLabel: string;
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
  trialDays: TRIAL_DAYS,
  trialEndsAt: null,
  planExpiresAt: null,
  priceLabel: "US$ 3,99 / mes",
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
