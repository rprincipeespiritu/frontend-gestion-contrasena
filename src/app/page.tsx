import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { TRIAL_DAYS } from "@/lib/plan";

export const metadata: Metadata = {
  title: "CifraLock — Gestor de contraseñas cifrado",
  description:
    `Bóveda de contraseñas con cifrado de extremo a extremo, máscaras de email y ${TRIAL_DAYS} días de Premium al crear tu cuenta.`,
};

export default function Home() {
  return <LandingPage />;
}
