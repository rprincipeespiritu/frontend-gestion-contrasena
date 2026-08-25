"use client";

import { useState } from "react";
import Link from "next/link";
import { LockGate } from "@/components/lock-gate";
import { useVault } from "@/components/vault-provider";
import { pwnedCount } from "@/lib/hibp";
import type { LoginData } from "@/lib/types";

export default function BreachesPage() {
  return (
    <LockGate>
      <BreachesInner />
    </LockGate>
  );
}

function BreachesInner() {
  const { items } = useVault();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<{ id: string; title: string; count: number }[]>([]);

  async function scan() {
    setBusy(true);
    setError(null);
    try {
      const found: { id: string; title: string; count: number }[] = [];
      for (const item of items.filter((entry) => entry.type === "login")) {
        const data = item.data as LoginData;
        const count = await pwnedCount(data.password);
        if (count > 0) found.push({ id: item.id, title: data.name || "Contraseña", count });
      }
      setHits(found);
    } catch {
      setError("No se pudo consultar el registro público de filtraciones.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Filtraciones</h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
        Se comprueba si tus contraseñas aparecen en filtraciones conocidas. Solo se envía un
        prefijo del hash SHA-1, nunca la contraseña.
      </p>
      <button
        type="button"
        onClick={() => void scan()}
        disabled={busy}
        className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Analizando…" : "Analizar bóveda"}
      </button>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {hits.length > 0 ? (
        <ul className="mt-6 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {hits.map((hit) => (
            <li key={hit.id}>
              <Link href={`/vault?item=${hit.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)]">
                <span>{hit.title}</span>
                <span className="text-xs text-[var(--danger)]">Vista {hit.count.toLocaleString("es")} veces</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {!busy && hits.length === 0 && !error ? (
        <p className="mt-6 text-sm text-[var(--muted)]">Aún no hay resultados.</p>
      ) : null}
    </div>
  );
}
