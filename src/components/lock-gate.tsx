"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/vault-provider";

export function LockGate({ children }: { children: React.ReactNode }) {
  const { locked } = useVault();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (locked) {
      router.replace("/unlock");
      return;
    }
    setReady(true);
  }, [locked, router]);

  if (locked || !ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
        Comprobando bóveda…
      </div>
    );
  }

  return <>{children}</>;
}
