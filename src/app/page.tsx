"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api("/api/auth/me")
      .then(() => router.replace("/vault"))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
      Cargando…
    </div>
  );
}
