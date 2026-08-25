"use client";

import { LockGate } from "@/components/lock-gate";

export default function SharedPage() {
  return (
    <LockGate>
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Elementos compartidos</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
          El modelo zero-knowledge de esta versión es personal: el servidor no puede descifrar
          ni reenviar claves a otras cuentas. El uso compartido cifrado entre usuarios se podrá
          añadir más adelante.
        </p>
      </div>
    </LockGate>
  );
}
