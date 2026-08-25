"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { LockGate } from "@/components/lock-gate";
import { isItemType } from "@/lib/types";

function NewItemInner() {
  const router = useRouter();
  const params = useSearchParams();
  const typeParam = params.get("type") ?? "login";
  const type = isItemType(typeParam) ? typeParam : "login";

  useEffect(() => {
    router.replace(`/vault?mode=new&type=${type}`);
  }, [router, type]);

  return <div className="p-6 text-sm text-[var(--muted)]">Abriendo formulario…</div>;
}

export default function NewItemPage() {
  return (
    <LockGate>
      <Suspense fallback={<div className="p-6 text-sm text-[var(--muted)]">Cargando…</div>}>
        <NewItemInner />
      </Suspense>
    </LockGate>
  );
}
