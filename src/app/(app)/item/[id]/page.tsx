"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LockGate } from "@/components/lock-gate";

function EditItemInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) router.replace(`/vault?item=${encodeURIComponent(id)}`);
  }, [id, router]);

  return <div className="p-6 text-sm text-[var(--muted)]">Abriendo ítem…</div>;
}

export default function EditItemPage() {
  return (
    <LockGate>
      <EditItemInner />
    </LockGate>
  );
}
