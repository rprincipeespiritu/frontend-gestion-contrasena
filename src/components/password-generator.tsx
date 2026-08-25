"use client";

import { useMemo, useState } from "react";
import {
  defaultGeneratorOptions,
  generatePassword,
  type GeneratorOptions,
} from "@/lib/password-generator";
import { CopyButton } from "@/components/copy-button";

export function PasswordGenerator({
  onUse,
}: {
  onUse?: (password: string) => void;
}) {
  const [options, setOptions] = useState<GeneratorOptions>(defaultGeneratorOptions);
  const [password, setPassword] = useState(() => generatePassword(defaultGeneratorOptions));

  const charsetOk = options.lowercase || options.uppercase || options.numbers || options.symbols;

  const strength = useMemo(() => {
    if (password.length >= 20 && options.symbols) return "Muy fuerte";
    if (password.length >= 16) return "Fuerte";
    if (password.length >= 12) return "Buena";
    return "Aceptable";
  }, [password, options.symbols]);

  function refresh(next = options) {
    if (!charsetOk && next === options) return;
    setPassword(generatePassword(next));
  }

  function toggle(key: keyof Omit<GeneratorOptions, "length">) {
    const next = { ...options, [key]: !options[key] };
    if (!next.lowercase && !next.uppercase && !next.numbers && !next.symbols) return;
    setOptions(next);
    refresh(next);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Generador</h3>
        <span className="text-xs text-[var(--accent)]">{strength}</span>
      </div>
      <div className="mb-3 break-all rounded-lg bg-[var(--background)] px-3 py-2 font-mono text-sm">
        {password}
      </div>
      <label className="mb-3 block text-xs text-[var(--muted)]">
        Longitud: {options.length}
        <input
          type="range"
          min={8}
          max={64}
          value={options.length}
          onChange={(e) => {
            const next = { ...options, length: Number(e.target.value) };
            setOptions(next);
            refresh(next);
          }}
          className="mt-1 w-full accent-[var(--accent)]"
        />
      </label>
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        {(
          [
            ["lowercase", "Minúsculas"],
            ["uppercase", "Mayúsculas"],
            ["numbers", "Números"],
            ["symbols", "Símbolos"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options[key]}
              onChange={() => toggle(key)}
              className="accent-[var(--accent)]"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)]"
        >
          Regenerar
        </button>
        <CopyButton value={password} />
        {onUse ? (
          <button
            type="button"
            onClick={() => onUse(password)}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-slate-950"
          >
            Usar esta
          </button>
        ) : null}
      </div>
    </div>
  );
}
