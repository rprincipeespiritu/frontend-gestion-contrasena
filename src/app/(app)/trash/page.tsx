"use client";

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
  const { trashItems, restoreItem, destroyItem } = useVault();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Papelera</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Los elementos se pueden restaurar o eliminar de forma permanente.
      </p>
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
