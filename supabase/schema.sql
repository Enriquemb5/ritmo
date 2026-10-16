-- Ritmo · tablas para sincronizar entre dispositivos.
-- Pega esto en Supabase → SQL Editor → New query → Run.
-- Cada persona solo puede leer y escribir sus propias filas.

create table if not exists public.perfiles (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  cfg jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  date text not null,
  text text not null check (char_length(text) <= 80),
  kind text not null default 'nota',
  time text default '',
  created bigint
);

alter table public.perfiles enable row level security;
alter table public.notas enable row level security;

create policy "perfil propio" on public.perfiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notas propias" on public.notas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
