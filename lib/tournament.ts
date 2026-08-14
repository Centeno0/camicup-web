import type { Match, Standing, Team, TournamentData } from "./types";

export function activeTeams(data: TournamentData): Team[] {
  return data.teams.slice(0, data.config.teamCount);
}

export function computeStandings(data: TournamentData): Standing[] {
  const teams = activeTeams(data);
  const table = new Map<string, Standing>();

  teams.forEach((team) => {
    table.set(team.id, {
      team,
      played: 0,
      wins: 0,
      losses: 0,
      mapsWon: 0,
      mapsLost: 0,
      differential: 0,
      points: 0
    });
  });

  data.matches
    .filter((match) => match.status === "Finalizado" && match.stage === "Todos contra todos")
    .forEach((match) => {
      const a = table.get(match.teamA);
      const b = table.get(match.teamB);
      if (!a || !b) return;

      a.played += 1;
      b.played += 1;
      a.mapsWon += match.scoreA;
      a.mapsLost += match.scoreB;
      b.mapsWon += match.scoreB;
      b.mapsLost += match.scoreA;

      if (match.scoreA > match.scoreB) {
        a.wins += 1;
        b.losses += 1;
        a.points += data.config.winPoints;
      } else if (match.scoreB > match.scoreA) {
        b.wins += 1;
        a.losses += 1;
        b.points += data.config.winPoints;
      }
    });

  return [...table.values()]
    .map((standing) => ({
      ...standing,
      differential: standing.mapsWon - standing.mapsLost
    }))
    .sort((a, b) =>
      (a.team.group ?? "A").localeCompare(b.team.group ?? "A") ||
      b.points - a.points ||
      b.differential - a.differential ||
      b.mapsWon - a.mapsWon ||
      a.team.name.localeCompare(b.team.name)
    );
}

export function matchDateTime(match: Match): Date {
  return new Date(`${match.date}T${match.time}:00`);
}

export function nextMatch(data: TournamentData): Match | undefined {
  return [...data.matches]
    .filter((match) => match.status !== "Finalizado")
    .sort((a, b) => matchDateTime(a).getTime() - matchDateTime(b).getTime())[0];
}

export function formatDate(date: string): string {
  if (!date) return "Por definir";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0
  }).format(value);
}
