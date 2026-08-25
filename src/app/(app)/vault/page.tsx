"use client";

import { Suspense } from "react";
import { LockGate } from "@/components/lock-gate";
import { VaultHome } from "@/components/vault-home";

export default function VaultPage() {
  return (
    <LockGate>
      <Suspense fallback={<div className="p-6 text-sm text-[var(--muted)]">Cargando…</div>}>
        <VaultHome />
      </Suspense>
    </LockGate>
  );
}
