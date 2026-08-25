"use client";

import { LockGate } from "@/components/lock-gate";
import { PasswordGenerator } from "@/components/password-generator";

export default function GeneratorPage() {
  return (
    <LockGate>
      <div className="mx-auto max-w-xl p-6">
        <h1 className="mb-4 text-2xl font-semibold">Generador de contraseñas</h1>
        <PasswordGenerator />
      </div>
    </LockGate>
  );
}
