"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { prepareRegister } from "@/lib/crypto";
import { rememberVaultKey } from "@/components/vault-provider";

const field =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      setError("La contraseña maestra debe tener al menos 10 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareRegister(email, password);
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: prepared.email,
          authHash: prepared.authHash,
          kdfSalt: prepared.kdfSalt,
          kdfIterations: prepared.kdfIterations,
          protectedVaultKey: prepared.protectedVaultKey,
        }),
      });
      rememberVaultKey(prepared.vaultKey);
      router.push("/vault");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <h1 className="text-lg font-semibold">Crear cuenta</h1>
      <p className="text-xs leading-5 text-[var(--muted)]">
        La contraseña maestra nunca sale de este navegador. Si la olvidas, no hay forma de
        recuperar la bóveda. Te enviaremos un correo de bienvenida a tu email.
      </p>
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
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className="block text-sm">
        Confirmar contraseña
        <input
          className={field}
          type="password"
          required
          minLength={10}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
      >
        {busy ? "Cifrando bóveda…" : "Crear bóveda"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[var(--accent)]">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
