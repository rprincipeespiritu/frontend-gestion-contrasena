"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";

const FEATURES = [
  {
    title: "Cifrado de extremo a extremo",
    text: "La contraseña maestra nunca sale del navegador. El servidor solo guarda datos cifrados.",
  },
  {
    title: "Enmascarar email",
    text: "Crea alias para no exponer tu correo real. Pausa el reenvío cuando un sitio se vuelva spam.",
  },
  {
    title: "Salud y filtraciones",
    text: "Detecta contraseñas débiles o reutilizadas y revisa si aparecen en filtraciones conocidas.",
  },
  {
    title: "Documentos y tarjetas",
    text: "Guarda inicios de sesión, notas, tarjetas, contactos y archivos cifrados en un solo lugar.",
  },
];

export function LandingPage() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
  }, []);

  return (
    <div className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-black text-slate-950">
              C
            </span>
            <span>
              <span className="block font-semibold">CifraLock</span>
              <span className="block text-xs text-[var(--muted)]">Gestor de contraseñas</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <a href="#planes" className="hidden rounded-lg px-3 py-2 text-[var(--muted)] hover:text-[var(--foreground)] sm:inline">
              Planes
            </a>
            {signedIn ? (
              <Link
                href="/vault"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white"
              >
                Ir a la bóveda
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-[var(--muted)] hover:text-[var(--foreground)]">
                  Iniciar sesión
                </Link>
                <Link
                  href="/register?trial=1"
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white"
                >
                  Probar 14 días
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--accent)]">Privacidad de verdad</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Tu bóveda, cifrada. Tus alias, bajo control.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              CifraLock guarda contraseñas, notas y documentos con cifrado AES-256 en el navegador.
              Crea una cuenta, activa 14 días de Premium y deja de usar el mismo correo en cada registro.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <Link href="/vault" className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white">
                  Abrir bóveda
                </Link>
              ) : (
                <>
                  <Link
                    href="/register?trial=1"
                    className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Crear cuenta y activar prueba
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold"
                  >
                    Ya tengo cuenta
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Así se ve una máscara</div>
            <div className="mt-4 rounded-2xl bg-[var(--surface-2)] p-4 font-mono text-lg">faro4821@mask.cifralock.com</div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              El sitio nunca ve tu correo real. Si se filtra, pausas el reenvío y tu bandeja principal queda a salvo.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-[var(--accent)]">●</span> Contraseña maestra solo en tu dispositivo</li>
              <li className="flex gap-2"><span className="text-[var(--accent)]">●</span> 14 días de Premium al crear la cuenta</li>
              <li className="flex gap-2"><span className="text-[var(--accent)]">●</span> Pasa a suscripción cuando quieras</li>
            </ul>
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="planes" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold">Elige cómo empiezas</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              El plan gratuito cubre lo esencial. La prueba desbloquea Premium 14 días. Luego puedes suscribirte.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <PlanCard
              name="Gratuito"
              price="Siempre gratis"
              points={["Hasta 50 elementos en la bóveda", "1 máscara de email", "Generador, salud y filtraciones"]}
              href={signedIn ? "/plan" : "/register"}
              cta={signedIn ? "Ver mi plan" : "Crear cuenta gratis"}
            />
            <PlanCard
              name="Prueba"
              price="14 días"
              highlight
              points={["Todo lo de Premium", "Máscaras ilimitadas (hasta 100)", "Bóveda sin el tope de 50 elementos"]}
              href={signedIn ? "/plan" : "/register?trial=1"}
              cta={signedIn ? "Activar o ver prueba" : "Activar plan de prueba"}
            />
            <PlanCard
              name="Premium"
              price="US$ 4,99 / mes"
              points={["Suscripción mensual", "Límites de Premium de forma continua", "Cancela cuando quieras desde tu cuenta"]}
              href={signedIn ? "/plan" : "/register?trial=1"}
              cta={signedIn ? "Ir a suscripción" : "Empezar y luego suscribirme"}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-[var(--muted)] sm:px-6">
          <span>CifraLock — cifrado de extremo a extremo</span>
          <div className="flex gap-4">
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/register?trial=1">Crear cuenta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  points,
  href,
  cta,
  highlight = false,
}: {
  name: string;
  price: string;
  points: string[];
  href: string;
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-[var(--surface)] p-6 ${
        highlight ? "border-[var(--accent)] shadow-sm" : "border-[var(--border)]"
      }`}
    >
      <div className="text-sm font-semibold text-[var(--accent)]">{name}</div>
      <div className="mt-2 text-2xl font-semibold">{price}</div>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--muted)]">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
          highlight
            ? "bg-[var(--accent)] text-white"
            : "border border-[var(--border)] hover:border-[var(--accent)]"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
