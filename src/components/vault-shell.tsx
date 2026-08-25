"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useVault } from "@/components/vault-provider";
import { PasswordGenerator } from "@/components/password-generator";
import { itemMatchesQuery, itemSubtitle, itemTitle, type ItemType } from "@/lib/types";

type Filter = "all" | "favorites" | ItemType | `folder:${string}`;

export function VaultShell() {
  const { email, items, folders, lock, logout, createFolder, deleteFolder } = useVault();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [folderName, setFolderName] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (!itemMatchesQuery(item, query)) return false;
      if (filter === "all") return true;
      if (filter === "favorites") return item.favorite;
      if (filter === "login" || filter === "note" || filter === "card") return item.type === filter;
      if (filter.startsWith("folder:")) return item.folderId === filter.slice(7);
      return true;
    });
  }, [items, query, filter]);

  async function addFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    await createFolder(name);
    setFolderName("");
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex md:flex-col">
        <Brand />
        <nav className="mt-6 space-y-1 text-sm">
          <NavBtn active={filter === "all"} onClick={() => setFilter("all")}>
            Todas ({items.length})
          </NavBtn>
          <NavBtn active={filter === "favorites"} onClick={() => setFilter("favorites")}>
            Favoritos
          </NavBtn>
          <NavBtn active={filter === "login"} onClick={() => setFilter("login")}>
            Inicios de sesión
          </NavBtn>
          <NavBtn active={filter === "note"} onClick={() => setFilter("note")}>
            Notas
          </NavBtn>
          <NavBtn active={filter === "card"} onClick={() => setFilter("card")}>
            Tarjetas
          </NavBtn>
        </nav>
        <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Carpetas
        </div>
        <div className="mt-2 space-y-1">
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1">
              <NavBtn
                active={filter === `folder:${folder.id}`}
                onClick={() => setFilter(`folder:${folder.id}`)}
              >
                {folder.name}
              </NavBtn>
              <button
                type="button"
                title="Eliminar carpeta"
                onClick={() => void deleteFolder(folder.id)}
                className="rounded px-1 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => void addFolder(e)} className="mt-3 flex gap-1">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Nueva carpeta"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-2 text-xs font-semibold text-slate-950"
          >
            +
          </button>
        </form>
        <div className="mt-auto pt-6 text-xs text-[var(--muted)]">{email}</div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="md:hidden">
            <Brand compact />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en la bóveda"
            className="min-w-48 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm md:hidden"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="all">Todas</option>
            <option value="favorites">Favoritos</option>
            <option value="login">Inicios de sesión</option>
            <option value="note">Notas</option>
            <option value="card">Tarjetas</option>
            {folders.map((folder) => (
              <option key={folder.id} value={`folder:${folder.id}`}>
                {folder.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-slate-950"
            >
              Nuevo
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1 text-sm">
                <Link className="block rounded px-3 py-2 hover:bg-[var(--surface)]" href="/item/new?type=login">
                  Inicio de sesión
                </Link>
                <Link className="block rounded px-3 py-2 hover:bg-[var(--surface)]" href="/item/new?type=note">
                  Nota segura
                </Link>
                <Link className="block rounded px-3 py-2 hover:bg-[var(--surface)]" href="/item/new?type=card">
                  Tarjeta
                </Link>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowGenerator((v) => !v)}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            Generador
          </button>
          <button
            type="button"
            onClick={lock}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            Bloquear
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]"
          >
            Salir
          </button>
        </header>

        {showGenerator ? (
          <div className="border-b border-[var(--border)] p-4">
            <PasswordGenerator />
          </div>
        ) : null}

        <div className="flex-1 overflow-auto p-4">
          {visible.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-[var(--muted)]">
              <p className="text-sm">No hay ítems en esta vista.</p>
              <Link href="/item/new?type=login" className="mt-3 text-sm text-[var(--accent)]">
                Crear el primero
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              {visible.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/item/${item.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)]"
                  >
                    <TypeBadge type={item.type} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {item.favorite ? "★ " : ""}
                        {itemTitle(item)}
                      </div>
                      <div className="truncate text-xs text-[var(--muted)]">
                        {itemSubtitle(item)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-slate-950">
        V
      </div>
      {compact ? null : <div className="font-semibold tracking-tight">Vault</div>}
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-1.5 text-left ${
        active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
      }`}
    >
      {children}
    </button>
  );
}

function TypeBadge({ type }: { type: ItemType }) {
  const label = type === "login" ? "🔑" : type === "note" ? "📝" : "💳";
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm">
      {label}
    </div>
  );
}
