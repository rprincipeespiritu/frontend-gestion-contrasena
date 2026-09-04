"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VaultProvider } from "@/components/vault-provider";
import { AppShell } from "@/components/app-shell";
import { ApiError, api, getToken } from "@/lib/api";
import type { UnlockPayload } from "@/lib/types";
import { FREE_PLAN, type PlanStatus } from "@/lib/plan";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PlanStatus>(FREE_PLAN);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<UnlockPayload>("/api/auth/me")
      .then((payload) => {
        setEmail(payload.user.email);
        setAvatarUrl(payload.user.avatarUrl ?? null);
        if (payload.subscription) setSubscription(payload.subscription);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudo conectar con la API en http://localhost:4000");
      });
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--danger)]">
        {error}
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
        Conectando con la API…
      </div>
    );
  }

  return (
    <VaultProvider email={email} initialAvatarUrl={avatarUrl} initialSubscription={subscription}>
      <AppShell>{children}</AppShell>
    </VaultProvider>
  );
}
