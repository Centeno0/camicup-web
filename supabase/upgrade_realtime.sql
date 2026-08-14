-- CamiCup: columnas adicionales que usa la administración final.
-- Ejecutar UNA VEZ en Supabase > SQL Editor.

alter table public.teams
  add column if not exists accent text;

alter table public.matches
  add column if not exists stream_url text;

alter table public.tournament_config
  add column if not exists edition text default 'Primera edición',
  add column if not exists subtitle text default 'Primera edición oficial de CamiCup',
  add column if not exists team_count integer default 6,
  add column if not exists pause_count integer default 2,
  add column if not exists pause_minutes integer default 10,
  add column if not exists lobby_tolerance integer default 15,
  add column if not exists registration_open boolean default true,
  add column if not exists rules jsonb default '[]'::jsonb;

update public.teams set accent = case id
  when 'ositos' then '#ff4da6'
  when 'gatitos' then '#53d8fb'
  when 'aleroif' then '#6fe7b7'
  when 'monopolio' then '#b66cff'
  when 'shiro' then '#ffbd59'
  when 'luz' then '#f36b6b'
  else coalesce(accent, '#ff4da6')
end
where accent is null;

update public.tournament_config
set edition = coalesce(edition, 'Primera edición'),
    subtitle = coalesce(subtitle, 'Primera edición oficial de CamiCup'),
    team_count = coalesce(team_count, 6),
    pause_count = coalesce(pause_count, 2),
    pause_minutes = coalesce(pause_minutes, 10),
    lobby_tolerance = coalesce(lobby_tolerance, 15),
    registration_open = coalesce(registration_open, true),
    rules = case
      when rules is null or rules = '[]'::jsonb then '[
        "La fase de grupos se juega con los seis equipos divididos en Grupo A y Grupo B.",
        "Grupo A: Ositos Barberos, Escuadron de Gatitos y TEAM ALEROIF.",
        "Grupo B: Monopolio de las Bellezas, TEAM SHIRO y LUZ +4.",
        "Cada victoria en la fase de grupos otorga 1 punto.",
        "Los resultados de cada serie se registran desde el panel y actualizan automáticamente la tabla.",
        "Upper Bracket: series BO3. Lower Bracket: series BO1.",
        "Cada equipo dispone de dos pausas de hasta diez minutos durante la serie.",
        "La tolerancia máxima para ingresar a la sala de espera es de quince minutos."
      ]'::jsonb
      else rules
    end
where id = 1;
