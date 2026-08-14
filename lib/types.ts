export type Player = {
  id: string;
  name: string;
  position: "HC" | "MID" | "OFF" | "Support 4" | "Support 5";
  mmr: number;
  dotaId: string;
  captain?: boolean;
};

export type TeamGroup = "A" | "B";

export type Team = {
  id: string;
  name: string;
  captain: string;
  shortName: string;
  accent: string;
  group: TeamGroup;
  players: Player[];
  logo?: string;
};

export type MatchStatus = "Programado" | "En vivo" | "Finalizado";
export type MatchStage = "Todos contra todos" | "Upper" | "Lower" | "Final";

export type Match = {
  id: string;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  bestOf: 1 | 3 | 5;
  stage: MatchStage;
  status: MatchStatus;
  scoreA: number;
  scoreB: number;
  streamUrl?: string;
};

export type TournamentConfig = {
  name: string;
  edition: string;
  subtitle: string;
  teamCount: 4 | 6;
  prizeFirst: number;
  prizeSecond: number;
  startDate: string;
  finalDate: string;
  winPoints: number;
  pauseCount: number;
  pauseMinutes: number;
  lobbyTolerance: number;
  registrationOpen: boolean;
  kickChannel: string;
};

export type TournamentData = {
  config: TournamentConfig;
  teams: Team[];
  matches: Match[];
  rules: string[];
};

export type Standing = {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  mapsWon: number;
  mapsLost: number;
  differential: number;
  points: number;
};
