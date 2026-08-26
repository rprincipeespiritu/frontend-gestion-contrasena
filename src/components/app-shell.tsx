"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useVault } from "@/components/vault-provider";
import { avatarErrorMessage, initialsFromEmail, uploadProfilePhoto } from "@/lib/avatar";

const NAV = [
  { href: "/vault", label: "Bóveda" },
  { href: "/shared", label: "Elementos compartidos" },
  { href: "/trash", label: "Papelera" },
];

const TOOLS = [
  { href: "/tools/generator", label: "Generador de contraseñas" },
  { href: "/tools/masks", label: "Enmascarar email" },
  { href: "/tools/health", label: "Salud de contraseñas" },
  { href: "/tools/breaches", label: "Filtraciones" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    locked,
    email,
    avatarUrl,
    search,
    setSearch,
    lock,
    logout,
    folders,
    createFolder,
    deleteFolder,
  } = useVault();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        lock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lock]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => {
      if (mq.matches) setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  useEffect(() => {
    if (!folderModalOpen) return;
    const t = window.setTimeout(() => folderInputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFolderModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [folderModalOpen]);

  if (locked) return <>{children}</>;

  function closeFolderModal() {
    setFolderModalOpen(false);
    setFolderName("");
    setFolderError(null);
  }

  async function addFolder(e?: React.FormEvent) {
    e?.preventDefault();
    const name = folderName.trim();
    if (!name) {
      setFolderError("Escribe un nombre para la carpeta");
      folderInputRef.current?.focus();
      return;
    }
    setFolderBusy(true);
    setFolderError(null);
    try {
      await createFolder(name);
      closeFolderModal();
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : "No se pudo crear la carpeta");
    } finally {
      setFolderBusy(false);
    }
  }

  const closeNav = () => setNavOpen(false);

  const sidebar = (mobile: boolean) => (
    <>
      <div className="mb-6 flex items-center justify-between gap-2 px-2">
        <Link href="/vault" onClick={closeNav} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-white">
            C
          </div>
          <span className="font-semibold">CifraBox</span>
        </Link>
        {mobile ? (
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeNav}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            ×
          </button>
        ) : null}
      </div>
      <nav className="space-y-1 text-sm">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeNav}
            className={`block rounded-lg px-3 py-2 ${
              pathname === item.href
                ? "bg-[var(--accent)]/10 font-medium text-[var(--accent)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 flex items-center justify-between px-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Carpetas
        </div>
        <button
          type="button"
          title="Añadir carpeta"
          onClick={() => {
            closeNav();
            setFolderModalOpen(true);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path d="M12 11v6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-auto">
        {folders.length === 0 ? (
          <p className="px-3 text-xs text-[var(--muted)]">Aún no hay carpetas.</p>
        ) : null}
        {folders.map((folder) => (
          <div key={folder.id} className="flex items-center">
            <Link
              href={`/vault?folder=${folder.id}`}
              onClick={closeNav}
              className={`min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--surface-2)] ${
                pathname === "/vault"
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {folder.name}
            </Link>
            <button
              type="button"
              title="Eliminar carpeta"
              className="px-2 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
              onClick={() => void deleteFolder(folder.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="mt-auto shrink-0 space-y-1 pt-6 text-sm">
        {TOOLS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeNav}
            className={`block rounded-lg px-3 py-2 ${
              pathname === item.href
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-full flex-1">
      <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4 md:flex">
        {sidebar(false)}
      </aside>

      {navOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeNav}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4 shadow-xl transition-transform duration-200 md:hidden ${
          navOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
        aria-hidden={!navOpen}
      >
        {sidebar(true)}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-3 md:grid md:grid-cols-[1fr_minmax(12rem,36rem)_auto] md:gap-4 md:px-6">
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--surface-2)] md:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="hidden md:block" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar todos los elementos  Ctrl + F"
            className="min-w-0 w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="relative justify-self-end">
            <button
              type="button"
              aria-label="Menú de perfil"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full ring-2 ring-transparent hover:ring-[var(--border)]"
            >
              <Avatar email={email} url={avatarUrl} size={36} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 text-sm shadow-lg">
                <div className="flex flex-col items-center px-3 py-4">
                  <ProfilePhotoPicker />
                  <div className="mt-3 truncate text-center font-medium">{email}</div>
                  <div className="text-xs text-[var(--muted)]">Plan gratuito</div>
                </div>
                <Link
                  href="/settings"
                  className="block rounded-lg px-3 py-2 hover:bg-[var(--surface-2)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Ajustes y recuperación
                </Link>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                  onClick={() => {
                    setMenuOpen(false);
                    lock();
                    router.push("/unlock");
                  }}
                >
                  Bloquear app  Ctrl + L
                </button>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-[var(--danger)] hover:bg-[var(--surface-2)]"
                  onClick={() => void logout()}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {folderModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={closeFolderModal}
        >
          <form
            onSubmit={(e) => void addFolder(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Añadir carpeta</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={closeFolderModal}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              >
                ×
              </button>
            </div>
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--accent)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <input
                ref={folderInputRef}
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  if (folderError) setFolderError(null);
                }}
                placeholder="Nombre de la carpeta"
                autoComplete="off"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pr-3 pl-10 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            {folderError ? (
              <p className="mt-2 text-sm text-[var(--danger)]">{folderError}</p>
            ) : null}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={folderBusy || !folderName.trim()}
                className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:bg-[#c5cdd4] disabled:text-white"
              >
                {folderBusy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({
  email,
  url,
  size,
}: {
  email: string;
  url: string | null;
  size: number;
}) {
  const initials = initialsFromEmail(email);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-[var(--accent)] font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

function ProfilePhotoPicker() {
  const { email, avatarUrl, setAvatarUrl } = useVault();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadProfilePhoto(file);
      setAvatarUrl(url);
    } catch (err) {
      setError(avatarErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <Avatar email={email} url={avatarUrl} size={88} />
      <button
        type="button"
        title="Cambiar foto"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] shadow disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {error ? (
        <p className="absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 text-center text-[11px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

