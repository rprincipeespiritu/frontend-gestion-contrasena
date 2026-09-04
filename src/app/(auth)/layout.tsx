import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-black text-slate-950">
            C
          </Link>
          <Link href="/" className="block">
            <div className="font-semibold">CifraLock</div>
            <div className="text-xs text-[var(--muted)]">Bóveda cifrada de extremo a extremo</div>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
