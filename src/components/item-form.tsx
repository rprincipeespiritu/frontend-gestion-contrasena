"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PasswordGenerator } from "@/components/password-generator";
import { useVault } from "@/components/vault-provider";
import {
  emptyData,
  type CardData,
  type ItemType,
  type LoginData,
  type NoteData,
  type VaultItemDecrypted,
} from "@/lib/types";

const field =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

export function ItemForm({
  item,
  initialType = "login",
}: {
  item?: VaultItemDecrypted;
  initialType?: ItemType;
}) {
  const router = useRouter();
  const { folders, createItem, updateItem, deleteItem } = useVault();
  const resolvedType = item?.type ?? initialType;
  const [type, setType] = useState<ItemType>(resolvedType);
  const [favorite, setFavorite] = useState(item?.favorite ?? false);
  const [folderId, setFolderId] = useState<string>(item?.folderId ?? "");
  const [data, setData] = useState(() => item?.data ?? emptyData(resolvedType));
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const title = useMemo(() => {
    if (item) return "Editar ítem";
    if (type === "note") return "Nueva nota";
    if (type === "card") return "Nueva tarjeta";
    return "Nuevo inicio de sesión";
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
        router.push("/vault");
      } else {
        await createItem({
          type,
          favorite,
          folderId: folderId || null,
          data,
        });
        router.push("/vault");
      }
    } catch {
      setError("No se pudo guardar el ítem.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!item) return;
    if (!confirm("¿Eliminar este ítem de forma permanente?")) return;
    await deleteItem(item.id);
    router.push("/vault");
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
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
              ["login", "Inicio de sesión"],
              ["note", "Nota"],
              ["card", "Tarjeta"],
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
          onClick={() => router.push("/vault")}
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
            Eliminar
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
