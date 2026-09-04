import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "CifraLock — Gestor de contraseñas cifrado",
  description:
    "Bóveda de contraseñas con cifrado de extremo a extremo, máscaras de email y 14 días de Premium al crear tu cuenta.",
};

export default function Home() {
  return <LandingPage />;
}
