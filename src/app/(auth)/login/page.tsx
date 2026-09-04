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
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const pre = await api<{
        kdfSalt: string;
        kdfIterations: number;
        hasRecovery?: boolean;
        recoverySalt?: string | null;
        recoveryIterations?: number | null;
      }>("/api/auth/prelogin", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const salt = useRecovery ? pre.recoverySalt : pre.kdfSalt;
      const iterations = useRecovery ? pre.recoveryIterations : pre.kdfIterations;
      if (!salt || !iterations) {
        throw new Error("missing-kdf");
      }
      const material = await deriveMasterMaterial(password, salt, iterations);
      const authHash = await authHashFromMaterial(material);
      const payload = await api<UnlockPayload>(
        useRecovery ? "/api/auth/login-recovery" : "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, authHash }),
        },
      );
      const masterKey = await masterKeyFromMaterial(material);
      const vaultKey = await unprotectVaultKey(payload.protectedVaultKey, masterKey);
      rememberVaultKey(vaultKey);
      router.push("/vault");
      router.refresh();
    } catch {
      setError(
        useRecovery
          ? "No se pudo entrar con el código de recuperación."
          : "No se pudo iniciar sesión. Revisa el email y la contraseña maestra.",
      );
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
        {useRecovery ? "Código de recuperación" : "Contraseña maestra"}
        <input
          className={field}
          type={useRecovery ? "text" : "password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={useRecovery ? "off" : "current-password"}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={useRecovery}
          onChange={(e) => setUseRecovery(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        Usar código de recuperación
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Desbloqueando bóveda…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        ¿No tienes cuenta?{" "}
        <Link href="/register?trial=1" className="text-[var(--accent)]">
          Crear una
        </Link>
      </p>
      <p className="text-center text-xs text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--foreground)]">
          Volver al inicio
        </Link>
      </p>
    </form>
  );
}
