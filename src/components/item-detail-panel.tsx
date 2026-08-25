"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { ItemForm } from "@/components/item-form";
import { useVault } from "@/components/vault-provider";
import {
  itemTitle,
  TYPE_LABEL,
  type CardData,
  type ContactData,
  type DocumentData,
  type ItemType,
  type LoginData,
  type NoteData,
  type PasskeyData,
  type VaultItemDecrypted,
} from "@/lib/types";
import { downloadVaultFile } from "@/lib/vault-file";

export function ItemDetailPanel({
  item,
  mode,
  newType,
  initialFolderId,
  onClose,
  onEdit,
  onSaved,
  onDeleted,
}: {
  item: VaultItemDecrypted | null;
  mode: "view" | "edit" | "new";
  newType: ItemType;
  initialFolderId: string | null;
  onClose: () => void;
  onEdit: () => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="z-30 flex min-h-0 flex-col border-[var(--border)] bg-[var(--surface)] max-md:fixed max-md:inset-0 max-md:border-0 md:sticky md:top-0 md:h-[calc(100dvh-4.25rem)] md:w-[26rem] md:shrink-0 md:border-l">
      <div className="min-h-0 flex-1 overflow-auto p-5">
        {mode !== "view" ? (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              title="Cerrar"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              ×
            </button>
          </div>
        ) : null}
        {mode === "new" ? (
          <ItemForm
            key={`new-${newType}`}
            initialType={newType}
            initialFolderId={initialFolderId}
            compact
            onSaved={onSaved}
            onCancel={onClose}
          />
        ) : null}
        {mode === "edit" && item ? (
          <ItemForm
            key={`edit-${item.id}`}
            item={item}
            compact
            onSaved={onSaved}
            onCancel={() => onSaved(item.id)}
            onDeleted={onDeleted}
          />
        ) : null}
        {mode === "view" && item ? (
          <ItemPreview item={item} onClose={onClose} onEdit={onEdit} onDeleted={onDeleted} />
        ) : null}
      </div>
    </aside>
  );
}

function ItemPreview({
  item,
  onClose,
  onEdit,
  onDeleted,
}: {
  item: VaultItemDecrypted;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { updateItem, trashItem } = useVault();
  const [moreOpen, setMoreOpen] = useState(false);
  const title = itemTitle(item);

  async function toggleFavorite() {
    await updateItem(item.id, { favorite: !item.favorite });
    setMoreOpen(false);
  }

  async function moveToTrash() {
    setMoreOpen(false);
    if (!confirm("¿Mover este ítem a la papelera?")) return;
    await trashItem(item.id);
    onDeleted();
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TypeBadge type={item.type} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {item.favorite ? "★ " : ""}
              {title}
            </h2>
            <p className="text-xs text-[var(--muted)]">{TYPE_LABEL[item.type]}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Editar"
            onClick={onEdit}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 20h4L19 9l-4-4L4 16v4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            ×
          </button>
        </div>
      </div>

      <div className="relative mb-6 flex flex-wrap gap-2">
        <ActionChip disabled title="El uso compartido entre usuarios aún no está disponible">
          Compartir
        </ActionChip>
        <ActionChip disabled title="Los archivos van como elementos de tipo Documento">
          Adjuntar
        </ActionChip>
        <div className="relative">
          <ActionChip onClick={() => setMoreOpen((v) => !v)}>Más</ActionChip>
          {moreOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 text-sm shadow-lg">
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                onClick={() => void toggleFavorite()}
              >
                {item.favorite ? "Quitar de favoritos" : "Marcar favorito"}
              </button>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-[var(--danger)] hover:bg-[var(--surface-2)]"
                onClick={() => void moveToTrash()}
              >
                Mover a la papelera
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <PreviewFields item={item} />
    </div>
  );
}

function PreviewFields({ item }: { item: VaultItemDecrypted }) {
  if (item.type === "login") {
    const data = item.data as LoginData;
    return (
      <div className="divide-y divide-[var(--border)]">
        <PreviewRow label="Email o usuario" value={data.username} copy />
        <SecretRow label="Contraseña" value={data.password} />
        <WebsiteRow value={data.url} />
        {data.notes ? <PreviewRow label="Notas" value={data.notes} multiline /> : null}
      </div>
    );
  }
  if (item.type === "passkey") {
    const data = item.data as PasskeyData;
    return (
      <div className="divide-y divide-[var(--border)]">
        <PreviewRow label="Usuario" value={data.username} copy />
        <WebsiteRow label="Sitio" value={data.site} />
        {data.notes ? <PreviewRow label="Notas" value={data.notes} multiline /> : null}
      </div>
    );
  }
  if (item.type === "note") {
    const data = item.data as NoteData;
    return (
      <div className="divide-y divide-[var(--border)]">
        <PreviewRow label="Contenido" value={data.content} multiline />
      </div>
    );
  }
  if (item.type === "card") {
    const data = item.data as CardData;
    const digits = data.number.replace(/\s/g, "");
    const masked = digits.length >= 4 ? `•••• •••• •••• ${digits.slice(-4)}` : data.number;
    return (
      <div className="divide-y divide-[var(--border)]">
        <PreviewRow label="Titular" value={data.holder} copy />
        <PreviewRow label="Número" value={data.number} display={masked} copy />
        <PreviewRow label="Caducidad" value={data.expiry} />
        <SecretRow label="CVV" value={data.cvv} />
        {data.notes ? <PreviewRow label="Notas" value={data.notes} multiline /> : null}
      </div>
    );
  }
  if (item.type === "contact") {
    const data = item.data as ContactData;
    return (
      <div className="divide-y divide-[var(--border)]">
        <PreviewRow label="Email" value={data.email} copy />
        <PreviewRow label="Teléfono" value={data.phone} copy />
        <PreviewRow label="Dirección" value={data.address} />
        {data.notes ? <PreviewRow label="Notas" value={data.notes} multiline /> : null}
      </div>
    );
  }
  const data = item.data as DocumentData;
  const sizeLabel = data.size
    ? `${(data.size / 1024).toFixed(1)} KB`
    : data.content
      ? `${(data.content.length * 0.75 / 1024).toFixed(1)} KB`
      : "";
  const hasFile = Boolean(data.fileKey || data.content || data.fileName);

  return (
    <div className="divide-y divide-[var(--border)]">
      <div className="py-3">
        <div className="text-xs text-[var(--muted)]">Archivo</div>
        {hasFile ? (
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)]">
              D
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{data.fileName || "Archivo cifrado"}</div>
              <div className="text-xs text-[var(--muted)]">{sizeLabel || "Listo para descargar"}</div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Este registro no tiene un archivo. Pulsa Editar y adjúntalo de nuevo.
          </p>
        )}
      </div>
      {data.fileKey || data.content ? <DocumentDownload data={data} /> : null}
      {data.notes ? <PreviewRow label="Notas" value={data.notes} multiline /> : null}
    </div>
  );
}

function PreviewRow({
  label,
  value,
  display,
  copy,
  multiline,
}: {
  label: string;
  value: string;
  display?: string;
  copy?: boolean;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-xs text-[var(--muted)]">{label}</div>
        <div className={`mt-1 text-sm ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>
          {display ?? value}
        </div>
      </div>
      {copy ? <CopyButton value={value} /> : null}
    </div>
  );
}

function SecretRow({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-xs text-[var(--muted)]">{label}</div>
        <div className="mt-1 truncate font-mono text-sm tracking-widest">
          {show ? value : "••••••••••••"}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
        >
          {show ? "Ocultar" : "Ver"}
        </button>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function WebsiteRow({ label = "Sitio web", value }: { label?: string; value: string }) {
  if (!value) return null;
  const href = websiteHref(value);
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-xs text-[var(--muted)]">{label}</div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate text-sm text-[var(--accent)] hover:underline"
        >
          {value}
        </a>
      </div>
      <CopyButton value={value} />
    </div>
  );
}

function DocumentDownload({ data }: { data: DocumentData }) {
  const { getVaultKey } = useVault();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      if (data.fileKey) {
        const vaultKey = getVaultKey();
        if (!vaultKey) throw new Error("Bóveda bloqueada");
        await downloadVaultFile(
          data.fileKey,
          vaultKey,
          data.fileName,
          data.mimeType,
        );
        return;
      }
      const binary = atob(data.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mimeType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName || "archivo";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)] disabled:opacity-60"
      >
        {busy ? "Descargando…" : "Descargar archivo"}
      </button>
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

function ActionChip({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
    >
      {children}
    </button>
  );
}

function TypeBadge({ type }: { type: ItemType }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)]">
      {type === "login" ? "P" : type === "note" ? "N" : type === "card" ? "T" : type === "passkey" ? "K" : type === "contact" ? "C" : "D"}
    </div>
  );
}

function websiteHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
