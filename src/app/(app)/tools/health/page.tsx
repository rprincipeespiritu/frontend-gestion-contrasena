"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LockGate } from "@/components/lock-gate";
import { useVault } from "@/components/vault-provider";
import { analyzePasswordHealth } from "@/lib/password-health";

export default function HealthPage() {
  return (
    <LockGate>
      <HealthInner />
    </LockGate>
  );
}

function HealthInner() {
  const { items } = useVault();
  const issues = useMemo(() => analyzePasswordHealth(items), [items]);
  const [filter, setFilter] = useState<"all" | "weak" | "reused" | "old">("all");
  const visible = issues.filter((issue) => filter === "all" || issue.reason === filter);
  const label = { weak: "Débil", reused: "Reutilizada", old: "Antigua" };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Salud de contraseñas</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        El análisis se hace en el navegador, sobre los datos ya descifrados.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "weak", "reused", "old"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === id ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] ring-1 ring-[var(--border)]"
            }`}
          >
            {id === "all" ? `Todas (${issues.length})` : `${label[id]} (${issues.filter((i) => i.reason === id).length})`}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">No hay avisos con este filtro.</p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {visible.map((issue) => (
            <li key={`${issue.id}-${issue.reason}`}>
              <Link href={`/vault?item=${issue.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)]">
                <span>{issue.title}</span>
                <span className="text-xs text-[var(--danger)]">{label[issue.reason]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
