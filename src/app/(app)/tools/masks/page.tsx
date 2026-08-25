"use client";

import { useState } from "react";
import { LockGate } from "@/components/lock-gate";
import { CopyButton } from "@/components/copy-button";
import { useVault } from "@/components/vault-provider";

function randomAlias() {
  const words = ["lago", "nube", "faro", "roble", "cava", "lima", "norte", "zeta"];
  const word = words[Math.floor(Math.random() * words.length)];
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return `${word}${n}@mask.vault`;
}

export default function MasksPage() {
  return (
    <LockGate>
      <MasksInner />
    </LockGate>
  );
}

function MasksInner() {
  const { createItem } = useVault();
  const [alias, setAlias] = useState(randomAlias);
  const [saved, setSaved] = useState(false);

  async function save() {
    await createItem({
      type: "login",
      folderId: null,
      favorite: false,
      data: {
        name: `Máscara ${alias}`,
        username: alias,
        password: "",
        url: "",
        notes: "Alias local. No reenvía correo real; sirve para no usar tu email principal.",
      },
    });
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Enmascarar email</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Genera un alias para no exponer tu correo real. No hay reenvío de mensajes: el alias se
        guarda cifrado en tu bóveda.
      </p>
      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 font-mono text-lg">{alias}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => {
              setAlias(randomAlias());
              setSaved(false);
            }}
          >
            Otro alias
          </button>
          <CopyButton value={alias} />
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white"
            onClick={() => void save()}
          >
            Guardar en la bóveda
          </button>
        </div>
        {saved ? <p className="mt-3 text-xs text-[var(--accent)]">Guardado como inicio de sesión.</p> : null}
      </div>
    </div>
  );
}
