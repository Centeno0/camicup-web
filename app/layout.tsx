import type { Metadata } from "next";
import "./globals.css";
import { TournamentProvider } from "@/components/TournamentProvider";

export const metadata: Metadata = {
  title: "CamiCup | Torneo de Dota 2",
  description: "Sitio oficial administrable de CamiCup, torneo de Dota 2.",
  icons: { icon: "/logo-camicup.webp" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><TournamentProvider>{children}</TournamentProvider></body>
    </html>
  );
}
