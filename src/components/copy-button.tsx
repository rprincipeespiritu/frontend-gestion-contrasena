"use client";

import { useEffect, useRef, useState } from "react";

export function CopyButton({
  value,
  label = "Copiar",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void navigator.clipboard.writeText(" ").catch(() => undefined);
      setCopied(false);
    }, 20_000);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={!value}
      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
    >
      {copied ? "Copiado" : label}
    </button>
  );
}
