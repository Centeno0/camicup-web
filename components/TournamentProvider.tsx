"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { defaultTournamentData } from "@/lib/default-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Match, MatchStage, MatchStatus, Player, Team, TeamGroup, TournamentData } from "@/lib/types";

const STORAGE_KEY = "camicup-tournament-data-online-v2";
const TEAM_ORDER = ["ositos", "gatitos", "aleroif", "monopolio", "shiro", "luz"];

type ActionResult = { ok: boolean; error?: string };

type TournamentContextValue = {
  data: TournamentData;
  setData: React.Dispatch<React.SetStateAction<TournamentData>>;
  saveData: (next: TournamentData) => Promise<ActionResult>;
  resetData: () => Promise<ActionResult>;
  ready: boolean;
  realtime: boolean;
  onlineMode: boolean;
  syncError: string | null;
  authReady: boolean;
  authEmail: string | null;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
};

const TournamentContext = createContext<TournamentContextValue | null>(null);

function validGroup(value: unknown): TeamGroup {
  return value === "B" ? "B" : "A";
}

function validPosition(value: unknown): Player["position"] {
  if (value === "MID" || value === "OFF" || value === "Support 4" || value === "Support 5") return value;
  return "HC";
}

function validStatus(value: unknown): MatchStatus {
  if (value === "En vivo" || value === "Finalizado") return value;
  return "Programado";
}

function validStage(value: unknown): MatchStage {
  if (value === "Upper" || value === "Lower" || value === "Final") return value;
  return "Todos contra todos";
}

function validBestOf(value: unknown): 1 | 3 | 5 {
  const n = Number(value);
  if (n === 1 || n === 5) return n;
  return 3;
}

function timeHHMM(value: unknown): string {
  const text = String(value ?? "20:00");
  return text.length >= 5 ? text.slice(0, 5) : text;
}

function sortTeams(teams: Team[]) {
  const order = new Map(TEAM_ORDER.map((id, index) => [id, index]));
  return [...teams].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

async function fetchTournamentData(): Promise<TournamentData> {
  const client = getSupabaseClient();
  if (!client) return defaultTournamentData;

  const [teamsRes, playersRes, matchesRes, configRes] = await Promise.all([
    client.from("teams").select("*").order("id"),
    client.from("players").select("*").order("id"),
    client.from("matches").select("*").order("match_date").order("match_time"),
    client.from("tournament_config").select("*").eq("id", 1).maybeSingle(),
  ]);

  const errors = [teamsRes.error, playersRes.error, matchesRes.error, configRes.error].filter(Boolean);
  if (errors.length) throw new Error(errors.map((error) => error?.message).join(" · "));

  const fallbackById = new Map(defaultTournamentData.teams.map((team) => [team.id, team]));
  const playersByTeam = new Map<string, Player[]>();

  for (const row of playersRes.data ?? []) {
    const teamId = String(row.team_id ?? "");
    if (!teamId) continue;
    const item: Player = {
      id: String(row.id),
      name: String(row.nickname ?? "Jugador"),
      position: validPosition(row.role),
      mmr: Number(row.mmr ?? 0),
      dotaId: String(row.dota_id ?? ""),
      captain: Boolean(row.is_captain),
    };
    const current = playersByTeam.get(teamId) ?? [];
    current.push(item);
    playersByTeam.set(teamId, current);
  }

  const dbTeams = (teamsRes.data ?? []).map((row): Team => {
    const id = String(row.id);
    const fallback = fallbackById.get(id) ?? defaultTournamentData.teams[0];
    const dbPlayers = playersByTeam.get(id) ?? [];
    return {
      id,
      name: String(row.name ?? fallback.name),
      captain: String(row.captain ?? fallback.captain),
      shortName: String(row.short_name ?? fallback.shortName),
      accent: String(row.accent ?? fallback.accent),
      group: validGroup(row.group_name),
      players: dbPlayers.length ? dbPlayers : fallback.players,
      logo: String(row.logo ?? fallback.logo ?? ""),
    };
  });

  const teams = sortTeams(dbTeams.length ? dbTeams : defaultTournamentData.teams);

  const matches: Match[] = (matchesRes.data ?? []).map((row) => ({
    id: String(row.id),
    teamA: String(row.team_a ?? ""),
    teamB: String(row.team_b ?? ""),
    date: String(row.match_date ?? ""),
    time: timeHHMM(row.match_time),
    bestOf: validBestOf(row.best_of),
    stage: validStage(row.stage),
    status: validStatus(row.status),
    scoreA: Number(row.score_a ?? 0),
    scoreB: Number(row.score_b ?? 0),
    streamUrl: row.stream_url ? String(row.stream_url) : undefined,
  }));

  const cfg: any = configRes.data ?? {};
  const activeCount = teams.filter((team) => team).length >= 6 ? 6 : 4;
  const rules = Array.isArray(cfg.rules) && cfg.rules.length
    ? cfg.rules.map((item: unknown) => String(item))
    : defaultTournamentData.rules;

  return {
    config: {
      ...defaultTournamentData.config,
      name: String(cfg.tournament_name ?? defaultTournamentData.config.name),
      edition: String(cfg.edition ?? defaultTournamentData.config.edition),
      subtitle: String(cfg.subtitle ?? defaultTournamentData.config.subtitle),
      teamCount: Number(cfg.team_count ?? activeCount) === 4 ? 4 : 6,
      prizeFirst: Number(cfg.prize_first ?? 700),
      prizeSecond: Number(cfg.prize_second ?? 150),
      startDate: String(cfg.start_date ?? "2026-08-13"),
      finalDate: String(cfg.final_date ?? "2026-08-16"),
      winPoints: Number(cfg.points_per_win ?? 1),
      pauseCount: Number(cfg.pause_count ?? 2),
      pauseMinutes: Number(cfg.pause_minutes ?? 10),
      lobbyTolerance: Number(cfg.lobby_tolerance ?? 15),
      registrationOpen: cfg.registration_open ?? true,
      kickChannel: String(cfg.kick_channel ?? "fortuna2121"),
    },
    teams,
    matches,
    rules,
  };
}

async function persistTournamentData(next: TournamentData): Promise<TournamentData> {
  const client = getSupabaseClient();
  if (!client) return next;

  const configPayload = {
    id: 1,
    tournament_name: next.config.name,
    edition: next.config.edition,
    subtitle: next.config.subtitle,
    team_count: next.config.teamCount,
    start_date: next.config.startDate,
    final_date: next.config.finalDate,
    prize_first: next.config.prizeFirst,
    prize_second: next.config.prizeSecond,
    kick_channel: next.config.kickChannel,
    points_per_win: next.config.winPoints,
    pause_count: next.config.pauseCount,
    pause_minutes: next.config.pauseMinutes,
    lobby_tolerance: next.config.lobbyTolerance,
    registration_open: next.config.registrationOpen,
    rules: next.rules,
  };

  const teamPayload = next.teams.map((team) => ({
    id: team.id,
    name: team.name,
    short_name: team.shortName,
    group_name: team.group,
    captain: team.captain,
    logo: team.logo ?? `/teams/${team.id}.webp`,
    mmr_total: team.players.reduce((sum, player) => sum + Number(player.mmr || 0), 0),
    active: true,
    accent: team.accent,
  }));

  const configWrite = await client.from("tournament_config").upsert(configPayload, { onConflict: "id" });
  if (configWrite.error) throw configWrite.error;

  const teamWrite = await client.from("teams").upsert(teamPayload, { onConflict: "id" });
  if (teamWrite.error) throw teamWrite.error;

  // Roster pequeño: reemplazo completo para mantener exactamente lo que se edita en /admin.
  const deletePlayers = await client.from("players").delete().gte("id", 0);
  if (deletePlayers.error) throw deletePlayers.error;

  const playerPayload = next.teams.flatMap((team) => team.players.map((player) => ({
    team_id: team.id,
    nickname: player.name,
    role: player.position,
    mmr: Number(player.mmr || 0),
    dota_id: player.dotaId,
    is_captain: Boolean(player.captain),
  })));

  if (playerPayload.length) {
    const playersWrite = await client.from("players").insert(playerPayload);
    if (playersWrite.error) throw playersWrite.error;
  }

  const existing = await client.from("matches").select("id");
  if (existing.error) throw existing.error;
  const existingIds = (existing.data ?? []).map((row) => Number(row.id)).filter(Number.isFinite);
  const numericMatches = next.matches.filter((match) => /^\d+$/.test(match.id));
  const keepIds = new Set(numericMatches.map((match) => Number(match.id)));
  const staleIds = existingIds.filter((id) => !keepIds.has(id));

  if (staleIds.length) {
    const staleDelete = await client.from("matches").delete().in("id", staleIds);
    if (staleDelete.error) throw staleDelete.error;
  }

  const mapMatch = (match: Match) => ({
    team_a: match.teamA,
    team_b: match.teamB,
    match_date: match.date,
    match_time: match.time,
    score_a: Number(match.scoreA || 0),
    score_b: Number(match.scoreB || 0),
    best_of: match.bestOf,
    stage: match.stage,
    status: match.status,
    group_name: next.teams.find((team) => team.id === match.teamA)?.group ?? null,
    stream_url: match.streamUrl ?? null,
  });

  if (numericMatches.length) {
    const existingPayload = numericMatches.map((match) => ({ id: Number(match.id), ...mapMatch(match) }));
    const updateMatches = await client.from("matches").upsert(existingPayload, { onConflict: "id" });
    if (updateMatches.error) throw updateMatches.error;
  }

  const newMatches = next.matches.filter((match) => !/^\d+$/.test(match.id));
  if (newMatches.length) {
    const insertMatches = await client.from("matches").insert(newMatches.map(mapMatch));
    if (insertMatches.error) throw insertMatches.error;
  }

  return fetchTournamentData();
}

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TournamentData>(defaultTournamentData);
  const [ready, setReady] = useState(false);
  const [realtime, setRealtime] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      const fresh = await fetchTournamentData();
      setData(fresh);
      setSyncError(null);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "No se pudo leer Supabase.");
    }
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();

    if (!client) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setData(JSON.parse(saved) as TournamentData);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setReady(true);
      setAuthReady(true);
      return;
    }

    let active = true;
    void reload().finally(() => active && setReady(true));

    void client.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      setAuthEmail(sessionData.session?.user.email ?? null);
      setAuthReady(true);
    });

    const authSubscription = client.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user.email ?? null);
      setAuthReady(true);
    });

    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => void reload(), 180);
    };

    const channel = client
      .channel("camicup-live-db")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_config" }, scheduleReload)
      .subscribe((status) => setRealtime(status === "SUBSCRIBED"));

    return () => {
      active = false;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      authSubscription.data.subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [reload]);

  useEffect(() => {
    if (!ready || isSupabaseConfigured) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const saveData = useCallback(async (next: TournamentData): Promise<ActionResult> => {
    const client = getSupabaseClient();
    if (!client) {
      setData(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { ok: true };
    }

    try {
      const fresh = await persistTournamentData(next);
      setData(fresh);
      setSyncError(null);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar en Supabase.";
      setSyncError(message);
      return { ok: false, error: message };
    }
  }, []);

  const resetData = useCallback(async (): Promise<ActionResult> => saveData(defaultTournamentData), [saveData]);

  const signIn = useCallback(async (email: string, password: string): Promise<ActionResult> => {
    const client = getSupabaseClient();
    if (!client) return { ok: true };
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    setAuthEmail(null);
  }, []);

  const value = useMemo(
    () => ({ data, setData, saveData, resetData, ready, realtime, onlineMode: isSupabaseConfigured, syncError, authReady, authEmail, signIn, signOut }),
    [data, ready, realtime, syncError, authReady, authEmail, saveData, resetData, signIn, signOut]
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) throw new Error("useTournament debe usarse dentro de TournamentProvider");
  return context;
}
