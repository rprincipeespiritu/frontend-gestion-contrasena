"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ItemForm } from "@/components/item-form";
import { LockGate } from "@/components/lock-gate";
import { isItemType } from "@/lib/types";

function NewItemInner() {
  const params = useSearchParams();
  const typeParam = params.get("type") ?? "login";
  const initialType = isItemType(typeParam) ? typeParam : "login";

  return (
    <div className="flex-1 p-6">
      <ItemForm initialType={initialType} />
    </div>
  );
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
