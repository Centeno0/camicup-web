"use client";

import { useMemo } from "react";
import { useTournament } from "./TournamentProvider";
import { SiteHeader } from "./SiteHeader";
import { Icon } from "./Icon";
import { activeTeams, computeStandings, formatDate, formatMoney } from "@/lib/tournament";
import type { Match, Team } from "@/lib/types";

const teamLogo: Record<string, string> = {
  ositos: "/teams/ositos.webp",
  gatitos: "/teams/gatitos.webp",
  aleroif: "/teams/aleroif.webp",
  monopolio: "/teams/monopolio.webp",
  shiro: "/teams/shiro.webp",
  luz: "/teams/luz.webp",
};

const roleLabel: Record<string, string> = {
  HC: "HC",
  MID: "MID",
  OFF: "OFF",
  "Support 4": "SUP 4",
  "Support 5": "SUP 5",
};

function TeamLogo({ team, size = 56 }: { team: Team; size?: number }) {
  const src = team.logo || teamLogo[team.id];
  return (
    <span className="final-team-logo" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={`Logo de ${team.name}`} width={size} height={size} loading="eager" /> : <b>{team.shortName.slice(0, 2)}</b>}
    </span>
  );
}

function HeroPrize({ first, second }: { first: number; second: number }) {
  return (
    <aside className="final-prize-card">
      <div className="final-prize-head">
        <span>PRIZE POOL</span>
        <strong>{formatMoney(first + second)}</strong>
        <small>Distribución oficial del premio</small>
      </div>
      <div className="final-prize-row"><span>1.er lugar</span><b>{formatMoney(first)}</b></div>
      <div className="final-prize-row"><span>2.º lugar</span><b>{formatMoney(second)}</b></div>
    </aside>
  );
}

function TeamRosterCard({ team }: { team: Team }) {
  const totalMmr = team.players.reduce((sum, player) => sum + player.mmr, 0);
  return (
    <article className="final-team-card" style={{ ["--team-accent" as string]: team.accent }}>
      <header className="final-team-header">
        <TeamLogo team={team} size={104} />
        <div className="final-team-heading">
          <span>GRUPO {team.group}</span>
          <h3>{team.name}</h3>
          <p>Capitán/a: <strong>{team.captain}</strong></p>
        </div>
        <div className="final-team-mmr"><strong>{totalMmr.toFixed(1)}k</strong><span>MMR TOTAL</span></div>
      </header>

      <div className="final-players-grid">
        {team.players.map((player) => (
          <div className={`final-player-card ${player.captain ? "captain" : ""}`} key={player.id}>
            <div className="final-player-top">
              <span className="final-role">{roleLabel[player.position] ?? player.position}</span>
              {player.captain ? <span className="final-captain-label">CAP</span> : null}
            </div>
            <strong>{player.name}</strong>
            <div className="final-player-meta"><span>{player.mmr.toFixed(1)}k MMR</span><code>{player.dotaId}</code></div>
          </div>
        ))}
      </div>
    </article>
  );
}

function TeamsSection({ teams }: { teams: Team[] }) {
  return (
    <section className="final-section final-teams-section" id="equipos">
      <div className="final-section-heading">
        <span>EQUIPOS PARTICIPANTES</span>
        <h2>Equipos y lista oficial de jugadoras</h2>
        <p>Cada cuadro grande muestra el logo del equipo, la capitana y debajo a todas sus jugadoras con rol, MMR e ID de Dota 2.</p>
      </div>
      <div className="final-teams-grid">
        {teams.map((team) => <TeamRosterCard key={team.id} team={team} />)}
      </div>
    </section>
  );
}

function GroupBoard({ group, teams }: { group: "A" | "B"; teams: Team[] }) {
  const groupTeams = teams.filter((team) => team.group === group);
  return (
    <article className={`final-group-card group-${group}`}>
      <header>
        <div><span>GRUPO {group}</span><h3>{groupTeams.length} equipos</h3></div>
        <small>Todos contra todos</small>
      </header>
      <div className="final-group-list">
        {groupTeams.map((team, index) => (
          <div className="final-group-row" key={team.id}>
            <span className="final-seed">0{index + 1}</span>
            <TeamLogo team={team} size={62} />
            <div><strong>{team.name}</strong><small>Capitán/a: {team.captain}</small></div>
          </div>
        ))}
      </div>
    </article>
  );
}

function GroupsSection({ teams }: { teams: Team[] }) {
  return (
    <section className="final-section final-groups-section" id="grupos">
      <div className="final-section-heading centered">
        <span>FASE DE GRUPOS</span>
        <h2>Grupos del torneo</h2>
        <p>Cada grupo reúne tres equipos. Una victoria otorga 1 punto.</p>
      </div>
      <div className="final-groups-grid"><GroupBoard group="A" teams={teams} /><GroupBoard group="B" teams={teams} /></div>
      <a className="final-outline-button" href="#posiciones">Ver tabla de posiciones <Icon name="arrow" size={17} /></a>
    </section>
  );
}

function MatchTeam({ team, size = 76 }: { team: Team; size?: number }) {
  return <div className="final-match-team"><TeamLogo team={team} size={size} /><strong>{team.name}</strong></div>;
}

function matchSortValue(match: Match) {
  return `${match.date}T${match.time}`;
}

function FeaturedMatch({ match, teams }: { match: Match; teams: Team[] }) {
  const a = teams.find((team) => team.id === match.teamA);
  const b = teams.find((team) => team.id === match.teamB);
  if (!a || !b) return null;
  const live = match.status === "En vivo";

  return (
    <article className={`final-main-match ${live ? "is-live" : ""}`}>
      <div className="final-main-match-label">
        <Icon name={live ? "live" : "calendar"} size={16} />
        {live ? "PARTIDA EN VIVO" : "PRÓXIMO ENFRENTAMIENTO"}
      </div>
      <MatchTeam team={a} />
      <div className="final-match-center">
        <span>{live ? "EN VIVO" : "VS"}</span>
        <strong>{live ? `${match.scoreA} — ${match.scoreB}` : match.time}</strong>
        <small>{live ? `${match.time} · ${formatDate(match.date)}` : formatDate(match.date)}</small>
      </div>
      <MatchTeam team={b} />
      <div className="final-match-format"><strong>Grupo {a.group} · BO{match.bestOf}</strong><span>{match.stage}</span></div>
    </article>
  );
}

function UpcomingMatches({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const live = [...matches]
    .filter((match) => match.status === "En vivo")
    .sort((a, b) => matchSortValue(a).localeCompare(matchSortValue(b)));
  const scheduled = [...matches]
    .filter((match) => match.status === "Programado")
    .sort((a, b) => matchSortValue(a).localeCompare(matchSortValue(b)));
  const featured = live[0] ?? scheduled[0];
  const upcoming = scheduled.filter((match) => match.id !== featured?.id).slice(0, 6);

  return (
    <section className="final-section final-matches-section" id="partidas">
      <div className="final-section-heading">
        <span>{live.length ? "AHORA" : "CALENDARIO"}</span>
        <h2>{live.length ? "Partida en vivo" : "Próximos encuentros"}</h2>
        <p>{live.length ? "El marcador se actualiza desde administración y se refleja aquí en tiempo real." : "Las nuevas partidas se ordenan automáticamente por fecha y hora."}</p>
      </div>
      {featured ? <FeaturedMatch match={featured} teams={teams} /> : <div className="final-empty-panel">No hay encuentros programados.</div>}
      {upcoming.length ? (
        <>
          <div className="final-subheading"><span>PRÓXIMAMENTE</span><h3>Siguientes partidas</h3></div>
          <div className="final-upcoming-grid">
            {upcoming.map((match) => {
              const a = teams.find((team) => team.id === match.teamA);
              const b = teams.find((team) => team.id === match.teamB);
              if (!a || !b) return null;
              return (
                <article className="final-mini-match" key={match.id}>
                  <div className="final-mini-date"><span>{formatDate(match.date)}</span><strong>{match.time}</strong></div>
                  <div className="final-mini-teams">
                    <div><TeamLogo team={a} size={44} /><b>{a.name}</b></div>
                    <span>VS</span>
                    <div><TeamLogo team={b} size={44} /><b>{b.name}</b></div>
                  </div>
                  <small>Grupo {a.group} · BO{match.bestOf} · {match.stage}</small>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ResultsSection({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const finished = [...matches]
    .filter((match) => match.status === "Finalizado")
    .sort((a, b) => matchSortValue(b).localeCompare(matchSortValue(a)));
  if (!finished.length) return null;

  return (
    <section className="final-section final-results-section" id="resultados">
      <div className="final-section-heading">
        <span>HISTORIAL</span>
        <h2>Resultados recientes</h2>
        <p>Las partidas finalizadas no se borran: pasan automáticamente a este historial.</p>
      </div>
      <div className="final-results-grid">
        {finished.slice(0, 8).map((match) => {
          const a = teams.find((team) => team.id === match.teamA);
          const b = teams.find((team) => team.id === match.teamB);
          if (!a || !b) return null;
          const winnerA = match.scoreA > match.scoreB;
          const winnerB = match.scoreB > match.scoreA;
          return (
            <article className="final-result-card" key={match.id}>
              <div className="final-result-meta"><span>FINALIZADO</span><b>{formatDate(match.date)} · {match.time}</b></div>
              <div className={`final-result-team ${winnerA ? "winner" : ""}`}><TeamLogo team={a} size={46}/><strong>{a.name}</strong><b>{match.scoreA}</b></div>
              <div className={`final-result-team ${winnerB ? "winner" : ""}`}><TeamLogo team={b} size={46}/><strong>{b.name}</strong><b>{match.scoreB}</b></div>
              <small>Grupo {a.group} · BO{match.bestOf} · {match.stage}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KickCard({ channel }: { channel: string }) {
  return (
    <section className="final-section final-kick-section" id="en-vivo">
      <div className="final-kick-header">
        <div>
          <span>TRANSMISIÓN OFICIAL</span>
          <h2>Partidas en vivo por KICK</h2>
          <p>Canal oficial: <strong>kick.com/{channel}</strong></p>
        </div>
        <a href={`https://kick.com/${channel}`} target="_blank" rel="noreferrer">Abrir en Kick <Icon name="arrow" size={18} /></a>
      </div>
      <div className="final-kick-player">
        <iframe
          src={`https://player.kick.com/${channel}`}
          title={`Transmisión oficial CamiCup en Kick - ${channel}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="final-kick-footer"><span><Icon name="live" size={17} /> TRANSMISIÓN OFICIAL</span><p>Si el reproductor no inicia automáticamente, pulsa play o abre el canal directamente en Kick.</p></div>
    </section>
  );
}

function StandingsTable({ group, standings }: { group: "A" | "B"; standings: ReturnType<typeof computeStandings> }) {
  const rows = standings.filter((row) => row.team.group === group).sort((a, b) => b.points - a.points || b.differential - a.differential || b.mapsWon - a.mapsWon);
  return (
    <article className="accurate-standing-card" id={group === "A" ? "posiciones" : undefined}>
      <header><span>CLASIFICACIÓN</span><h3>Grupo {group}</h3></header>
      <table>
        <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>Mapas</th><th>Pts</th></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team.id}>
              <td>{index + 1}</td>
              <td><div className="accurate-table-team"><TeamLogo team={row.team} size={32} /><b>{row.team.name}</b></div></td>
              <td>{row.played}</td><td>{row.wins}</td><td>{row.losses}</td><td>{row.mapsWon}-{row.mapsLost}</td><td><strong>{row.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <small>1 punto por victoria</small>
    </article>
  );
}

function BackgroundFX() {
  return <div className="accurate-background" aria-hidden="true" />;
}

export function TournamentSite() {
  const { data } = useTournament();
  const teams = useMemo(() => activeTeams(data), [data]);
  const standings = useMemo(() => computeStandings(data), [data]);

  return (
    <main className="accurate-site final-public-site">
      <BackgroundFX />
      <SiteHeader />

      <section className="accurate-hero" id="inicio">
        <div className="accurate-copy">
          <div className="accurate-eyebrow"><span /> PRIMERA EDICIÓN</div>
          <h1>Torneo<br /><em>CamiCup</em></h1>
         <p>
  Primera edición oficial de la competencia.
  <br />
  <span style={{ fontSize: "0.82em", opacity: 0.75 }}>
    Organizado por <strong>Spektra68</strong> y <strong>Dylan</strong>
  </span>
</p>
          <div className="accurate-actions">
            <a className="primary" href="#partidas">Ver enfrentamientos</a>
            <a className="secondary" href="#reglas">Conocer las reglas <span>→</span></a>
          </div>
        </div>
        <div className="accurate-logo-wrap"><div className="accurate-logo-glow" /><img src="/logo-camicup.webp" alt="Logo CamiCup" width={680} height={680} className="accurate-hero-logo" /></div>
        <HeroPrize first={data.config.prizeFirst} second={data.config.prizeSecond} />
      </section>

      <section className="accurate-stats-bar final-stats final-stats-three" aria-label="Resumen del torneo">
        <div className="accurate-stat-item"><div className="accurate-stat-copy"><strong>{data.config.teamCount}</strong><span>EQUIPOS CONFIRMADOS</span><small>Seis escuadras oficiales en competencia</small></div></div>
        <div className="accurate-stat-item final-stat-center"><div className="accurate-stat-copy date"><strong>13–16 AGO. 2026</strong><span>FECHAS OFICIALES</span><small>Inicio: 13 de agosto · Gran final: 16 de agosto</small></div></div>
        <div className="accurate-stat-item"><div className="accurate-stat-copy"><strong>2</strong><span>GRUPOS</span><small>Grupo A y Grupo B · todos contra todos</small></div></div>
      </section>

      <TeamsSection teams={teams} />
      <GroupsSection teams={teams} />
      <UpcomingMatches matches={data.matches} teams={teams} />
      <KickCard channel={data.config.kickChannel} />
      <ResultsSection matches={data.matches} teams={teams} />

      <section className="accurate-standings-section final-standing-section">
        <div className="final-section-heading centered"><span>POSICIONES</span><h2>Tabla de puntos</h2><p>Clasificación actual por grupos.</p></div>
        <div className="accurate-standings-grid"><StandingsTable group="A" standings={standings} /><StandingsTable group="B" standings={standings} /></div>
      </section>

      <section className="accurate-rules final-rules" id="reglas">
        <div className="final-section-heading centered"><span>REGLAMENTO</span><h2>Reglas principales</h2><p>Resumen oficial de la primera edición.</p></div>
        <div className="accurate-rules-grid">{data.rules.slice(0, 8).map((rule, index) => <article key={index}><span>{String(index + 1).padStart(2, "0")}</span><p>{rule}</p></article>)}</div>
      </section>
    </main>
  );
}
