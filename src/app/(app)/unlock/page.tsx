"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/components/vault-provider";

const field =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

export default function UnlockPage() {
  const router = useRouter();
  const { locked, busy, error, unlockWithPassword, logout } = useVault();
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!locked) router.replace("/vault");
  }, [locked, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await unlockWithPassword(password);
      router.replace("/vault");
    } catch {
      // Error is shown from provider state.
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8"
      >
        <h1 className="text-lg font-semibold">Bóveda bloqueada</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Introduce tu contraseña maestra para descifrar los datos en este dispositivo.
        </p>
        <label className="mt-5 block text-sm">
          Contraseña maestra
          <input
            className={field}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {busy ? "Derivando clave…" : "Desbloquear"}
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 w-full rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--muted)]"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
