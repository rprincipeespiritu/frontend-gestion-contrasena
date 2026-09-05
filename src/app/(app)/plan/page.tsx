"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LockGate } from "@/components/lock-gate";
import { ApiError, api } from "@/lib/api";
import { FREE_PLAN, formatPlanDate, type PlanStatus } from "@/lib/plan";
import { useVault } from "@/components/vault-provider";

export default function PlanPage() {
  return (
    <LockGate>
      <Suspense fallback={<div className="p-6 text-sm text-[var(--muted)]">Cargando plan…</div>}>
        <PlanInner />
      </Suspense>
    </LockGate>
  );
}

function PlanInner() {
  const { subscription, setSubscription } = useVault();
  const params = useSearchParams();
  const [busy, setBusy] = useState<"trial" | "checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const checkout = params.get("checkout");
    if (checkout === "success") setNotice("Pago recibido. Si el plan no cambia al instante, recarga en unos segundos.");
    if (checkout === "cancel") setNotice("El pago se canceló. Puedes intentarlo de nuevo cuando quieras.");
    void api<PlanStatus>("/api/billing/me")
      .then(setSubscription)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "No se pudo cargar el plan");
      });
  }, [params, setSubscription]);

  const plan = subscription ?? FREE_PLAN;
  const trialUntil = formatPlanDate(plan.trialEndsAt);
  const premiumUntil = formatPlanDate(plan.planExpiresAt);

  async function startTrial() {
    setBusy("trial");
    setError(null);
    try {
      const next = await api<PlanStatus>("/api/billing/trial", { method: "POST" });
      setSubscription(next);
      setNotice("Plan de prueba activado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo activar la prueba");
    } finally {
      setBusy(null);
    }
  }

  async function checkout() {
    setBusy("checkout");
    setError(null);
    try {
      const data = await api<{ url: string }>("/api/billing/checkout", { method: "POST" });
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir el pago");
      setBusy(null);
    }
  }

  async function portal() {
    setBusy("portal");
    setError(null);
    try {
      const data = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir la suscripción");
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan y suscripción</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Activa la prueba, pasa a Premium o gestiona el cobro mensual.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Plan actual</div>
        <div className="mt-1 text-xl font-semibold">{plan.label}</div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {plan.plan === "premium"
            ? premiumUntil
              ? `Premium activo hasta el ${premiumUntil}.`
              : "Premium activo."
            : plan.plan === "trial"
              ? trialUntil
                ? `Prueba Premium hasta el ${trialUntil}.`
                : "Prueba Premium activa."
              : `Hasta ${plan.limits.items ?? 50} elementos y ${plan.limits.masks} máscara de email.`}
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Plan de prueba</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {plan.trialDays} días con límites de Premium. Solo se puede activar una vez por cuenta.
          </p>
          {plan.canStartTrial ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void startTrial()}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy === "trial" ? "Activando…" : "Activar prueba"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {plan.plan === "trial" ? "La prueba ya está activa." : "Esta cuenta ya usó el plan de prueba."}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--accent)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Premium</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Bóveda sin el tope gratuito y hasta 100 máscaras. {plan.priceLabel ?? "US$ 3,99 / mes"} con Paddle.
          </p>
          {plan.portalEnabled ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void portal()}
              className="mt-4 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {busy === "portal" ? "Abriendo…" : "Gestionar suscripción"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy !== null || plan.plan === "premium"}
              onClick={() => void checkout()}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy === "checkout" ? "Redirigiendo…" : plan.plan === "premium" ? "Ya eres Premium" : "Suscribirme a Premium"}
            </button>
          )}
          {!plan.checkoutEnabled && plan.plan !== "premium" ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              El cobro se habilita cuando Paddle esté configurado en el backend. La prueba funciona igual.
            </p>
          ) : null}
        </section>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {notice ? <p className="text-sm text-[var(--accent)]">{notice}</p> : null}

      <p className="text-sm text-[var(--muted)]">
        También puedes revisar el bloqueo automático en{" "}
        <Link href="/settings" className="text-[var(--accent)]">
          Ajustes
        </Link>
        .
      </p>
    </div>
  );
}
