"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  authHashFromMaterial,
  deriveMasterMaterial,
  masterKeyFromMaterial,
  unprotectVaultKey,
} from "@/lib/crypto";
import { rememberVaultKey } from "@/components/vault-provider";
import type { UnlockPayload } from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const pre = await api<{ kdfSalt: string; kdfIterations: number }>("/api/auth/prelogin", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const material = await deriveMasterMaterial(password, pre.kdfSalt, pre.kdfIterations);
      const authHash = await authHashFromMaterial(material);
      const payload = await api<UnlockPayload>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, authHash }),
      });
      const masterKey = await masterKeyFromMaterial(material);
      const vaultKey = await unprotectVaultKey(payload.protectedVaultKey, masterKey);
      rememberVaultKey(vaultKey);
      router.push("/vault");
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión. Revisa el email y la contraseña maestra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <h1 className="text-lg font-semibold">Iniciar sesión</h1>
      <label className="block text-sm">
        Email
        <input
          className={field}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </label>
      <label className="block text-sm">
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
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
      >
        {busy ? "Desbloqueando bóveda…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-[var(--accent)]">
          Crear una
        </Link>
      </p>
    </form>
  );
}
