"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import { useTournament } from "./TournamentProvider";
import { hasPlayoffs } from "@/lib/tournament";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data } = useTournament();
  const playoffsVisible = hasPlayoffs(data);
  const links = [
    ["Inicio", "#inicio"],
    ["Equipos", "#equipos"],
    ["Partidas", "#partidas"],
    ["Posiciones", "#posiciones"],
    ["Grupos", "#grupos"],
    ...(playoffsVisible ? [["Playoffs", "#playoffs"]] : []),
    ["Reglas", "#reglas"]
  ];

  return (
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="Ir al inicio">
        <img src="/logo-camicup.webp" alt="CamiCup" width={62} height={62} />
        <div>
          <strong>CamiCup</strong>
          <span>Dota 2 Tournament</span>
        </div>
      </a>

      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Abrir menú">
        <Icon name={open ? "close" : "menu"} />
      </button>

      <nav className={open ? "nav-links open" : "nav-links"}>
        {links.map(([label, href]) => (
          <a key={`${label}-${href}`} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <Link className="admin-link" href="/admin"><Icon name="settings" size={17} /> Administrar</Link>
      </nav>
    </header>
  );
}
