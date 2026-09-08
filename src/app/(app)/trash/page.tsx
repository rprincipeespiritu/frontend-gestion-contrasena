"use client";

import { useState } from "react";
import { LockGate } from "@/components/lock-gate";
import { useVault } from "@/components/vault-provider";
import { itemSubtitle, itemTitle } from "@/lib/types";

export default function TrashPage() {
  return (
    <LockGate>
      <TrashInner />
    </LockGate>
  );
}

function TrashInner() {
  const { trashItems, restoreItem, destroyItem, emptyTrash } = useVault();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onEmpty() {
    if (trashItems.length === 0) return;
    if (
      !confirm(
        `¿Vaciar la papelera? Se eliminarán ${trashItems.length} elemento${
          trashItems.length === 1 ? "" : "s"
        } de forma permanente. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await emptyTrash();
    } catch {
      try {
        for (const item of [...trashItems]) {
          await destroyItem(item.id);
        }
      } catch {
        setError("No se pudo vaciar la papelera. Inténtalo de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Papelera</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Los elementos se pueden restaurar o eliminar de forma permanente.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || trashItems.length === 0}
          onClick={() => void onEmpty()}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Vaciando…" : "Vaciar papelera"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {trashItems.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">La papelera está vacía.</p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {trashItems.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{itemTitle(item)}</div>
                <div className="truncate text-xs text-[var(--muted)]">{itemSubtitle(item)}</div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs"
                onClick={() => void restoreItem(item.id)}
              >
                Restaurar
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--danger)] px-3 py-1.5 text-xs text-[var(--danger)]"
                onClick={() => {
                  if (confirm("¿Eliminar de forma permanente?")) void destroyItem(item.id);
                }}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
