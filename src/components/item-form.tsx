"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PasswordGenerator } from "@/components/password-generator";
import { useVault } from "@/components/vault-provider";
import { deleteVaultFile, fileUploadErrorMessage, uploadVaultFile } from "@/lib/vault-file";
import {
  emptyData,
  type CardData,
  type ContactData,
  type DocumentData,
  type ItemType,
  type LoginData,
  type NoteData,
  type PasskeyData,
  type VaultItemDecrypted,
} from "@/lib/types";

const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

export function ItemForm({
  item,
  initialType = "login",
  initialFolderId = null,
  compact = false,
  onSaved,
  onCancel,
  onDeleted,
}: {
  item?: VaultItemDecrypted;
  initialType?: ItemType;
  initialFolderId?: string | null;
  compact?: boolean;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { folders, createItem, updateItem, trashItem, getVaultKey } = useVault();
  const resolvedType = item?.type ?? initialType;
  const [type, setType] = useState<ItemType>(resolvedType);
  const [favorite, setFavorite] = useState(item?.favorite ?? false);
  const [folderId, setFolderId] = useState<string>(item?.folderId ?? initialFolderId ?? "");
  const [data, setData] = useState(() => item?.data ?? emptyData(resolvedType));
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);

  const title = useMemo(() => {
    if (item) return "Editar ítem";
    if (type === "note") return "Nueva nota";
    if (type === "card") return "Nueva tarjeta";
    if (type === "passkey") return "Nueva passkey";
    if (type === "contact") return "Nuevo contacto";
    if (type === "document") return "Nuevo documento";
    return "Nueva contraseña";
  }, [item, type]);

  function changeType(next: ItemType) {
    setType(next);
    setData(emptyData(next));
    setShowGenerator(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "document") {
      const doc = data as DocumentData;
      if (fileBusy) {
        setError("Espera a que termine la subida del archivo");
        return;
      }
      if (!doc.fileKey && !doc.content) {
        setError("Adjunta un archivo antes de guardar");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      if (item) {
        await updateItem(item.id, {
          type,
          favorite,
          folderId: folderId || null,
          data,
        });
        if (onSaved) onSaved(item.id);
        else router.push("/vault");
      } else {
        const id = await createItem({
          type,
          favorite,
          folderId: folderId || null,
          data,
        });
        if (onSaved) onSaved(id);
        else router.push("/vault");
      }
    } catch {
      setError("No se pudo guardar el ítem.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else router.push("/vault");
  }

  async function onDelete() {
    if (!item) return;
    if (!confirm("¿Mover este ítem a la papelera?")) return;
    await trashItem(item.id);
    if (onDeleted) onDeleted();
    else router.push("/vault");
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-4" : "mx-auto w-full max-w-2xl space-y-5"}>
      <div className="flex items-center justify-between gap-3">
        <h1 className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>{title}</h1>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Favorito
        </label>
      </div>

      {!item ? (
        <div className="flex gap-2">
          {(
            [
              ["login", "Contraseña"],
              ["passkey", "Passkey"],
              ["note", "Nota"],
              ["card", "Tarjeta"],
              ["contact", "Contacto"],
              ["document", "Documento"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeType(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                type === value
                  ? "bg-[var(--accent)] text-slate-950"
                  : "border border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <label className="block text-sm">
        Carpeta
        <select
          className={`${field} mt-1`}
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
        >
          <option value="">Sin carpeta</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>

      {type === "login" ? (
        <LoginFields
          data={data as LoginData}
          onChange={setData}
          showGenerator={showGenerator}
          onToggleGenerator={() => setShowGenerator((v) => !v)}
        />
      ) : null}
      {type === "note" ? (
        <NoteFields data={data as NoteData} onChange={setData} />
      ) : null}
      {type === "card" ? (
        <CardFields data={data as CardData} onChange={setData} />
      ) : null}
      {type === "passkey" ? (
        <PasskeyFields data={data as PasskeyData} onChange={setData} />
      ) : null}
      {type === "contact" ? (
        <ContactFields data={data as ContactData} onChange={setData} />
      ) : null}
      {type === "document" ? (
        <DocumentFields
          data={data as DocumentData}
          onChange={setData}
          getVaultKey={getVaultKey}
          onBusyChange={setFileBusy}
        />
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving || fileBusy}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Cancelar
        </button>
        {item ? (
          <button
            type="button"
            onClick={() => void onDelete()}
            className="ml-auto rounded-lg border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)]"
          >
            Mover a la papelera
          </button>
        ) : null}
      </div>
    </form>
  );
}

function LoginFields({
  data,
  onChange,
  showGenerator,
  onToggleGenerator,
}: {
  data: LoginData;
  onChange: (data: LoginData) => void;
  showGenerator: boolean;
  onToggleGenerator: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-3">
      <Field label="Nombre" value={data.name} onChange={(name) => onChange({ ...data, name })} />
      <Field
        label="Usuario"
        value={data.username}
        onChange={(username) => onChange({ ...data, username })}
        extra={<CopyButton value={data.username} />}
      />
      <Field
        label="Contraseña"
        value={data.password}
        type={showPassword ? "text" : "password"}
        onChange={(password) => onChange({ ...data, password })}
        extra={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
            <CopyButton value={data.password} />
            <button
              type="button"
              onClick={onToggleGenerator}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
            >
              Generar
            </button>
          </div>
        }
      />
      {showGenerator ? (
        <PasswordGenerator onUse={(password) => onChange({ ...data, password })} />
      ) : null}
      <Field label="URL" value={data.url} onChange={(url) => onChange({ ...data, url })} />
      <label className="block text-sm">
        Notas
        <textarea
          className={`${field} mt-1 min-h-24`}
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
      </label>
    </div>
  );
}

function NoteFields({
  data,
  onChange,
}: {
  data: NoteData;
  onChange: (data: NoteData) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Título" value={data.title} onChange={(title) => onChange({ ...data, title })} />
      <label className="block text-sm">
        Contenido
        <textarea
          className={`${field} mt-1 min-h-48`}
          value={data.content}
          onChange={(e) => onChange({ ...data, content: e.target.value })}
        />
      </label>
    </div>
  );
}

function CardFields({
  data,
  onChange,
}: {
  data: CardData;
  onChange: (data: CardData) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Nombre" value={data.name} onChange={(name) => onChange({ ...data, name })} />
      <Field
        label="Titular"
        value={data.holder}
        onChange={(holder) => onChange({ ...data, holder })}
      />
      <Field
        label="Número"
        value={data.number}
        onChange={(number) => onChange({ ...data, number })}
        extra={<CopyButton value={data.number} />}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Caducidad"
          value={data.expiry}
          placeholder="MM/AA"
          onChange={(expiry) => onChange({ ...data, expiry })}
        />
        <Field
          label="CVV"
          value={data.cvv}
          type="password"
          onChange={(cvv) => onChange({ ...data, cvv })}
          extra={<CopyButton value={data.cvv} />}
        />
      </div>
      <label className="block text-sm">
        Notas
        <textarea
          className={`${field} mt-1 min-h-24`}
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
      </label>
    </div>
  );
}

function PasskeyFields({
  data,
  onChange,
}: {
  data: PasskeyData;
  onChange: (data: PasskeyData) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Nombre" value={data.name} onChange={(name) => onChange({ ...data, name })} />
      <Field
        label="Usuario"
        value={data.username}
        onChange={(username) => onChange({ ...data, username })}
      />
      <Field label="Sitio" value={data.site} onChange={(site) => onChange({ ...data, site })} />
      <label className="block text-sm">
        Notas
        <textarea
          className={`${field} mt-1 min-h-24`}
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
      </label>
    </div>
  );
}

function ContactFields({
  data,
  onChange,
}: {
  data: ContactData;
  onChange: (data: ContactData) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Nombre" value={data.name} onChange={(name) => onChange({ ...data, name })} />
      <Field label="Email" value={data.email} onChange={(email) => onChange({ ...data, email })} extra={<CopyButton value={data.email} />} />
      <Field label="Teléfono" value={data.phone} onChange={(phone) => onChange({ ...data, phone })} extra={<CopyButton value={data.phone} />} />
      <Field label="Dirección" value={data.address} onChange={(address) => onChange({ ...data, address })} />
      <label className="block text-sm">
        Notas
        <textarea
          className={`${field} mt-1 min-h-24`}
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
      </label>
    </div>
  );
}

function DocumentFields({
  data,
  onChange,
  getVaultKey,
  onBusyChange,
}: {
  data: DocumentData;
  onChange: (data: DocumentData) => void;
  getVaultKey: () => CryptoKey | null;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const vaultKey = getVaultKey();
    if (!vaultKey) {
      setError("Bóveda bloqueada");
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    try {
      const uploaded = await uploadVaultFile(file, vaultKey);
      const current = dataRef.current;
      if (current.fileKey && current.fileKey !== uploaded.fileKey) {
        await deleteVaultFile(current.fileKey).catch(() => undefined);
      }
      onChange({
        ...current,
        name: current.name || file.name,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        fileKey: uploaded.fileKey,
        content: "",
      });
    } catch (err) {
      setError(fileUploadErrorMessage(err));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const sizeLabel = data.size
    ? `${(data.size / 1024).toFixed(1)} KB`
    : data.content
      ? `${(data.content.length * 0.75 / 1024).toFixed(1)} KB`
      : "";

  return (
    <div className="space-y-3">
      <Field label="Nombre" value={data.name} onChange={(name) => onChange({ ...data, name })} />
      <div className="text-sm">
        <div className="mb-1">Archivo</div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          disabled={busy}
          onChange={(e) => void onFile(e.currentTarget.files?.[0])}
        />
        {data.fileName ? (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
              <FileIcon />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{data.fileName}</div>
              <div className="text-xs text-[var(--muted)]">
                {sizeLabel}
                {data.fileKey ? " · guardado en S3" : ""}
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
            >
              {busy ? "Subiendo…" : "Cambiar"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void onFile(e.dataTransfer.files[0]);
            }}
            className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
              dragOver
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
            } disabled:opacity-60`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
              <UploadIcon />
            </span>
            <span className="mt-3 text-sm font-medium">
              {busy ? "Cifrando y subiendo…" : "Arrastra un archivo o haz clic para elegir"}
            </span>
            <span className="mt-1 text-xs text-[var(--muted)]">PDF, DOCX, imágenes… hasta 20 MB</span>
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <label className="block text-sm">
        Notas
        <textarea
          className={`${field} mt-1 min-h-24`}
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
      </label>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V7m0 0 3.5 3.5M12 7 8.5 10.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V9h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  extra,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  extra?: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center justify-between gap-2">
        {label}
        {extra}
      </span>
      <input
        className={field}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </label>
  );
}
