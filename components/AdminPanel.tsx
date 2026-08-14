"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTournament } from "./TournamentProvider";
import { Icon } from "./Icon";
import { activeTeams, computeStandings, formatDate } from "@/lib/tournament";
import type { Match, MatchStage, MatchStatus, Team, TournamentData, Player } from "@/lib/types";

type Tab = "general" | "teams" | "matches" | "rules";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>;
}

function newMatch(teams: Team[], date: string): Match {
  return {
    id: `m-${Date.now()}`,
    teamA: teams[0]?.id ?? "",
    teamB: teams[1]?.id ?? "",
    date,
    time: "20:00",
    bestOf: 3,
    stage: "Todos contra todos",
    status: "Programado",
    scoreA: 0,
    scoreB: 0
  };
}

export function AdminPanel() {
  const { data, saveData, resetData, onlineMode, realtime, syncError, authReady, authEmail, signIn, signOut } = useTournament();
  const [draft, setDraft] = useState<TournamentData>(data);
  const [tab, setTab] = useState<Tab>("matches");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(data.matches[0]?.id ?? null);
  const [matchFilter, setMatchFilter] = useState<"Todas" | MatchStatus>("Todas");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const teams = useMemo(() => activeTeams(draft), [draft]);
  const standings = useMemo(() => computeStandings(draft), [draft]);
  const selectedMatch = draft.matches.find((match) => match.id === selectedMatchId) ?? draft.matches[0];
  const filteredMatches = useMemo(() => [...draft.matches]
    .filter((match) => matchFilter === "Todas" || match.status === matchFilter)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [draft.matches, matchFilter]);

  useEffect(() => {
    setDraft(data);
    if (!selectedMatchId && data.matches[0]) setSelectedMatchId(data.matches[0].id);
  }, [data]);

  const updateConfig = (key: keyof TournamentData["config"], value: string | number | boolean) => {
    setDraft((current) => ({ ...current, config: { ...current.config, [key]: value } }));
  };

  const updateTeam = (id: string, key: keyof Team, value: string) => {
    setDraft((current) => ({ ...current, teams: current.teams.map((team) => team.id === id ? { ...team, [key]: value } : team) }));
  };

  const updatePlayer = (teamId: string, playerId: string, key: keyof Player, value: string | number | boolean) => {
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((team) => team.id === teamId
        ? { ...team, players: team.players.map((player) => player.id === playerId ? { ...player, [key]: value } : player) }
        : team)
    }));
  };

  const updateMatch = <K extends keyof Match>(id: string, key: K, value: Match[K]) => {
    setDraft((current) => ({ ...current, matches: current.matches.map((match) => match.id === id ? { ...match, [key]: value } : match) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await saveData(draft);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error ?? "No se pudo guardar.");
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const handleReset = async () => {
    if (!window.confirm("¿Restaurar toda la información inicial de CamiCup?")) return;
    const result = await resetData();
    if (!result.ok) setSaveError(result.error ?? "No se pudo restaurar.");
  };

  const deleteMatch = (id: string) => {
    if (!window.confirm("¿Eliminar esta partida? Esta acción solo debe usarse para encuentros creados por error.")) return;
    setDraft((current) => ({ ...current, matches: current.matches.filter((match) => match.id !== id) }));
    if (selectedMatchId === id) setSelectedMatchId(null);
  };

  const publishImmediate = async (next: TournamentData) => {
    setDraft(next);
    setSaving(true);
    setSaveError(null);
    const result = await saveData(next);
    setSaving(false);
    if (!result.ok) setSaveError(result.error ?? "No se pudo publicar el cambio.");
    else {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    }
  };

  const addMap = async (id: string, side: "A" | "B") => {
    const next: TournamentData = {
      ...draft,
      matches: draft.matches.map((match) => match.id === id
        ? { ...match, status: "En vivo", scoreA: side === "A" ? match.scoreA + 1 : match.scoreA, scoreB: side === "B" ? match.scoreB + 1 : match.scoreB }
        : match)
    };
    await publishImmediate(next);
  };

  const finishMatch = async (id: string, winner: "A" | "B", loserScore = 0) => {
    const next: TournamentData = {
      ...draft,
      matches: draft.matches.map((match) => {
        if (match.id !== id) return match;
        const winsNeeded = Math.ceil(match.bestOf / 2);
        const safeLoser = Math.min(loserScore, winsNeeded - 1);
        return winner === "A"
          ? { ...match, scoreA: winsNeeded, scoreB: safeLoser, status: "Finalizado" }
          : { ...match, scoreA: safeLoser, scoreB: winsNeeded, status: "Finalizado" };
      })
    };
    await publishImmediate(next);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    const result = await signIn(loginEmail.trim(), loginPassword);
    if (!result.ok) setLoginError(result.error ?? "No se pudo iniciar sesión.");
  };

  if (onlineMode && !authReady) {
    return <main className="admin-login-page"><div className="admin-login-card"><img src="/logo-camicup.webp" alt="CamiCup"/><h1>Cargando administración…</h1></div></main>;
  }

  if (onlineMode && !authEmail) {
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <img src="/logo-camicup.webp" alt="CamiCup"/>
          <span>ADMINISTRACIÓN</span>
          <h1>Ingresar a CamiCup</h1>
          <p>Usa el usuario que creaste en Supabase Authentication.</p>
          <Field label="Correo"><input type="email" required value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)}/></Field>
          <Field label="Contraseña"><input type="password" required value={loginPassword} onChange={(e)=>setLoginPassword(e.target.value)}/></Field>
          {loginError ? <div className="admin-error-banner">{loginError}</div> : null}
          <button className="primary-button" type="submit">Iniciar sesión</button>
          <Link href="/">Volver a la página pública</Link>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand"><img src="/logo-camicup.webp" alt="CamiCup" width={70} height={70}/><div><strong>CamiCup</strong><span>Panel de torneo</span></div></div>
        <nav>
          <button className={tab === "general" ? "active" : ""} onClick={() => setTab("general")}><Icon name="settings"/>Dashboard</button>
          <button className={tab === "teams" ? "active" : ""} onClick={() => setTab("teams")}><Icon name="users"/>Equipos</button>
          <button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}><Icon name="swords"/>Partidas</button>
          <button className={tab === "matches" ? "" : ""} onClick={() => setTab("matches")}><Icon name="trophy"/>Posiciones</button>
          <button className={tab === "teams" ? "" : ""} onClick={() => setTab("teams")}><Icon name="users"/>Grupos</button>
          <button className={tab === "teams" ? "" : ""} onClick={() => setTab("teams")}><Icon name="users"/>Jugadores</button>
          <button className={tab === "general" ? "" : ""} onClick={() => setTab("general")}><Icon name="settings"/>Configuración</button>
          <Link className="admin-publish-link" href="/"><Icon name="live"/>Publicar sitio</Link>
          <Link className="admin-kick-link" href={`https://kick.com/${draft.config.kickChannel}`} target="_blank"><span className="live-dot"/>KICK · {draft.config.kickChannel}</Link>
          {onlineMode ? <button className="admin-logout-link" onClick={()=>void signOut()}>Cerrar sesión</button> : <Link className="admin-logout-link" href="/">Cerrar panel</Link>}
        </nav>
        <div className="admin-sidebar-footer"><Link href="/">← Ver página pública</Link><small>{onlineMode ? (realtime ? "Supabase Realtime conectado." : "Supabase conectado · esperando Realtime.") : "Modo local · configura Supabase para publicar cambios a todos."}</small></div>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div><span>ADMINISTRACIÓN</span><h1>{tab === "general" ? "Configuración del torneo" : tab === "teams" ? "Equipos participantes" : tab === "matches" ? "Partidas y resultados" : "Reglamento"}</h1></div>
          <div className="admin-actions"><button className="ghost-button" onClick={()=>void handleReset()}>Restaurar base</button><button className="primary-button" disabled={saving} onClick={()=>void handleSave()}><Icon name="save"/>{saving ? "Guardando…" : saved ? "Publicado" : "Guardar y publicar"}</button><div className="admin-user"><span>A</span><div><b>{authEmail ?? "Admin local"}</b><small>{onlineMode ? (realtime ? "Realtime activo" : "Online") : "Modo local"}</small></div></div></div>
        </header>
        {(saveError || syncError) ? <div className="admin-error-banner">{saveError || syncError}</div> : null}

        {tab === "general" && (
          <div className="admin-grid two">
            <div className="admin-card">
              <h2>Identidad</h2>
              <Field label="Nombre del torneo"><input value={draft.config.name} onChange={(e) => updateConfig("name", e.target.value)}/></Field>
              <Field label="Edición"><input value={draft.config.edition} onChange={(e) => updateConfig("edition", e.target.value)}/></Field>
              <Field label="Frase principal"><textarea rows={3} value={draft.config.subtitle} onChange={(e) => updateConfig("subtitle", e.target.value)}/></Field>
              <Field label="Cantidad de equipos"><select value={draft.config.teamCount} onChange={(e) => updateConfig("teamCount", Number(e.target.value) as 4 | 6)}><option value={4}>4 equipos</option><option value={6}>6 equipos</option></select></Field>
            </div>
            <div className="admin-card">
              <h2>Premios y fechas</h2>
              <div className="field-row"><Field label="Primer lugar (S/)"><input type="number" value={draft.config.prizeFirst} onChange={(e) => updateConfig("prizeFirst", Number(e.target.value))}/></Field><Field label="Segundo lugar (S/)"><input type="number" value={draft.config.prizeSecond} onChange={(e) => updateConfig("prizeSecond", Number(e.target.value))}/></Field></div>
              <div className="field-row"><Field label="Fecha de inicio"><input type="date" value={draft.config.startDate} onChange={(e) => updateConfig("startDate", e.target.value)}/></Field><Field label="Gran final"><input type="date" value={draft.config.finalDate} onChange={(e) => updateConfig("finalDate", e.target.value)}/></Field></div>
              <Field label="Puntos por victoria"><input type="number" value={draft.config.winPoints} onChange={(e) => updateConfig("winPoints", Number(e.target.value))}/></Field><Field label="Canal KICK"><input value={draft.config.kickChannel} onChange={(e) => updateConfig("kickChannel", e.target.value.replace(/^@/, ""))}/></Field>
            </div>
            <div className="admin-card full">
              <h2>Reglas rápidas</h2>
              <div className="field-row three"><Field label="Pausas por equipo"><input type="number" value={draft.config.pauseCount} onChange={(e) => updateConfig("pauseCount", Number(e.target.value))}/></Field><Field label="Minutos por pausa"><input type="number" value={draft.config.pauseMinutes} onChange={(e) => updateConfig("pauseMinutes", Number(e.target.value))}/></Field><Field label="Tolerancia de sala"><input type="number" value={draft.config.lobbyTolerance} onChange={(e) => updateConfig("lobbyTolerance", Number(e.target.value))}/></Field></div>
            </div>
          </div>
        )}

        {tab === "teams" && (
          <div className="admin-grid two">
            {draft.teams.slice(0, draft.config.teamCount).map((team, index) => (
              <div className="admin-card team-editor" key={team.id}>
                <div className="editor-title"><div className="team-color-preview" style={{ background: team.accent }}/><div><small>EQUIPO {index + 1} · GRUPO {team.group}</small><h2>{team.name}</h2></div></div>
                <div className="field-row three"><Field label="Nombre del equipo"><input value={team.name} onChange={(e) => updateTeam(team.id, "name", e.target.value)}/></Field><Field label="Capitana"><input value={team.captain} onChange={(e) => updateTeam(team.id, "captain", e.target.value)}/></Field><Field label="Grupo"><select value={team.group} onChange={(e) => updateTeam(team.id, "group", e.target.value)}><option value="A">Grupo A</option><option value="B">Grupo B</option></select></Field></div>
                <div className="field-row"><Field label="Abreviación"><input maxLength={3} value={team.shortName} onChange={(e) => updateTeam(team.id, "shortName", e.target.value.toUpperCase())}/></Field><Field label="Color del equipo"><input type="color" value={team.accent} onChange={(e) => updateTeam(team.id, "accent", e.target.value)}/></Field></div>
                <h3 className="roster-editor-title">Roster · 5 jugadoras/es</h3>
                <div className="roster-editor-list">
                  {team.players.map((player) => (
                    <div className="roster-editor-row" key={player.id}>
                      <Field label="Posición"><select value={player.position} onChange={(e) => updatePlayer(team.id, player.id, "position", e.target.value)}><option>HC</option><option>MID</option><option>OFF</option><option>Support 4</option><option>Support 5</option></select></Field>
                      <Field label="Jugador"><input value={player.name} onChange={(e) => updatePlayer(team.id, player.id, "name", e.target.value)}/></Field>
                      <Field label="MMR"><input type="number" step="0.1" value={player.mmr} onChange={(e) => updatePlayer(team.id, player.id, "mmr", Number(e.target.value))}/></Field>
                      <Field label="Dota ID"><input value={player.dotaId} onChange={(e) => updatePlayer(team.id, player.id, "dotaId", e.target.value)}/></Field>
                      <label className="captain-check"><input type="checkbox" checked={!!player.captain} onChange={(e) => updatePlayer(team.id, player.id, "captain", e.target.checked)}/> Cap.</label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "matches" && (
          <div className="admin-matches-layout">
            <div className="admin-card full match-table-card">
              <div className="admin-card-heading"><div><h2>Administrar partidas</h2><p>Crea, edita y gestiona todas las partidas del torneo.</p></div><button className="primary-button" onClick={() => { const m = newMatch(teams, draft.config.startDate); setDraft((current) => ({ ...current, matches: [...current.matches, m] })); setSelectedMatchId(m.id); }}><Icon name="plus"/>Nueva partida</button></div>
              <div className="match-filter-row">{(["Todas","Programado","En vivo","Finalizado"] as const).map((filter)=><button key={filter} className={`filter-pill ${matchFilter===filter?"active":""}`} onClick={()=>setMatchFilter(filter)}>{filter === "Programado" ? "Programadas" : filter === "Finalizado" ? "Finalizadas" : filter}</button>)}</div>
              <div className="admin-table-wrap"><table className="admin-match-table"><thead><tr><th>FECHA</th><th>HORA</th><th>EQUIPO A</th><th>VS</th><th>EQUIPO B</th><th>FORMATO</th><th>ESTADO</th><th>RESULTADO</th><th></th></tr></thead><tbody>
                {filteredMatches.map((match) => { const a=teams.find(t=>t.id===match.teamA); const b=teams.find(t=>t.id===match.teamB); return <tr key={match.id} className={selectedMatch?.id===match.id?"selected": ""} onClick={()=>setSelectedMatchId(match.id)}><td>{formatDate(match.date)}</td><td>{match.time}</td><td><b>{a?.name ?? "—"}</b></td><td>VS</td><td><b>{b?.name ?? "—"}</b></td><td>BO{match.bestOf}</td><td><span className={`admin-status ${match.status === "En vivo" ? "live" : match.status === "Finalizado" ? "done" : "scheduled"}`}>{match.status}</span></td><td>{match.status === "Finalizado" || match.status === "En vivo" ? `${match.scoreA} - ${match.scoreB}` : "—"}</td><td><div className="table-actions"><button className="table-edit" onClick={(e)=>{e.stopPropagation();setSelectedMatchId(match.id)}}><Icon name="edit"/></button><button className="table-edit danger" onClick={(e)=>{e.stopPropagation();deleteMatch(match.id)}}><Icon name="trash"/></button></div></td></tr> })}
              </tbody></table></div>
            </div>

            <div className="admin-match-bottom">
              <div className="admin-card match-edit-focus">
                {selectedMatch ? <>
                  <div className="admin-card-heading"><div><h2>Editar partida</h2><p>{teams.find(t=>t.id===selectedMatch.teamA)?.name} vs {teams.find(t=>t.id===selectedMatch.teamB)?.name}</p></div><button className="icon-button" onClick={()=>setSelectedMatchId(null)}>×</button></div>
                  <div className="field-row"><Field label="Equipo A"><select value={selectedMatch.teamA} onChange={(e) => updateMatch(selectedMatch.id, "teamA", e.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field><Field label="Equipo B"><select value={selectedMatch.teamB} onChange={(e) => updateMatch(selectedMatch.id, "teamB", e.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field></div>
                  <div className="field-row three"><Field label="Fecha"><input type="date" value={selectedMatch.date} onChange={(e) => updateMatch(selectedMatch.id, "date", e.target.value)}/></Field><Field label="Hora"><input type="time" value={selectedMatch.time} onChange={(e) => updateMatch(selectedMatch.id, "time", e.target.value)}/></Field><Field label="Formato"><select value={selectedMatch.bestOf} onChange={(e) => updateMatch(selectedMatch.id, "bestOf", Number(e.target.value) as 1 | 3 | 5)}><option value={1}>BO1</option><option value={3}>BO3</option><option value={5}>BO5</option></select></Field></div>
                  <div className="result-label">Resultado {selectedMatch.status === "En vivo" ? "(en vivo)" : selectedMatch.status === "Finalizado" ? "(finalizado)" : "(no aplica)"}</div>
                  <div className="score-editor"><input type="number" min={0} value={selectedMatch.scoreA} onChange={(e)=>updateMatch(selectedMatch.id,"scoreA",Number(e.target.value))}/><span>VS</span><input type="number" min={0} value={selectedMatch.scoreB} onChange={(e)=>updateMatch(selectedMatch.id,"scoreB",Number(e.target.value))}/></div>
                  <div className="live-score-actions"><button onClick={()=>void addMap(selectedMatch.id,"A")}>+ mapa {teams.find(t=>t.id===selectedMatch.teamA)?.shortName ?? "A"}</button><button onClick={()=>void addMap(selectedMatch.id,"B")}>+ mapa {teams.find(t=>t.id===selectedMatch.teamB)?.shortName ?? "B"}</button></div>
                  <div className="quick-result-grid"><button onClick={()=>void finishMatch(selectedMatch.id,"A",0)}>Finalizar: gana A</button><button onClick={()=>void finishMatch(selectedMatch.id,"A",1)} disabled={selectedMatch.bestOf===1}>Gana A ajustado</button><button onClick={()=>void finishMatch(selectedMatch.id,"B",1)} disabled={selectedMatch.bestOf===1}>Gana B ajustado</button><button onClick={()=>void finishMatch(selectedMatch.id,"B",0)}>Finalizar: gana B</button></div>
                  <div className="field-row"><Field label="Estado"><select value={selectedMatch.status} onChange={(e)=>updateMatch(selectedMatch.id,"status",e.target.value as MatchStatus)}><option>Programado</option><option>En vivo</option><option>Finalizado</option></select></Field><Field label="Canal KICK"><input value={selectedMatch.streamUrl || draft.config.kickChannel} onChange={(e)=>updateMatch(selectedMatch.id,"streamUrl",e.target.value)}/></Field></div>
                </> : <div className="empty-state">Selecciona una partida.</div>}
              </div>

              <div className="admin-card standings-focus"><div className="standings-admin-head"><div><h2>Tabla de puntos</h2><p>1 punto por victoria</p></div><div className="group-tabs"><span className="active">Grupo A</span><span>Grupo B</span></div></div><div className="admin-table-wrap"><table><thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>PG</th><th>PP</th><th>MAPAS</th><th>PTS</th></tr></thead><tbody>{standings.filter(s=>s.team.group==="A").map((s,i)=><tr key={s.team.id}><td>{i+1}</td><td><b>{s.team.name}</b></td><td>{s.played}</td><td>{s.wins}</td><td>{s.losses}</td><td>{s.mapsWon}-{s.mapsLost}</td><td><strong>{s.points}</strong></td></tr>)}</tbody></table></div></div>
            </div>
          </div>
        )}

        {tab === "rules" && (
          <div className="admin-card full">
            <div className="admin-card-heading"><div><h2>Reglas publicadas</h2><p>Cada línea aparecerá como un punto independiente en la web.</p></div><button className="secondary-button" onClick={() => setDraft((current) => ({ ...current, rules: [...current.rules, "Nueva regla del torneo."] }))}><Icon name="plus"/>Agregar regla</button></div>
            <div className="rules-editor-list">
              {draft.rules.map((rule, index) => (
                <div className="rule-editor" key={index}><span>{String(index + 1).padStart(2, "0")}</span><textarea rows={2} value={rule} onChange={(e) => setDraft((current) => ({ ...current, rules: current.rules.map((item, i) => i === index ? e.target.value : item) }))}/><button className="icon-button danger" onClick={() => setDraft((current) => ({ ...current, rules: current.rules.filter((_, i) => i !== index) }))}><Icon name="trash"/></button></div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
