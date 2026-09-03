"use client";

import { useEffect, useState } from "react";
import { LockGate } from "@/components/lock-gate";
import { CopyButton } from "@/components/copy-button";
import { ApiError, api } from "@/lib/api";
import { useVault } from "@/components/vault-provider";

type Mask = {
  id: string;
  localPart: string;
  address: string;
  label: string | null;
  enabled: boolean;
  createdAt: string;
};

type MasksPayload = {
  domain: string | null;
  forwardingReady: boolean;
  mailConfigured: boolean;
  inboundSecretConfigured: boolean;
  masks: Mask[];
};

export default function MasksPage() {
  return (
    <LockGate>
      <MasksInner />
    </LockGate>
  );
}

function MasksInner() {
  const { createItem } = useVault();
  const [domain, setDomain] = useState<string | null>(null);
  const [forwardingReady, setForwardingReady] = useState(false);
  const [mailConfigured, setMailConfigured] = useState(false);
  const [inboundSecretConfigured, setInboundSecretConfigured] = useState(false);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const data = await api<MasksPayload>("/api/masks");
    setDomain(data.domain);
    setForwardingReady(data.forwardingReady);
    setMailConfigured(Boolean(data.mailConfigured));
    setInboundSecretConfigured(Boolean(data.inboundSecretConfigured));
    setMasks(data.masks);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las máscaras");
    });
  }, []);

  async function createMask() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api<Mask>("/api/masks", {
        method: "POST",
        body: JSON.stringify({ label }),
      });
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la máscara");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(mask: Mask) {
    setError(null);
    try {
      const updated = await api<Mask>(`/api/masks/${mask.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !mask.enabled }),
      });
      setMasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar la máscara");
    }
  }

  async function remove(mask: Mask) {
    if (!window.confirm(`¿Eliminar ${mask.address}? Los sitios que usen este alias dejarán de reenviar.`)) {
      return;
    }
    setError(null);
    try {
      await api(`/api/masks/${mask.id}`, { method: "DELETE" });
      setMasks((current) => current.filter((item) => item.id !== mask.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la máscara");
    }
  }

  async function saveToVault(mask: Mask) {
    setError(null);
    setNotice(null);
    try {
      await createItem({
        type: "login",
        folderId: null,
        favorite: false,
        data: {
          name: mask.label || `Máscara ${mask.address}`,
          username: mask.address,
          password: "",
          url: "",
          notes: "Alias de correo de CifraLock. El reenvío se gestiona en Enmascarar email.",
        },
      });
      setNotice(`Guardado en la bóveda: ${mask.address}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar en la bóveda");
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Enmascarar email</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">…para no exponer tu correo real.</p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Benefit
          title="Oculta tu identidad"
          text="Usa un alias distinto cada vez que un sitio pida tu email."
        />
        <Benefit
          title="Menos filtraciones"
          text="Si un sitio se filtra, no publican tu correo principal."
        />
        <Benefit
          title="Controla tu bandeja"
          text="Activa o pausa el reenvío de cada máscara cuando quieras."
        />
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold">Crear máscara</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{forwardingStatus(domain, forwardingReady, mailConfigured, inboundSecretConfigured)}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Sitio o nota (opcional), p. ej. Amazon"
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void createMask()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Creando…" : "Nueva máscara"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-[var(--accent)]">{notice}</p> : null}
      </div>

      <div className="mt-6 space-y-3">
        {masks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-12 text-center text-sm text-[var(--muted)]">
            Aún no tienes máscaras. Crea una para dejar de usar tu email real en registros.
          </div>
        ) : (
          masks.map((mask) => (
            <div
              key={mask.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-base break-all">{mask.address}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {mask.label || "Sin etiqueta"} ·{" "}
                    {mask.enabled ? "Reenvío activo" : "Reenvío pausado"}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={mask.enabled}
                    onChange={() => void toggle(mask)}
                    className="accent-[var(--accent)]"
                  />
                  Reenviar
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={mask.address} />
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  onClick={() => void saveToVault(mask)}
                >
                  Guardar en la bóveda
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface-2)]"
                  onClick={() => void remove(mask)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function forwardingStatus(
  domain: string | null,
  forwardingReady: boolean,
  mailConfigured: boolean,
  inboundSecretConfigured: boolean,
) {
  if (forwardingReady && domain) {
    return `Los mensajes a ${domain} se reenvían a tu correo de cuenta.`;
  }
  if (domain && !mailConfigured) {
    return `Dominio listo (${domain}). Falta SendGrid en Railway: SENDGRID_API_KEY y SENDGRID_FROM_EMAIL (el correo verificado en SendGrid).`;
  }
  if (domain && mailConfigured && !inboundSecretConfigured) {
    return `SendGrid está listo. Falta MASK_INBOUND_SECRET, el mismo token de la URL de Inbound Parse.`;
  }
  if (!domain) {
    return "Puedes crear alias ahora. Para reenvío real, MASK_EMAIL_DOMAIN debe ser mask.cifralock.com y SendGrid Inbound Parse debe estar activo.";
  }
  return "El reenvío aún no está listo.";
}

function Benefit({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{text}</p>
    </div>
  );
}
