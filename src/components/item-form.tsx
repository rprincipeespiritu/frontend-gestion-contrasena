"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PasswordGenerator } from "@/components/password-generator";
import { useVault } from "@/components/vault-provider";
import { deleteVaultFile, uploadVaultFile } from "@/lib/vault-file";
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
        <DocumentFields data={data as DocumentData} onChange={setData} getVaultKey={getVaultKey} />
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
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
}: {
  data: DocumentData;
  onChange: (data: DocumentData) => void;
  getVaultKey: () => CryptoKey | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const vaultKey = getVaultKey();
    if (!vaultKey) {
      setError("Bóveda bloqueada");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadVaultFile(file, vaultKey);
      if (data.fileKey && data.fileKey !== uploaded.fileKey) {
        await deleteVaultFile(data.fileKey).catch(() => undefined);
      }
      onChange({
        ...data,
        name: data.name || file.name,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        fileKey: uploaded.fileKey,
        content: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo");
    } finally {
      setBusy(false);
    }
  }

  const sizeLabel = data.size
    ? `· ${(data.size / 1024).toFixed(1)} KB`
    : data.content
      ? `· ${(data.content.length * 0.75 / 1024).toFixed(1)} KB`
      : "";

  return (
    <div className="space-y-3">
      <Field label="Nombre" value={data.name} onChange={(name) => onChange({ ...data, name })} />
      <label className="block text-sm">
        Archivo
        <input
          className={`${field} mt-1`}
          type="file"
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>
      {busy ? <p className="text-xs text-[var(--muted)]">Cifrando y subiendo a S3…</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {data.fileName ? (
        <p className="text-xs text-[var(--muted)]">
          {data.fileName} {sizeLabel}
          {data.fileKey ? " · guardado en S3" : ""}
        </p>
      ) : null}
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
