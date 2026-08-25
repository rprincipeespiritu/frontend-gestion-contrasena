"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ItemDetailPanel } from "@/components/item-detail-panel";
import { useVault } from "@/components/vault-provider";
import {
  itemMatchesQuery,
  itemSubtitle,
  itemTitle,
  isItemType,
  TYPE_LABEL,
  type ItemType,
} from "@/lib/types";
import { relativeTime } from "@/lib/time";

const TABS: { id: "all" | ItemType; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "login", label: "Contraseñas" },
  { id: "passkey", label: "Passkeys" },
  { id: "note", label: "Notas seguras" },
  { id: "card", label: "Tarjetas" },
  { id: "contact", label: "Contactos" },
  { id: "document", label: "Documentos" },
];

export function VaultHome() {
  const router = useRouter();
  const params = useSearchParams();
  const folderId = params.get("folder");
  const selectedId = params.get("item");
  const modeParam = params.get("mode");
  const typeParam = params.get("type") ?? "login";
  const newType = isItemType(typeParam) ? typeParam : "login";
  const creating = modeParam === "new";
  const { items, folders, search, touchItem } = useVault();
  const [tab, setTab] = useState<"all" | ItemType>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hideBanners, setHideBanners] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("vault_hide_banners") === "1";
  });

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (!itemMatchesQuery(item, search)) return false;
      if (folderId && item.folderId !== folderId) return false;
      if (tab !== "all" && item.type !== tab) return false;
      return true;
    });
  }, [items, search, folderId, tab]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const panelOpen = creating || Boolean(selected);
  const panelMode = creating ? "new" : editing && selected ? "edit" : "view";
  const folderName = folders.find((folder) => folder.id === folderId)?.name;

  const replaceQuery = useCallback(
    (next: { item?: string | null; mode?: string | null; type?: string | null }) => {
      const query = new URLSearchParams();
      if (folderId) query.set("folder", folderId);
      const item = next.item === undefined ? selectedId : next.item;
      const nextMode = next.mode === undefined ? modeParam : next.mode;
      const type = next.type === undefined ? typeParam : next.type;
      if (item) query.set("item", item);
      if (nextMode) query.set("mode", nextMode);
      if (nextMode === "new" && type) query.set("type", type);
      const qs = query.toString();
      router.replace(qs ? `/vault?${qs}` : "/vault", { scroll: false });
    },
    [folderId, modeParam, router, selectedId, typeParam],
  );

  function openItem(id: string) {
    setEditing(false);
    void touchItem(id);
    replaceQuery({ item: id, mode: null, type: null });
  }

  function closePanel() {
    setEditing(false);
    replaceQuery({ item: null, mode: null, type: null });
  }

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1 p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{folderName || "Bóveda"}</h1>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Añadir elemento
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 text-sm shadow-lg">
                {TABS.filter((entry) => entry.id !== "all").map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(false);
                      replaceQuery({ item: null, mode: "new", type: entry.id });
                    }}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                tab === entry.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {hideBanners || panelOpen ? null : (
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <Banner href="/settings" title="Código de recuperación" text="Guarda un código para no perder la bóveda." />
            <Banner href="/settings" title="Ajustar autobloqueo" text="Elige en cuántos minutos se bloquea la app." />
            <button
              type="button"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
              onClick={() => {
                localStorage.setItem("vault_hide_banners", "1");
                setHideBanners(true);
              }}
            >
              <div className="text-sm font-semibold">Desbloqueo biométrico</div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                En esta versión el desbloqueo es con la contraseña maestra.
              </p>
            </button>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center text-sm text-[var(--muted)]">
            No hay elementos en esta vista.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Último uso</th>
                  {panelOpen ? null : (
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Carpeta</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-t border-[var(--border)] ${
                        active
                          ? "border-l-2 border-l-[var(--accent)] bg-[var(--surface-2)]"
                          : "border-l-2 border-l-transparent hover:bg-[var(--surface-2)]"
                      }`}
                      onClick={() => openItem(item.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {item.favorite ? "★ " : ""}
                          {itemTitle(item)}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {TYPE_LABEL[item.type]} · {itemSubtitle(item)}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-[var(--muted)] md:table-cell">
                        {relativeTime(item.lastUsedAt)}
                      </td>
                      {panelOpen ? null : (
                        <td className="hidden px-4 py-3 text-[var(--muted)] md:table-cell">
                          {folders.find((folder) => folder.id === item.folderId)?.name || "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar panel"
            className="fixed inset-0 z-20 bg-black/20 md:hidden"
            onClick={closePanel}
          />
          <ItemDetailPanel
            item={selected}
            mode={panelMode}
            newType={newType}
            initialFolderId={folderId}
            onClose={closePanel}
            onEdit={() => setEditing(true)}
            onSaved={(id) => {
              setEditing(false);
              replaceQuery({ item: id, mode: null, type: null });
            }}
            onDeleted={closePanel}
          />
        </>
      ) : null}
    </div>
  );
}

function Banner({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs text-[var(--muted)]">{text}</p>
    </Link>
  );
}
