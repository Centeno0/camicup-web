import type { Match, PlayoffSlot, Standing, Team, TeamGroup, TournamentData } from "./types";

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

export function groupStandings(data: TournamentData, group: TeamGroup): Standing[] {
  return computeStandings(data)
    .filter((standing) => standing.team.group === group)
    .sort((a, b) => b.points - a.points || b.differential - a.differential || b.mapsWon - a.mapsWon || a.team.name.localeCompare(b.team.name));
}

function pairKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join("::");
}

export type GroupPairProgress = {
  group: TeamGroup;
  teamA: Team;
  teamB: Team;
  finished: boolean;
  match?: Match;
};

export function groupStageProgress(data: TournamentData) {
  const teams = activeTeams(data);
  const pairs: GroupPairProgress[] = [];

  (["A", "B"] as TeamGroup[]).forEach((group) => {
    const groupTeams = teams.filter((team) => team.group === group);
    for (let i = 0; i < groupTeams.length; i += 1) {
      for (let j = i + 1; j < groupTeams.length; j += 1) {
        const teamA = groupTeams[i];
        const teamB = groupTeams[j];
        const key = pairKey(teamA.id, teamB.id);
        const match = data.matches.find((item) =>
          item.stage === "Todos contra todos" &&
          pairKey(item.teamA, item.teamB) === key &&
          item.status === "Finalizado"
        );
        pairs.push({ group, teamA, teamB, finished: Boolean(match), match });
      }
    }
  });

  const completed = pairs.filter((pair) => pair.finished).length;
  const validTeamLayout = teams.filter((team) => team.group === "A").length === 3 && teams.filter((team) => team.group === "B").length === 3;
  return {
    pairs,
    completed,
    total: pairs.length,
    complete: validTeamLayout && pairs.length === 6 && completed === pairs.length
  };
}

export function hasPlayoffs(data: TournamentData): boolean {
  return data.matches.some((match) => Boolean(match.playoffSlot));
}

export function playoffMatch(data: TournamentData, slot: PlayoffSlot): Match | undefined {
  return data.matches.find((match) => match.playoffSlot === slot);
}

function playoffTemplate(
  slot: PlayoffSlot,
  teamA: string,
  teamB: string,
  bestOf: 1 | 3,
  stage: Match["stage"],
  bracket: Match["bracket"],
  playoffRound: string,
  finalDate: string,
  winnerTo?: PlayoffSlot,
  loserTo?: PlayoffSlot
): Match {
  return {
    id: `playoff-${slot}-${Date.now()}`,
    teamA,
    teamB,
    date: finalDate,
    time: "00:00",
    bestOf,
    stage,
    status: "Programado",
    scoreA: 0,
    scoreB: 0,
    bracket,
    playoffRound,
    playoffSlot: slot,
    winnerTo,
    loserTo
  };
}

export function generatePlayoffs(data: TournamentData): TournamentData {
  if (hasPlayoffs(data) || !groupStageProgress(data).complete) return data;

  const a = groupStandings(data, "A");
  const b = groupStandings(data, "B");
  if (a.length < 3 || b.length < 3) return data;

  const date = data.config.finalDate || data.config.startDate;
  const generated: Match[] = [
    playoffTemplate("UF", a[0].team.id, b[0].team.id, 3, "Upper", "upper", "Upper Bracket", date, "GF", "LF"),
    playoffTemplate("LR1A", a[1].team.id, b[2].team.id, 1, "Lower", "lower", "Lower Round 1", date, "LR2"),
    playoffTemplate("LR1B", a[2].team.id, b[1].team.id, 1, "Lower", "lower", "Lower Round 1", date, "LR2"),
    playoffTemplate("LR2", "", "", 1, "Lower", "lower", "Lower Round 2", date, "LF"),
    playoffTemplate("LF", "", "", 3, "Lower", "lower", "Lower Final", date, "GF"),
    playoffTemplate("GF", "", "", 3, "Final", "final", "Gran Final", date)
  ];

  return syncPlayoffBracket({ ...data, matches: [...data.matches, ...generated] });
}

function resultTeams(match?: Match): { winner: string; loser: string } | null {
  if (!match || match.status !== "Finalizado" || !match.teamA || !match.teamB || match.scoreA === match.scoreB) return null;
  return match.scoreA > match.scoreB
    ? { winner: match.teamA, loser: match.teamB }
    : { winner: match.teamB, loser: match.teamA };
}

function withParticipant(match: Match, side: "A" | "B", teamId: string): Match {
  const key = side === "A" ? "teamA" : "teamB";
  if (match[key] === teamId) return match;
  return {
    ...match,
    [key]: teamId,
    scoreA: 0,
    scoreB: 0,
    status: "Programado"
  };
}

export function syncPlayoffBracket(data: TournamentData): TournamentData {
  if (!hasPlayoffs(data)) return data;
  let matches = [...data.matches];
  const bySlot = (slot: PlayoffSlot) => matches.find((match) => match.playoffSlot === slot);
  const replace = (updated: Match) => { matches = matches.map((match) => match.id === updated.id ? updated : match); };

  const lr1a = resultTeams(bySlot("LR1A"));
  const lr1b = resultTeams(bySlot("LR1B"));
  let lr2 = bySlot("LR2");
  if (lr2) {
    lr2 = withParticipant(lr2, "A", lr1a?.winner ?? "");
    lr2 = withParticipant(lr2, "B", lr1b?.winner ?? "");
    replace(lr2);
  }

  const upper = resultTeams(bySlot("UF"));
  const lower2 = resultTeams(bySlot("LR2"));
  let lowerFinal = bySlot("LF");
  if (lowerFinal) {
    lowerFinal = withParticipant(lowerFinal, "A", lower2?.winner ?? "");
    lowerFinal = withParticipant(lowerFinal, "B", upper?.loser ?? "");
    replace(lowerFinal);
  }

  const lowerFinalResult = resultTeams(bySlot("LF"));
  let grandFinal = bySlot("GF");
  if (grandFinal) {
    grandFinal = withParticipant(grandFinal, "A", upper?.winner ?? "");
    grandFinal = withParticipant(grandFinal, "B", lowerFinalResult?.winner ?? "");
    replace(grandFinal);
  }

  return { ...data, matches };
}

export function matchDateTime(match: Match): Date {
  return new Date(`${match.date}T${match.time}:00`);
}

export function nextMatch(data: TournamentData): Match | undefined {
  return [...data.matches]
    .filter((match) => match.status !== "Finalizado" && match.teamA && match.teamB && match.time !== "00:00")
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
