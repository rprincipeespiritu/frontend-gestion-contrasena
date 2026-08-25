"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ItemForm } from "@/components/item-form";
import { LockGate } from "@/components/lock-gate";
import { useVault } from "@/components/vault-provider";

function EditItemInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { items, locked } = useVault();
  const item = items.find((entry) => entry.id === id);

  useEffect(() => {
    if (!locked && id && !item) {
      router.replace("/vault");
    }
  }, [id, item, locked, router]);

  if (!item) {
    return <div className="p-6 text-sm text-[var(--muted)]">Cargando ítem…</div>;
  }

  return (
    <div className="flex-1 p-6">
      <ItemForm item={item} />
    </div>
  );
}

export default function EditItemPage() {
  return (
    <LockGate>
      <EditItemInner />
    </LockGate>
  );
}
