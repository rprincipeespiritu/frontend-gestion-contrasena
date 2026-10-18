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
import { UiIcon, type IconName } from "@/components/ui-icon";

const TABS: { id: "all" | ItemType; label: string; icon: IconName }[] = [
  { id: "all", label: "Todos", icon: "grid" },
  { id: "login", label: "Contraseñas", icon: "key" },
  { id: "passkey", label: "Passkeys", icon: "passkey" },
  { id: "note", label: "Notas seguras", icon: "note" },
  { id: "card", label: "Tarjetas", icon: "card" },
  { id: "contact", label: "Contactos", icon: "contact" },
  { id: "document", label: "Documentos", icon: "document" },
];

const TYPE_ICON: Record<ItemType, IconName> = { login: "key", passkey: "passkey", note: "note", card: "card", contact: "contact", document: "document" };

export function VaultHome() {
  const router = useRouter();
  const params = useSearchParams();
  const folderId = params.get("folder");
  const selectedId = params.get("item");
  const modeParam = params.get("mode");
  const typeParam = params.get("type") ?? "login";
  const newType = isItemType(typeParam) ? typeParam : "login";
  const creating = modeParam === "new";
  const { items, folders, search, touchItem, trashMany } = useVault();
  const [tab, setTab] = useState<"all" | ItemType>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
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
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selectedIds.has(item.id));
  const selectedCount = selectedIds.size;

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const item of visible) next.delete(item.id);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of visible) next.add(item.id);
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (
      !confirm(
        `¿Mover ${ids.length} elemento${ids.length === 1 ? "" : "s"} a la papelera?`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await trashMany(ids);
      setSelectedIds(new Set());
      if (selectedId && ids.includes(selectedId)) closePanel();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`vault-layout flex min-h-full ${panelOpen ? "has-panel" : ""}`}>
      <div className="vault-content min-w-0 flex-1 p-4 md:p-7">
        <div className="vault-heading mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Tu espacio seguro</p>
            <h1 className="text-3xl font-bold tracking-tight">{folderName || "Bóveda"}</h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">Tus contraseñas y datos, siempre a mano.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCount > 0 ? (
              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteSelected()}
                className="ui-button ui-button-danger"
              >
                <UiIcon name="trash" size={16} />
                {deleting
                  ? "Eliminando…"
                  : `Eliminar ${selectedCount} seleccionado${selectedCount === 1 ? "" : "s"}`}
              </button>
            ) : null}
            <Link href="/tools/generator" className="ui-button ui-button-secondary vault-generate"><UiIcon name="generator" size={17} />Generar contraseña</Link>
            <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="add-item-options"
              onKeyDown={(e) => { if (e.key === "Escape") setMenuOpen(false); }}
              className="ui-button ui-button-primary"
            >
              <UiIcon name="plus" size={18} />Añadir elemento<UiIcon name="down" size={14} />
            </button>
            {menuOpen ? (
              <div id="add-item-options" onKeyDown={(e) => { if (e.key === "Escape") setMenuOpen(false); }} className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 text-sm shadow-lg">
                {TABS.filter((entry) => entry.id !== "all").map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(false);
                      replaceQuery({ item: null, mode: "new", type: entry.id });
                    }}
                  >
                    <UiIcon name={entry.icon} size={17} className="text-[var(--accent)]" />{entry.label}
                  </button>
                ))}
                <Link
                  href="/tools/import"
                  className="mt-1 block w-full rounded-lg border-t border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Importar archivo
                </Link>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        <div aria-label="Filtrar por tipo" className="category-filters mb-6 flex flex-wrap gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-pressed={tab === entry.id}
              className={`category-filter ${tab === entry.id ? "is-active" : ""}`}
            >
              <UiIcon name={entry.icon} size={16} />{entry.label}
            </button>
          ))}
        </div>

        {hideBanners || panelOpen ? null : (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-[var(--muted)]">Un poco más de tranquilidad</h2>
              <button type="button" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)]" onClick={() => { localStorage.setItem("vault_hide_banners", "1"); setHideBanners(true); }}>Ocultar consejos</button>
            </div>
            <div className="advice-grid grid gap-3 lg:grid-cols-3">
              <Banner href="/settings" icon="shield" tone="blue" title="Tu acceso, a salvo" text="Guarda tu código de recuperación y conserva el acceso a tu bóveda." action="Configurar recuperación" />
              <Banner href="/settings" icon="clock" tone="violet" title="Una pausa segura" text="Elige cuándo se bloquea la app automáticamente." action="Ajustar autobloqueo" />
              <Banner href="/tools/health" icon="key" tone="teal" title="Contraseñas más fuertes" text="Revisa la fortaleza de tus claves y detecta las que se repiten." action="Revisar contraseñas" />
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{tab === "all" ? "Todos los elementos" : TABS.find((entry) => entry.id === tab)?.label}<span className="ml-2 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--muted)]">{visible.length}</span></h2>
          {hideBanners && !panelOpen ? <button type="button" className="text-xs font-medium text-[var(--accent)]" onClick={() => { localStorage.removeItem("vault_hide_banners"); setHideBanners(false); }}>Mostrar consejos</button> : null}
        </div>
        {visible.length === 0 ? (
          <div className="vault-empty rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center text-sm text-[var(--muted)]">
            <span className="empty-icon"><UiIcon name={search ? "search" : "vault"} size={28} /></span>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">{search ? "No encontramos coincidencias" : "Un lugar seguro para tus datos"}</h3>
            <p className="mx-auto max-w-sm">{search ? "Prueba con otro nombre o cambia los filtros de búsqueda." : folderId ? (
              <>
                Esta carpeta no tiene elementos. Si ya estaban en la bóveda, vuelve a{" "}
                <Link href="/tools/import" className="text-[var(--accent)] underline">
                  Importar
                </Link>{" "}
                el mismo archivo para asignarlos.
              </>
            ) : (
              "Añade un elemento para empezar a organizar tu bóveda."
            )}</p>
            {!search ? <button type="button" className="ui-button ui-button-primary mt-5" onClick={() => { setEditing(false); replaceQuery({ item: null, mode: "new", type: tab === "all" ? "login" : tab }); }}><UiIcon name="plus" size={17} />Añadir elemento</button> : null}
          </div>
        ) : (
          <div className="vault-table overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="w-10 px-3 py-3 font-medium">
                    <input
                      type="checkbox"
                      className="accent-[var(--accent)]"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="last-used-column hidden w-32 px-4 py-3 font-medium xl:table-cell">Último uso</th>
                  {panelOpen ? null : (
                    <th className="hidden w-40 px-4 py-3 font-medium lg:table-cell">Carpeta</th>
                  )}
                  <th className="w-12"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const active = item.id === selectedId;
                  const checked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-t border-[var(--border)] ${
                        active
                          ? "border-l-2 border-l-[var(--accent)] bg-[var(--surface-2)]"
                          : checked
                            ? "border-l-2 border-l-[var(--accent)]/40 bg-[var(--accent)]/5"
                            : "border-l-2 border-l-transparent hover:bg-[var(--surface-2)]"
                      }`}
                      onClick={() => openItem(item.id)}
                    >
                      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="accent-[var(--accent)]"
                          checked={checked}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Seleccionar ${itemTitle(item)}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`item-type-icon type-${item.type}`}><UiIcon name={TYPE_ICON[item.type]} size={20} /></span>
                          <div className="min-w-0">
                            <button type="button" className="flex max-w-full items-center gap-1.5 text-left font-semibold hover:text-[var(--accent)]" onClick={(e) => { e.stopPropagation(); openItem(item.id); }}>
                              <span className="truncate">{itemTitle(item)}</span>
                              {item.favorite ? <UiIcon name="star" size={14} className="shrink-0 fill-amber-400 text-amber-600" aria-label="Favorito" aria-hidden={false} role="img" /> : null}
                            </button>
                            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">{TYPE_LABEL[item.type]} · {itemSubtitle(item)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="last-used-column hidden px-4 py-3 text-xs text-[var(--muted)] xl:table-cell">
                        {relativeTime(item.lastUsedAt)}
                      </td>
                      {panelOpen ? null : (
                        <td className="hidden px-4 py-3 text-[var(--muted)] lg:table-cell">
                          {item.folderId ? <span className="folder-badge"><UiIcon name="folder" size={13} /><span className="truncate">{folders.find((folder) => folder.id === item.folderId)?.name || "—"}</span></span> : <span className="text-xs">Sin carpeta</span>}
                        </td>
                      )}
                      <td className="pr-3"><button type="button" className="row-open" aria-label={`Abrir ${itemTitle(item)}`} onClick={(e) => { e.stopPropagation(); openItem(item.id); }}><UiIcon name="chevron" size={17} /></button></td>
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
            className="fixed inset-0 z-20 bg-black/20 lg:hidden"
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

function Banner({ href, title, text, icon, tone, action }: { href: string; title: string; text: string; icon: IconName; tone: "blue" | "violet" | "teal"; action: string }) {
  return (
    <article className={`advice-card advice-${tone}`}>
      <div className="mb-3 flex items-center gap-3"><span className="advice-icon"><UiIcon name={icon} size={20} /></span><h3 className="text-sm font-semibold">{title}</h3></div>
      <p className="flex-1 text-xs leading-relaxed text-[var(--muted)]">{text}</p>
      <Link href={href} className="advice-action">{action}<UiIcon name="arrow" size={15} /></Link>
    </article>
  );
}
