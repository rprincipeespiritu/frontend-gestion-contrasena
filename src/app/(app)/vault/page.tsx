"use client";

import { LockGate } from "@/components/lock-gate";
import { VaultShell } from "@/components/vault-shell";

export default function VaultPage() {
  return (
    <LockGate>
      <VaultShell />
    </LockGate>
  );
}
