"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type CheckoutConfig = { environment: "sandbox" | "production"; clientToken: string };
type PaddleClient = {
  Environment: { set: (environment: "sandbox" | "production") => void };
  Initialize: (options: {
    token: string;
    checkout: { settings: { displayMode: "overlay"; locale: string; successUrl: string } };
    eventCallback: (event: { name: string }) => void;
  }) => void;
};

export default function CheckoutPage() {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Preparando tu pago…");
  const initialized = useRef(false);

  useEffect(() => {
    let canceled = false;
    async function prepare() {
      const transactionId = new URLSearchParams(window.location.search).get("_ptxn");
      if (!transactionId || !/^txn_[a-z0-9]{26}$/.test(transactionId)) {
        throw new Error("El enlace de pago no es válido. Vuelve a Plan y suscripción para iniciar el pago.");
      }
      const data = await api<{ paddle: CheckoutConfig | null }>("/api/billing/config");
      if (!data.paddle?.clientToken) throw new Error("El pago aún no está configurado. Contacta con soporte.");
      if (!canceled) setConfig(data.paddle);
    }
    void prepare().catch((err: unknown) => {
      if (!canceled) setError(err instanceof Error ? err.message : "No se pudo preparar el pago.");
    });
    return () => { canceled = true; };
  }, []);

  function openCheckout() {
    if (!config || initialized.current) return;
    const paddle = (window as Window & { Paddle?: PaddleClient }).Paddle;
    if (!paddle) { setError("No se pudo cargar el formulario de pago."); return; }
    try {
      initialized.current = true;
      paddle.Environment.set(config.environment);
      // Paddle.js opens the transaction from _ptxn automatically. Do not open it twice.
      paddle.Initialize({
        token: config.clientToken,
        checkout: { settings: { displayMode: "overlay", locale: "es", successUrl: `${window.location.origin}/plan?checkout=success` } },
        eventCallback: (event) => {
          if (event.name === "checkout.closed") setStatus("Cerraste el formulario de pago. Puedes volver a abrir este enlace.");
          if (event.name === "checkout.loaded") setStatus("Completa el pago en el formulario de Paddle.");
          if (event.name === "checkout.error" || event.name === "checkout.payment.error") setError("No se pudo completar el pago. Revisa el formulario o vuelve a intentarlo.");
        },
      });
    } catch {
      initialized.current = false;
      setError("No se pudo abrir el formulario de pago. Vuelve a intentarlo.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-5 p-8">
      <p className="text-sm text-[var(--muted)]">CifraLock</p>
      <h1 className="text-2xl font-semibold">Completa tu suscripción</h1>
      <p role={error ? "alert" : "status"}>{error || status}</p>
      {config?.environment === "sandbox" && <p className="text-sm text-[var(--muted)]">Modo de prueba: no se realizan cobros reales.</p>}
      <button className="rounded-lg border p-3" onClick={() => window.location.reload()}>Volver a abrir el pago</button>
      <a className="underline" href="/plan">Volver a Plan y suscripción</a>
      {config && <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onReady={openCheckout} onError={() => setError("No se pudo cargar Paddle. Comprueba tu conexión y vuelve a intentarlo.")} />}
    </main>
  );
}