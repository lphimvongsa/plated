-- Timeline lanes: prep window on parties, named helpers per party, tasks assigned to a helper

-- ---------------------------------------------------------------------------
-- Prep window
-- ---------------------------------------------------------------------------

alter table public.parties
  add column if not exists prep_starts_at timestamptz;

update public.parties
set prep_starts_at = starts_at - interval '14 days'
where prep_starts_at is null;

-- ---------------------------------------------------------------------------
-- Helper lanes
-- ---------------------------------------------------------------------------

create table if not exists public.party_helpers (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  color text not null default 'tomato',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists party_helpers_party_id_idx on public.party_helpers (party_id);
create unique index if not exists party_helpers_party_name_idx
  on public.party_helpers (party_id, lower(name));

alter table public.tasks
  add column if not exists helper_id uuid references public.party_helpers (id) on delete set null;

create index if not exists tasks_helper_id_idx on public.tasks (helper_id);

-- ---------------------------------------------------------------------------
-- Keep tasks.assigned_name and tasks.helper_id in sync
-- ---------------------------------------------------------------------------

create or replace function public.next_helper_color(p_party_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (array['tomato', 'orange', 'olive', 'gold', 'wine', 'blush'])[
    1 + (select count(*) from public.party_helpers where party_id = p_party_id) % 6
  ];
$$;

-- Writers may set either helper_id or the legacy assigned_name; an unknown name
-- opens a new lane so imported or seeded assignments stay visible on the board.
create or replace function public.trg_tasks_resolve_helper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(new.assigned_name), '');
  v_helper_id uuid;
begin
  if new.helper_id is null and v_name is not null then
    select id into v_helper_id
    from public.party_helpers
    where party_id = new.party_id and lower(name) = lower(v_name);

    if v_helper_id is null then
      insert into public.party_helpers (party_id, name, color, sort_order)
      values (
        new.party_id,
        v_name,
        public.next_helper_color(new.party_id),
        coalesce(
          (select max(sort_order) + 1 from public.party_helpers where party_id = new.party_id),
          0
        )
      )
      returning id into v_helper_id;
    end if;

    new.helper_id := v_helper_id;
  end if;

  if new.helper_id is not null then
    select name into new.assigned_name from public.party_helpers where id = new.helper_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_resolve_helper on public.tasks;
create trigger tasks_resolve_helper
  before insert or update on public.tasks
  for each row execute function public.trg_tasks_resolve_helper();

create or replace function public.trg_party_helpers_rename()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.tasks set assigned_name = new.name where helper_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists party_helpers_rename on public.party_helpers;
create trigger party_helpers_rename
  after update on public.party_helpers
  for each row execute function public.trg_party_helpers_rename();

-- ---------------------------------------------------------------------------
-- Owner gets a lane on every new party
-- ---------------------------------------------------------------------------

create or replace function public.trg_parties_add_owner_helper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.party_helpers (party_id, user_id, name, color, sort_order)
  select
    new.id,
    new.owner_id,
    coalesce(nullif(trim(p.name), ''), nullif(split_part(coalesce(p.email, ''), '@', 1), ''), 'Host'),
    'tomato',
    0
  from public.profiles p
  where p.id = new.owner_id
    and not exists (select 1 from public.party_helpers h where h.party_id = new.id);
  return new;
end;
$$;

drop trigger if exists parties_add_owner_helper on public.parties;
create trigger parties_add_owner_helper
  after insert on public.parties
  for each row execute function public.trg_parties_add_owner_helper();

-- ---------------------------------------------------------------------------
-- Backfill existing parties
-- ---------------------------------------------------------------------------

insert into public.party_helpers (party_id, user_id, name, color, sort_order)
select
  p.id,
  p.owner_id,
  coalesce(nullif(trim(pr.name), ''), nullif(split_part(coalesce(pr.email, ''), '@', 1), ''), 'Host'),
  'tomato',
  0
from public.parties p
join public.profiles pr on pr.id = p.owner_id
where not exists (select 1 from public.party_helpers h where h.party_id = p.id);

with named as (
  select party_id, trim(assigned_name) as name, min(sort_order) as first_seen
  from public.tasks
  where nullif(trim(assigned_name), '') is not null
  group by party_id, trim(assigned_name)
),
ranked as (
  select
    party_id,
    name,
    row_number() over (partition by party_id order by first_seen, name) as position
  from named
)
insert into public.party_helpers (party_id, name, color, sort_order)
select
  r.party_id,
  r.name,
  (array['orange', 'olive', 'gold', 'wine', 'blush', 'tomato'])[1 + (r.position - 1) % 6],
  r.position
from ranked r
where not exists (
  select 1 from public.party_helpers h
  where h.party_id = r.party_id and lower(h.name) = lower(r.name)
);

update public.tasks t
set helper_id = h.id
from public.party_helpers h
where t.helper_id is null
  and h.party_id = t.party_id
  and lower(h.name) = lower(trim(t.assigned_name));

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.party_helpers enable row level security;

drop policy if exists "party_helpers_all" on public.party_helpers;
create policy "party_helpers_all" on public.party_helpers
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

grant select, insert, update, delete on public.party_helpers to authenticated;
