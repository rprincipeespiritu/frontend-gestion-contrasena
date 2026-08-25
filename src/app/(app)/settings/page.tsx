"use client";

import { useState } from "react";
import { LockGate } from "@/components/lock-gate";
import { useVault } from "@/components/vault-provider";
import { api } from "@/lib/api";
import { getLockMinutes, setLockMinutes } from "@/lib/autolock";
import {
  authHashFromMaterial,
  deriveMasterMaterial,
  generateRecoveryCode,
  generateSalt,
  KDF_ITERATIONS,
  masterKeyFromMaterial,
  protectVaultKey,
} from "@/lib/crypto";

export default function SettingsPage() {
  return (
    <LockGate>
      <SettingsInner />
    </LockGate>
  );
}

function SettingsInner() {
  const { getVaultKey } = useVault();
  const [minutes, setMinutes] = useState(getLockMinutes);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function saveLock(value: number) {
    setMinutes(value);
    setLockMinutes(value);
  }

  async function createRecovery() {
    const vaultKey = getVaultKey();
    if (!vaultKey) return;
    setBusy(true);
    setError(null);
    try {
      const recoveryCode = generateRecoveryCode();
      const recoverySalt = generateSalt();
      const material = await deriveMasterMaterial(recoveryCode, recoverySalt, KDF_ITERATIONS);
      const recoveryKey = await masterKeyFromMaterial(material);
      const recoveryBlob = await protectVaultKey(vaultKey, recoveryKey);
      const recoveryAuthHash = await authHashFromMaterial(material);
      await api("/api/auth/recovery", {
        method: "PUT",
        body: JSON.stringify({
          recoveryAuthHash,
          recoverySalt,
          recoveryBlob,
          recoveryIterations: KDF_ITERATIONS,
        }),
      });
      setCode(recoveryCode);
    } catch {
      setError("No se pudo guardar el código de recuperación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Bloqueo automático y recuperación de cuenta.</p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-semibold">Autobloqueo</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tras un periodo de inactividad se borra la clave de la memoria.
        </p>
        <select
          className="mt-3 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          value={minutes}
          onChange={(e) => saveLock(Number(e.target.value))}
        >
          <option value={1}>1 minuto</option>
          <option value={5}>5 minutos</option>
          <option value={15}>15 minutos</option>
          <option value={30}>30 minutos</option>
          <option value={0}>Solo bloqueo manual</option>
        </select>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-semibold">Código de recuperación</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Guárdalo en un lugar seguro. Permite entrar si olvidas la contraseña maestra. Se muestra
          una sola vez.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createRecovery()}
          className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Generando…" : "Generar código"}
        </button>
        {code ? (
          <div className="mt-4 rounded-lg bg-[var(--surface-2)] p-3 font-mono text-lg tracking-wide">
            {code}
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      </section>
    </div>
  );
}
