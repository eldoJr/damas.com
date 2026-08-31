-- ============================================================
-- damas.com — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  email         text not null unique,
  password_hash text not null,
  elo           integer not null default 1200,
  wins          integer not null default 0,
  losses        integer not null default 0,
  draws         integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Rooms ────────────────────────────────────────────────────
create table if not exists public.rooms (
  id           text primary key,
  host_id      uuid references public.users(id) on delete set null,
  time_control text not null default '5+0',
  status       text not null default 'waiting'
               check (status in ('waiting','playing','finished')),
  created_at   timestamptz not null default now()
);

-- ── Games ────────────────────────────────────────────────────
create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  room_id      text references public.rooms(id) on delete set null,
  white_id     uuid references public.users(id) on delete set null,
  black_id     uuid references public.users(id) on delete set null,
  winner_id    uuid references public.users(id) on delete set null,
  time_control text,
  moves_count  integer not null default 0,
  draw_reason  text,
  bot_level    text,
  ended_at     timestamptz not null default now()
);

-- Migration: add columns if table already exists
alter table public.games add column if not exists draw_reason text;
alter table public.games add column if not exists bot_level   text;

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists games_white_id_idx on public.games(white_id);
create index if not exists games_black_id_idx on public.games(black_id);
create index if not exists users_elo_idx      on public.users(elo desc);

-- ── RPC: update_player_stats ─────────────────────────────────
create or replace function public.update_player_stats(
  p_user_id uuid,
  p_win     boolean,
  p_loss    boolean,
  p_draw    boolean
) returns void language plpgsql security definer as $$
begin
  update public.users set
    wins   = wins   + case when p_win  then 1 else 0 end,
    losses = losses + case when p_loss then 1 else 0 end,
    draws  = draws  + case when p_draw then 1 else 0 end,
    elo    = elo
           + case when p_win  then  20 else 0 end
           + case when p_loss then -15 else 0 end
           + case when p_draw then   2 else 0 end
  where id = p_user_id;
end;
$$;

-- ── Row Level Security ───────────────────────────────────────
-- RLS is disabled on all tables.
-- All access goes through the backend which uses the service role key.
-- The service role key bypasses RLS entirely — no policies needed.
alter table public.users  disable row level security;
alter table public.rooms  disable row level security;
alter table public.games  disable row level security;
