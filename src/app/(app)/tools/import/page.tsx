"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LockGate } from "@/components/lock-gate";
import { useVault } from "@/components/vault-provider";
import { ApiError } from "@/lib/api";
import {
  CSV_TEMPLATE,
  draftKey,
  draftTitle,
  findExistingItem,
  parseImportFile,
  type ImportDraft,
  type ImportParseResult,
} from "@/lib/import-items";
import { TYPE_LABEL } from "@/lib/types";

export default function ImportPage() {
  return (
    <LockGate>
      <ImportInner />
    </LockGate>
  );
}

function ImportInner() {
  const { items, folders, createItem, createFolder, updateItem, refreshVault, subscription } = useVault();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ImportParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const selected = useMemo(() => {
    if (!parsed) return [];
    if (!skipDuplicates) return parsed.items;
    const claimed = new Set<string>();
    return parsed.items.filter((draft) => {
      const existing = findExistingItem(draft, items, claimed);
      if (existing) {
        claimed.add(existing.id);
        return false;
      }
      return true;
    });
  }, [parsed, skipDuplicates, items]);
  const itemLimit = subscription.limits.items;
  const remaining =
    itemLimit == null ? Number.POSITIVE_INFINITY : Math.max(0, itemLimit - items.length);

  const folderNames = useMemo(() => {
    const names = new Set<string>();
    for (const draft of parsed?.items ?? []) {
      if (draft.folder) names.add(draft.folder);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "es"));
  }, [parsed]);
  const duplicateCount = parsed ? parsed.items.length - selected.length : 0;
  const overLimit =
    Number.isFinite(remaining) && selected.length > remaining ? selected.length - remaining : 0;
  const toImport = overLimit > 0 ? selected.slice(0, remaining) : selected;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    setProgress(null);
    setFileName(file.name);
    try {
      setParsed(await parseImportFile(file));
    } catch (err) {
      setParsed(null);
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    }
  }

  async function runImport() {
    if (!parsed?.items.length) return;
    const work = [...parsed.items].sort((a, b) => {
      const af = a.folder?.trim() ? 1 : 0;
      const bf = b.folder?.trim() ? 1 : 0;
      return bf - af;
    });
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: work.length });
    const folderIds = new Map<string, string>(
      folders.map((folder) => [folder.name.trim().toLowerCase(), folder.id]),
    );
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const labels = [
      ...new Set(work.map((draft) => draft.folder?.trim()).filter((name): name is string => Boolean(name))),
    ];

    try {
      for (const folderLabel of labels) {
        const key = folderLabel.toLowerCase();
        if (folderIds.has(key)) continue;
        try {
          const folder = await createFolder(folderLabel);
          folderIds.set(key, folder.id);
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : `No se pudo crear la carpeta “${folderLabel}”.`,
          );
        }
      }

      const claimedIds = new Set<string>();
      let remainingSlots = remaining;
      for (let index = 0; index < work.length; index++) {
        const draft = work[index] as ImportDraft;
        const folderKey = draft.folder?.trim().toLowerCase() ?? "";
        const folderId = folderKey ? (folderIds.get(folderKey) ?? null) : null;
        if (folderKey && !folderId) {
          failed += 1;
          setProgress({ done: index + 1, total: work.length });
          continue;
        }
        try {
          const existing = findExistingItem(draft, items, claimedIds);
          if (existing) claimedIds.add(existing.id);

          if (existing && skipDuplicates) {
            if (folderId && existing.folderId !== folderId) {
              await updateItem(existing.id, { folderId });
              updated += 1;
            } else {
              skipped += 1;
            }
          } else if (remainingSlots <= 0) {
            skipped += 1;
          } else {
            await createItem({
              type: draft.type,
              folderId,
              favorite: draft.favorite,
              data: draft.data,
            });
            remainingSlots -= 1;
            created += 1;
          }
        } catch (err) {
          if (err instanceof ApiError && err.status === 403) {
            remainingSlots = 0;
            skipped += 1;
            setError(err.message);
          } else {
            failed += 1;
          }
        }
        setProgress({ done: index + 1, total: work.length });
      }
      await refreshVault();
      setResult({ created, updated, skipped, failed });
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cifralock-importacion.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Importar elementos</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        El archivo se lee en tu navegador y cada elemento se cifra antes de guardarlo. El servidor
        no ve contraseñas en claro.
      </p>

      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-semibold">Archivo</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          CSV de Chrome, Edge, Firefox, Bitwarden, LastPass o NordPass, JSON de Bitwarden (sin
          cifrar) o JSON de CifraLock.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Elegir archivo
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:border-[var(--accent)]"
          >
            Descargar plantilla CSV
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,.txt,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            void onFile(file);
          }}
        />
        {fileName ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {fileName}
            {parsed ? ` · ${parsed.format} · ${parsed.items.length} elementos` : null}
          </p>
        ) : null}
      </section>

      {parsed ? (
        <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold">Vista previa</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {parsed.items.length} listos
            {folderNames.length
              ? ` · ${folderNames.length} carpeta${folderNames.length === 1 ? "" : "s"}`
              : " · sin carpetas en el archivo"}
            {parsed.skipped ? ` · ${parsed.skipped} filas vacías u omitidas` : ""}
            {duplicateCount ? ` · ${duplicateCount} ya están en la bóveda` : ""}
            {overLimit ? ` · ${overLimit} superan el límite del plan` : ""}
          </p>
          {parsed.headers?.length ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Columnas: {parsed.headers.join(", ")}
            </p>
          ) : null}
          {folderNames.length ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Carpetas: {folderNames.join(", ")}
            </p>
          ) : null}
          {parsed.warnings.map((warning) => (
            <p key={warning} className="mt-2 text-sm text-[var(--muted)]">
              {warning}
            </p>
          ))}
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.currentTarget.checked)}
            />
            Omitir elementos que ya existen (mismo nombre y usuario o URL)
          </label>
          {Number.isFinite(remaining) ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              El plan gratuito admite {itemLimit} elementos. Te quedan {remaining}.{" "}
              {remaining === 0 ? (
                <Link href="/plan" className="text-[var(--accent)]">
                  Ampliar plan
                </Link>
              ) : null}
            </p>
          ) : null}

          <ul className="mt-4 max-h-72 divide-y divide-[var(--border)] overflow-auto rounded-lg border border-[var(--border)]">
            {parsed.items.slice(0, 40).map((draft, index) => {
              const data = draft.data as { username?: string; url?: string; email?: string };
              return (
                <li key={`${draftKey(draft)}-${index}`} className="px-3 py-2 text-sm">
                  <div className="font-medium">{draftTitle(draft)}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {TYPE_LABEL[draft.type]}
                    {draft.folder ? ` · ${draft.folder}` : ""}
                    {data.username || data.email || data.url
                      ? ` · ${data.username || data.email || data.url}`
                      : ""}
                  </div>
                </li>
              );
            })}
          </ul>
          {parsed.items.length > 40 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Mostrando 40 de {parsed.items.length}. Se procesarán todos.
            </p>
          ) : null}

          <button
            type="button"
            disabled={busy || parsed.items.length === 0}
            onClick={() => void runImport()}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy
              ? `Importando ${progress?.done ?? 0} / ${progress?.total ?? parsed.items.length}…`
              : toImport.length === 0
                ? "Crear carpetas y asignar elementos"
                : `Importar ${toImport.length} elemento${toImport.length === 1 ? "" : "s"}`}
          </button>
        </section>
      ) : null}

      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      {result ? (
        <p className="mt-4 text-sm text-[var(--accent)]">
          Listo: {result.created} creados
          {result.updated ? ` · ${result.updated} asignados a carpeta` : ""}
          {result.skipped ? ` · ${result.skipped} omitidos` : ""}
          {result.failed ? ` · ${result.failed} con error` : ""}.{" "}
          <Link href="/vault" className="underline">
            Ir a la bóveda
          </Link>
        </p>
      ) : null}
    </div>
  );
}
